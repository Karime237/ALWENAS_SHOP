-- ALWENAS SHOP — Schéma PostgreSQL de production
-- Montants FCFA : BIGINT en centimes (1 FCFA = 100) → 14 162,50 FCFA = 1416250
-- POOL : NUMERIC(18,2) — jamais de FLOAT. 1 POOL = 550 FCFA.

CREATE TYPE user_status AS ENUM ('PENDING_PAYMENT','ACTIVE','SUSPENDED');
CREATE TYPE order_status AS ENUM ('PENDING','PAYMENT_PENDING','PAID','PROCESSING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','SHIPPED','DELIVERED','CANCELLED','REFUNDED');
CREATE TYPE payment_status AS ENUM ('PENDING','SUCCESS','FAILED','REFUNDED');
CREATE TYPE commission_status AS ENUM ('PENDING','AVAILABLE','CANCELLED');
CREATE TYPE withdrawal_status AS ENUM ('PENDING','PROCESSING','SUCCESS','FAILED','CANCELLED');
CREATE TYPE ledger_type AS ENUM ('SALE_COMMISSION','COMMISSION_RELEASE','COMMISSION_CANCEL','POOL_CONVERSION','WITHDRAWAL','WITHDRAWAL_REVERSAL','REFUND','ADJUSTMENT','BONUS');
CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN','FINANCE','SUPPORT','PRODUCT_MANAGER','ORDER_MANAGER');

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  status user_status NOT NULL DEFAULT 'PENDING_PAYMENT', -- webhook PSP vérifié -> ACTIVE
  referral_code VARCHAR(12) NOT NULL UNIQUE,
  password_hash TEXT,                      -- Argon2id en production (PBKDF2 dans la sandbox)
  password_salt TEXT,
  subscription_lifetime BOOLEAN NOT NULL DEFAULT false, -- modifié uniquement par webhook PSP vérifié
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
CREATE TABLE user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id),
  first_name VARCHAR(50), last_name VARCHAR(50), phone VARCHAR(12)
);
CREATE TABLE otp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL,
  code_hash CHAR(64) NOT NULL,            -- SHA-256(salt:code) ou HMAC avec pepper serveur
  salt CHAR(32) NOT NULL,
  amount_centimes BIGINT NOT NULL CHECK (amount_centimes BETWEEN 0 AND 500000000),
  attempts SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 5,
  status VARCHAR(10) NOT NULL DEFAULT 'PENDING', -- PENDING|USED|EXPIRED|LOCKED|REPLACED
  ip INET, user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ON otp_requests (email, created_at DESC);
CREATE TABLE sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  ip INET, user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
  admin_verified_until TIMESTAMPTZ
);
CREATE TABLE subscriptions (
  id VARCHAR(16) PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id),
  amount_centimes BIGINT NOT NULL CHECK (amount_centimes = 150000),
  provider VARCHAR(20) NOT NULL, phone_encrypted BYTEA,
  payment_id VARCHAR(20) UNIQUE NOT NULL, status payment_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), activated_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX one_successful_subscription_per_user ON subscriptions(user_id) WHERE status = 'SUCCESS';

CREATE TABLE categories (id SERIAL PRIMARY KEY, slug VARCHAR(60) UNIQUE NOT NULL, name VARCHAR(80) NOT NULL);
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL, name VARCHAR(160) NOT NULL, description TEXT,
  category_id INT REFERENCES categories(id),
  price_centimes BIGINT NOT NULL CHECK (price_centimes > 0),
  promo_price_centimes BIGINT CHECK (promo_price_centimes < price_centimes),
  commission_bps INT NOT NULL CHECK (commission_bps BETWEEN 0 AND 3000), -- 1000 = 10 %
  sku VARCHAR(40) UNIQUE NOT NULL, status VARCHAR(10) NOT NULL DEFAULT 'DRAFT',
  weight_g INT, dimensions VARCHAR(60), delivery_days VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE product_images (id BIGSERIAL PRIMARY KEY, product_id BIGINT REFERENCES products(id), url TEXT NOT NULL, position SMALLINT DEFAULT 0);
