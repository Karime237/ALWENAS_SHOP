# ALWENAS SHOP — Documentation API

Base : `https://api.alwenasshop.com` · JSON · Session via cookie `alw_sid` (HttpOnly, Secure, SameSite=Lax) · En-tête `X-CSRF-Token` sur toutes les requêtes mutantes.
Tous les montants sont en **centimes FCFA** (entiers). Le POOL est renvoyé en centièmes entiers (`2575` = 25,75 POOL).

Chaque endpoint correspond à une fonction de `src/server/api.ts` (implémentation de référence utilisée par la sandbox).

## Authentification
| Méthode | Route | Corps | Notes |
|---|---|---|---|
| POST | /auth/login | `{ email, password }` | Connexion par mot de passe (PBKDF2-SHA256 salé, 210 000 itérations dans la sandbox ; Argon2id recommandé sur serveur réel). 6 essais/15 min/e-mail, 12/appareil. |
| POST | /auth/request-otp (mode `signup`) | `{ email, mode:"signup", signup:{ first_name, last_name, phone, password, referral_code, accept } }` | `referral_code` obligatoire, doit désigner un membre actif ; vérifié côté serveur avant OTP puis à sa validation. Même e-mail refusé (409). Montant fixé à 1 500 FCFA. OTP 6 chiffres, 5 min, 5 essais. Compte provisoire jusqu'à la confirmation du paiement. |
| POST | /auth/request-otp (mode `reset`) | `{ email, mode:"reset", signup:{ password } }` | Récupération d'ancien compte OTP / mot de passe oublié. |
| POST | /auth/verify-otp | `{ requestId, code }` | Confirme le compte `PENDING_PAYMENT` ou remplace le mot de passe et révoque les sessions existantes. Aucune page privée accessible avant paiement confirmé, sauf `/abonnement`. |
| POST | /auth/resend-otp | `{ requestId }` | Invalide l'ancien code (`REPLACED`), applique le cooldown. |
| POST | /auth/logout | — | Révoque la session. |

## Abonnement vendeur
| GET | /subscription | `{ active, status: NONE\|ACTIVE\|EXEMPT, price, lifetime:true, history }` |
|---|---|---|
| POST | /subscriptions | `{ provider: MTN_MOMO\|ORANGE_MONEY, phone }` → paiement unique de 150000 centimes, finalisation du compte et accès à vie uniquement par webhook PSP vérifié. Paiement supplémentaire refusé. Aucun versement aux parrains. |
Endpoints vendeur protégés (402 `SUBSCRIPTION_REQUIRED`) : `POST /affiliate-links`, `POST /pool/convert`, `POST /withdrawals`.

## Catalogue & panier
| GET | /products?search&category&filter=promo\|popular\|new&sort&page&pageSize | Pagination (max 24). |
|---|---|---|
| GET | /products/:slug | Produit, avis, produits liés. |
| GET | /categories | |
| GET/POST/PATCH/DELETE | /cart | `{ productId, qty }` — **aucun prix accepté** ; le serveur recalcule à partir de `products`. |

## Commandes & paiements
| POST | /orders | `{ customer, provider, promo, fulfillment:"HOME"\|"STORE" }` → recalcul complet, livraison gratuite en retrait boutique, réservation stock, attribution (dernier clic ≤ 30 j), statut `PAYMENT_PENDING`. |
|---|---|---|
| GET | /orders, /orders/:id | Invité : accès via `guest_key`. |
| POST | /payments/create | Initie la demande MoMo/Orange/carte auprès du PSP. |
| POST | /payments/webhook | Signature `X-Signature: HMAC-SHA256(PAYMENT_SECRET, rawBody)` vérifiée en temps constant ; idempotence par `event_id` ; contrôle du montant. SUCCESS ⇒ `PAID` + commission `PENDING`. FAILED ⇒ `CANCELLED` + restockage. |
| POST | /sales/:orderId/collect | Vendeur authentifié, uniquement si `HOME` et `READY_FOR_PICKUP`. Statut `OUT_FOR_DELIVERY` ; aucune libération de commission. |
| POST | /orders/:id/request-delivery-otp | Acheteur avec `guest_key`, uniquement `HOME` et `OUT_FOR_DELIVERY`. Code e-mail 6 chiffres, 5 minutes, 5 essais, cooldown 45 s. |
| POST | /orders/:id/confirm-reception | Acheteur avec `guest_key` ET code OTP de réception. Passe à `DELIVERED`, commission libérable après 7 jours. Le vendeur ne peut pas valider seul. |
| POST | /admin/orders/:id/transition | L'admin prépare et marque `READY_FOR_PICKUP` (notification vendeur si `HOME`, client si `STORE`). Seul le retrait `STORE` peut être marqué `DELIVERED` par l'admin. |

## Affiliation, parrainage, commissions
| POST | /affiliate-links | `{ productId, campaign }` → code 6 caractères non devinable. |
|---|---|---|
| GET | /affiliate-links | Statistiques : clics, commandes, montant vendu, commission. |
| GET | /r/:code | Enregistre le clic (dédoublonné 30 min, auto-clic exclu) et le cookie d'attribution. |
| GET | /sales, /commissions | |
| GET | /referrals | Relation parrain/filleul — aucun montant. |

## Portefeuille
| GET | /wallet | `{ pool, poolConvertibleMax, poolValue, fcfa, pending, pendingPool }` |
|---|---|---|
| GET | /wallet/transactions | Ledger append-only. |
| GET | /pool/ranking | Top 10 basé sur les commissions libérées sur 30 jours ; niveau personnel basé sur les POOL cumulés depuis la création du compte. Seuils STARTER 0–99, SELLER 100–299, ARCHIEVER 300–899, PERMOMER 900–1 000, ELITE 1 001+. Aucun bonus monétaire. |
| POST | /pool/convert | `{ pool, idempotencyKey }` — transaction atomique : débit commission disponible (pool × 550), crédit FCFA. |
| POST | /withdrawals | `{ amount, network, phone, holder, idempotencyKey }` — min 1 000, max 500 000 FCFA, frais 1 % (min 100), 3/24 h, réservation atomique. |
| GET | /withdrawals | Numéros masqués. |

## Notifications & profil
`GET /notifications` · `PATCH /notifications/:id/read` · `GET /profile` · `PATCH /profile` (e-mail non modifiable sans double vérification).

## Administration (2FA obligatoire, RBAC)
| Route | Rôles |
|---|---|
| GET /admin/statistics | tous rôles admin |
| GET /admin/users · PATCH /admin/users/:id/status | SUPPORT |
| GET /admin/orders · POST /admin/orders/:id/transition | ORDER_MANAGER (REFUNDED : FINANCE) |
| GET /admin/commissions | FINANCE |
| GET /admin/withdrawals · POST /admin/withdrawals/:id/{process,cancel} | FINANCE |
| GET/PATCH /admin/products | PRODUCT_MANAGER |
| GET /admin/audit-logs · /admin/fraud-events | SUPPORT, FINANCE |
SUPER_ADMIN possède toutes les permissions. Chaque action sensible écrit dans `audit_logs`.

## Codes d'erreur
`INVALID_EMAIL`, `INVALID_AMOUNT`, `RATE_LIMITED` (429), `COOLDOWN`, `WRONG_CODE`, `EXPIRED`, `LOCKED`, `UNAUTHENTICATED` (401), `SUSPENDED` (403), `FORBIDDEN`, `STEP_UP_REQUIRED`, `VALIDATION`, `OUT_OF_STOCK`, `INSUFFICIENT_FUNDS`, `DUPLICATE` (409), `BAD_SIGNATURE`, `INVALID_STATE`.