CREATE TABLE inventory (product_id BIGINT PRIMARY KEY REFERENCES products(id), stock INT NOT NULL CHECK (stock >= 0), reserved INT NOT NULL DEFAULT 0);
CREATE TABLE reviews (id BIGSERIAL PRIMARY KEY, product_id BIGINT REFERENCES products(id), user_id BIGINT REFERENCES users(id), rating SMALLINT CHECK (rating BETWEEN 1 AND 5), body TEXT, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE addresses (id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), region VARCHAR(30), city VARCHAR(60), district VARCHAR(60), line TEXT, notes TEXT);

CREATE TABLE referral_links (
  id BIGSERIAL PRIMARY KEY, code VARCHAR(12) UNIQUE NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id), product_id BIGINT NOT NULL REFERENCES products(id),
  campaign VARCHAR(40), status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, campaign)
);
CREATE TABLE referral_clicks (
  id BIGSERIAL PRIMARY KEY, link_id BIGINT REFERENCES referral_links(id),
  visitor_id CHAR(24) NOT NULL, ip INET, is_self BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL -- +30 jours
);
CREATE INDEX ON referral_clicks (visitor_id, clicked_at DESC);
-- Parrainage = relation entre utilisateurs, AUCUN flux financier
CREATE TABLE referrals (
  id BIGSERIAL PRIMARY KEY, referrer_id BIGINT REFERENCES users(id), referred_id BIGINT UNIQUE REFERENCES users(id),
  status VARCHAR(10) DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','BLOCKED')),
  created_at TIMESTAMPTZ DEFAULT now(), CHECK (referrer_id <> referred_id)
);
-- L'inscription publique exige un code appartenant à un utilisateur ACTIVE ayant payé.
-- Validation serveur à la demande OTP ET à sa confirmation ; un parrain suspendu
-- ou encore PENDING_PAYMENT ne peut pas inviter. Le compte admin préprovisionné
-- permet l'amorçage de la sandbox. Aucune écriture wallet n'est faite pour referrals.

CREATE TABLE orders (
  id VARCHAR(12) PRIMARY KEY,                    -- ALW12345
  user_id BIGINT REFERENCES users(id),           -- NULL = invité
  customer JSONB NOT NULL,
  subtotal_centimes BIGINT NOT NULL, delivery_centimes BIGINT NOT NULL, discount_centimes BIGINT NOT NULL DEFAULT 0,
  total_centimes BIGINT NOT NULL CHECK (total_centimes = subtotal_centimes - discount_centimes + delivery_centimes),
  status order_status NOT NULL DEFAULT 'PENDING',
  fulfillment VARCHAR(5) NOT NULL DEFAULT 'HOME' CHECK (fulfillment IN ('HOME','STORE')),
  seller_collected_at TIMESTAMPTZ, buyer_confirmed_at TIMESTAMPTZ,
  affiliate_user_id BIGINT REFERENCES users(id), referral_link_id BIGINT REFERENCES referral_links(id), referral_click_id BIGINT REFERENCES referral_clicks(id),
  guest_key_hash CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY, order_id VARCHAR(12) REFERENCES orders(id), product_id BIGINT REFERENCES products(id),
  unit_price_centimes BIGINT NOT NULL, qty INT NOT NULL CHECK (qty BETWEEN 1 AND 10),
  line_total_centimes BIGINT NOT NULL, commission_bps INT NOT NULL, commission_centimes BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE payments (
  id VARCHAR(20) PRIMARY KEY, order_id VARCHAR(12) UNIQUE REFERENCES orders(id),
  subscription_id VARCHAR(16) UNIQUE REFERENCES subscriptions(id),
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('ORDER','SUBSCRIPTION')),
  CONSTRAINT one_payment_target CHECK ((kind = 'ORDER' AND order_id IS NOT NULL AND subscription_id IS NULL) OR (kind = 'SUBSCRIPTION' AND subscription_id IS NOT NULL AND order_id IS NULL)),
  provider VARCHAR(20) NOT NULL, amount_centimes BIGINT NOT NULL, status payment_status NOT NULL DEFAULT 'PENDING',
  psp_ref VARCHAR(64) UNIQUE, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE payment_events (
  id BIGSERIAL PRIMARY KEY, event_id VARCHAR(64) UNIQUE NOT NULL,  -- idempotence webhook
  payment_id VARCHAR(20) REFERENCES payments(id), status VARCHAR(20), signature_valid BOOLEAN, raw JSONB, received_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE refunds (id BIGSERIAL PRIMARY KEY, order_id VARCHAR(12) REFERENCES orders(id), amount_centimes BIGINT, reason TEXT, admin_id BIGINT, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE commissions (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), order_id VARCHAR(12) UNIQUE REFERENCES orders(id),
  base_centimes BIGINT NOT NULL, amount_centimes BIGINT NOT NULL CHECK (amount_centimes >= 0),
  status commission_status NOT NULL DEFAULT 'PENDING',
  release_at TIMESTAMPTZ, released_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE wallets (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT UNIQUE NOT NULL REFERENCES users(id),
  pool_balance NUMERIC(18,2) GENERATED ALWAYS AS (ROUND(commission_available_centimes::numeric / 55000, 2)) STORED,
  commission_available_centimes BIGINT NOT NULL DEFAULT 0 CHECK (commission_available_centimes >= 0),
  fcfa_balance_centimes BIGINT NOT NULL DEFAULT 0 CHECK (fcfa_balance_centimes >= 0),
  pending_centimes BIGINT NOT NULL DEFAULT 0 CHECK (pending_centimes >= 0),
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
-- Ledger append-only : aucune mise à jour de montant, seulement du statut
CREATE TABLE wallet_transactions (
  id VARCHAR(20) PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), type ledger_type NOT NULL,
  amount_fcfa_centimes BIGINT NOT NULL, pool_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  bucket VARCHAR(8) NOT NULL, reference VARCHAR(40) NOT NULL, status VARCHAR(10) NOT NULL,
  admin_id BIGINT, reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (type <> 'ADJUSTMENT' OR (admin_id IS NOT NULL AND reason IS NOT NULL))
);
CREATE TABLE pool_balances (user_id BIGINT PRIMARY KEY REFERENCES users(id), snapshot NUMERIC(18,2), at TIMESTAMPTZ DEFAULT now());
CREATE TABLE pool_conversions (id VARCHAR(12) PRIMARY KEY, user_id BIGINT REFERENCES users(id), pool_amount NUMERIC(18,2) NOT NULL CHECK (pool_amount >= 0.01), fcfa_centimes BIGINT NOT NULL, idempotency_key VARCHAR(64) UNIQUE, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE withdrawal_methods (id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), network VARCHAR(8), phone_encrypted BYTEA, phone_last3 CHAR(3), holder VARCHAR(60), created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE withdrawals (
  id VARCHAR(12) PRIMARY KEY, user_id BIGINT REFERENCES users(id),
  amount_centimes BIGINT NOT NULL CHECK (amount_centimes BETWEEN 100000 AND 50000000),
  fee_centimes BIGINT NOT NULL, net_centimes BIGINT NOT NULL, network VARCHAR(8) NOT NULL,
  phone_encrypted BYTEA NOT NULL, holder VARCHAR(60), status withdrawal_status NOT NULL DEFAULT 'PENDING',
  psp_ref VARCHAR(64), failure_reason TEXT, idempotency_key VARCHAR(64) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE notifications (id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), type VARCHAR(16), title TEXT, body TEXT, link TEXT, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE admin_roles (id SERIAL PRIMARY KEY, role admin_role UNIQUE NOT NULL);
CREATE TABLE admin_users (user_id BIGINT REFERENCES users(id), role_id INT REFERENCES admin_roles(id), totp_secret_encrypted BYTEA, PRIMARY KEY (user_id, role_id));
CREATE TABLE audit_logs (id BIGSERIAL PRIMARY KEY, actor_id BIGINT, actor VARCHAR(120), action VARCHAR(60), target VARCHAR(80), details JSONB, ip INET, at TIMESTAMPTZ DEFAULT now());
CREATE TABLE fraud_events (id BIGSERIAL PRIMARY KEY, user_id BIGINT, type VARCHAR(40), severity VARCHAR(8), details JSONB, status VARCHAR(10) DEFAULT 'OPEN', reviewed_by BIGINT, at TIMESTAMPTZ DEFAULT now());

-- Exemple de retrait atomique (anti double-retrait)
-- BEGIN;
--   UPDATE wallets SET fcfa_balance_centimes = fcfa_balance_centimes - $amount
--     WHERE user_id = $uid AND fcfa_balance_centimes >= $amount RETURNING id;   -- 0 ligne ⇒ solde insuffisant
--   INSERT INTO withdrawals (...) VALUES (...);  -- idempotency_key UNIQUE
--   INSERT INTO wallet_transactions (...) VALUES (... 'WITHDRAWAL', -$amount, 'PENDING');
-- COMMIT;
