/**
 * ALWENAS SHOP — Couche "serveur" simulée (sandbox navigateur)
 * ------------------------------------------------------------
 * Ce module reproduit le schéma relationnel PostgreSQL décrit dans
 * docs/schema.sql afin de permettre une démonstration de bout en bout
 * sans infrastructure. En production, ce code vit côté serveur
 * (Node.js/NestJS + PostgreSQL) et le navigateur n'y a JAMAIS accès.
 */
import type { Centimes, PoolCents } from "../lib/money";

export type Role = "SUPER_ADMIN" | "FINANCE" | "SUPPORT" | "PRODUCT_MANAGER" | "ORDER_MANAGER";

export interface User {
  id: number; email: string; status: "PENDING_PAYMENT" | "ACTIVE" | "SUSPENDED";
  created_at: number; updated_at: number; last_login_at: number | null;
  referral_code: string; roles: Role[]; demo_seeded?: boolean;
  password_hash?: string; password_salt?: string;
  subscription_lifetime?: boolean;
  /** Ancien modèle de démonstration ; conservé pour migrer les comptes ayant réellement payé. */
  subscription_expires_at?: number | null;
}
export interface Subscription {
  id: string; user_id: number; amount: Centimes; provider: "MTN_MOMO" | "ORANGE_MONEY"; phone: string;
  status: "PENDING" | "SUCCESS" | "FAILED"; payment_id: string; created_at: number;
  period_start: number | null; period_end: number | null;
}
export interface Profile { user_id: number; first_name: string; last_name: string; phone: string }
export interface OtpRequest {
  id: string; email: string; code_hash: string; salt: string; created_at: number; expires_at: number;
  attempts: number; max_attempts: number; status: "PENDING" | "USED" | "EXPIRED" | "LOCKED" | "REPLACED";
  ip: string; amount: Centimes;
  mode?: "login" | "signup" | "reset" | "delivery";
  order_id?: string;
  signup?: { first_name: string; last_name: string; phone: string; password_hash: string; password_salt: string; referral_code?: string };
}
export interface Session {
  token_hash: string; user_id: number; created_at: number; expires_at: number;
  device: string; revoked: boolean; last_seen: number; ua: string;
}
export interface Category { id: number; slug: string; name: string; emoji: string }
export interface Product {
  id: number; slug: string; name: string; category_id: number; price: Centimes; promo_price: Centimes | null;
  commission_bps: number; stock: number; sku: string; images: string[]; description: string; features: string[];
  status: "ACTIVE" | "DRAFT"; weight_g: number; dimensions: string; delivery_days: string;
  rating: number; reviews_count: number; is_new: boolean; is_popular: boolean; created_at: number;
}
export interface Review { id: number; product_id: number; author: string; city: string; rating: number; text: string; created_at: number }
export interface Cart { id: string; lines: { product_id: number; qty: number }[]; updated_at: number }
export interface OrderItem {
  product_id: number; name: string; slug: string; image: string; unit_price: Centimes; qty: number;
  line_total: Centimes; commission_bps: number; commission: Centimes;
}
export type OrderStatus = "PENDING" | "PAYMENT_PENDING" | "PAID" | "PROCESSING" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
export type Fulfillment = "HOME" | "STORE";
export interface Customer { first_name: string; last_name: string; phone: string; email: string; region: string; city: string; district: string; address: string; notes: string }
export interface Order {
  id: string; user_id: number | null; customer: Customer; items: OrderItem[];
  subtotal: Centimes; delivery: Centimes; discount: Centimes; total: Centimes; status: OrderStatus;
  payment_method: PaymentProvider; payment_id: string; affiliate_user_id: number | null; referral_link_id: number | null;
  commission_total: Centimes; created_at: number; updated_at: number;
  history: { status: OrderStatus; at: number; by: string }[]; guest_key: string; demo?: boolean;
  fulfillment?: Fulfillment;
  seller_collected_at?: number | null;
  buyer_confirmed_at?: number | null;
}
export type PaymentProvider = "MTN_MOMO" | "ORANGE_MONEY" | "CARD";
export interface Payment {
  id: string; order_id: string; provider: PaymentProvider; amount: Centimes;
  /** ORDER (order_id = commande) ou SUBSCRIPTION (order_id = id d'abonnement) */
  kind?: "ORDER" | "SUBSCRIPTION";
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED"; psp_ref: string; created_at: number; updated_at: number;
}
export interface PaymentEvent { id: number; event_id: string; payment_id: string; status: string; signature_valid: boolean; received_at: number }
export interface ReferralLink {
  id: number; code: string; user_id: number; product_id: number; campaign: string; created_at: number;
  status: "ACTIVE" | "DISABLED"; clicks: number; orders: number; sales_amount: Centimes; commission_amount: Centimes;
}
export interface ReferralClick { id: number; link_id: number; device: string; at: number; self: boolean }
export interface Attribution { device: string; link_id: number; affiliate_user_id: number; product_id: number; clicked_at: number; expires_at: number }
export interface Referral { id: number; referrer_id: number; referred_id: number; created_at: number; status: "PENDING" | "ACTIVE" | "BLOCKED" }
export interface Commission {
  id: number; user_id: number; order_id: string; label: string; base_amount: Centimes; amount: Centimes;
  rate_label: string; status: "PENDING" | "AVAILABLE" | "CANCELLED"; created_at: number;
  release_at: number | null; released_at: number | null;
}
export interface Wallet { user_id: number; commission_available: Centimes; fcfa_balance: Centimes; pending: Centimes; created_at: number; updated_at: number }
export type LedgerType = "SALE_COMMISSION" | "COMMISSION_RELEASE" | "COMMISSION_CANCEL" | "POOL_CONVERSION" | "WITHDRAWAL" | "WITHDRAWAL_REVERSAL" | "REFUND" | "ADJUSTMENT" | "BONUS";
export interface LedgerEntry {
  id: string; user_id: number; type: LedgerType; label: string; amount_fcfa: Centimes; pool_amount: PoolCents;
  bucket: "PENDING" | "POOL" | "FCFA"; reference: string; status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  created_at: number; admin_id?: number; reason?: string;
}
export interface PoolConversion { id: string; user_id: number; pool_amount: PoolCents; fcfa_amount: Centimes; created_at: number }
export interface Withdrawal {
  id: string; user_id: number; amount: Centimes; fee: Centimes; net: Centimes; network: "MTN" | "ORANGE";
  phone: string; holder: string; status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED";
  created_at: number; updated_at: number; psp_ref?: string; failure_reason?: string;
}
export interface WithdrawalMethod { id: number; user_id: number; network: "MTN" | "ORANGE"; phone: string; holder: string; created_at: number }
export interface Notification { id: number; user_id: number; type: "SALE" | "COMMISSION" | "PAYMENT" | "ORDER" | "WITHDRAWAL" | "CONVERSION" | "SECURITY"; title: string; body: string; read: boolean; created_at: number; link?: string }
export interface AuditLog { id: number; actor: string; actor_id: number | null; action: string; target: string; details: string; at: number; ip: string }
export interface FraudEvent { id: number; user_id: number | null; type: string; severity: "LOW" | "MEDIUM" | "HIGH"; details: string; status: "OPEN" | "REVIEWED" | "DISMISSED"; at: number }
export interface EmailMsg { id: number; to: string; subject: string; body: string; kind: string; at: number }

export interface DB {
  version: number; seq: number;
  users: User[]; user_profiles: Profile[]; otp_requests: OtpRequest[]; sessions: Session[];
  categories: Category[]; products: Product[]; reviews: Review[]; carts: Cart[];
  orders: Order[]; payments: Payment[]; payment_events: PaymentEvent[];
  referral_links: ReferralLink[]; referral_clicks: ReferralClick[]; attributions: Attribution[]; referrals: Referral[];
  referral_intents: { device: string; code: string; at: number }[];
  commissions: Commission[]; wallets: Wallet[]; wallet_transactions: LedgerEntry[]; pool_conversions: PoolConversion[];
  withdrawals: Withdrawal[]; withdrawal_methods: WithdrawalMethod[]; notifications: Notification[];
  audit_logs: AuditLog[]; fraud_events: FraudEvent[]; emails: EmailMsg[];
  rate_hits: { key: string; at: number }[]; idempotency: string[];
  subscriptions: Subscription[];
}

const KEY = "alwenas_db_v3";
const DAY = 86400000;

const F = (n: number) => n * 100; // FCFA → centimes

function seed(): DB {
  const now = Date.now();
  const categories: Category[] = [
    { id: 1, slug: "electronique", name: "Électronique", emoji: "🎧" },
    { id: 2, slug: "mode", name: "Mode & Pagne", emoji: "👗" },
    { id: 3, slug: "maison", name: "Maison & Cuisine", emoji: "🏠" },
    { id: 4, slug: "beaute", name: "Beauté & Soins", emoji: "✨" },
    { id: 5, slug: "auto", name: "Accessoires auto", emoji: "🚗" },
  ];
  const P = (p: Partial<Product> & Pick<Product, "id" | "slug" | "name" | "category_id" | "price" | "images">): Product => ({
    promo_price: null, commission_bps: 1000, stock: 40, sku: `ALW-${String(p.id).padStart(4, "0")}`,
    description: "", features: [], status: "ACTIVE", weight_g: 300, dimensions: "—", delivery_days: "24–72 h",
    rating: 4.7, reviews_count: 32, is_new: false, is_popular: false, created_at: now - p.id * DAY, ...p,
  });
  const px = (id: number, q = "") => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800${q}`;
  const products: Product[] = [
    P({ id: 1, slug: "support-telephone-automobile", name: "Support téléphone automobile", category_id: 5, price: F(8500), commission_bps: 1000, images: ["/images/support-telephone.jpg"], is_popular: true, stock: 64,
      description: "Support magnétique ultra-stable pour grille d'aération. Rotation 360°, fixation en une main, compatible avec tous les smartphones. Idéal pour la navigation dans les embouteillages de Douala comme sur la route de Yaoundé.",
      features: ["Aimant N52 renforcé", "Rotation 360°", "Compatible 4,7\" à 7\"", "Installation sans outil"], rating: 4.8, reviews_count: 128 }),
    P({ id: 2, slug: "ecouteurs-sans-fil-pro", name: "Écouteurs sans fil Pro ANC", category_id: 1, price: F(22000), promo_price: F(17500), commission_bps: 1000, images: [px(4526407), px(3756985)], is_popular: true,
      description: "Réduction active de bruit, 30 h d'autonomie avec le boîtier, appels cristallins. Le son premium, sans compromis.",
      features: ["Réduction de bruit active", "30 h d'autonomie", "Bluetooth 5.3", "Résistants à la transpiration"], rating: 4.6, reviews_count: 211 }),
    P({ id: 3, slug: "montre-connectee-sport", name: "Montre connectée Sport", category_id: 1, price: F(45000), commission_bps: 1200, images: [px(12564670), px(11677077)], is_new: true,
      description: "Suivi cardiaque, sommeil, notifications WhatsApp et 7 jours d'autonomie. Élégante au bureau, performante au sport.",
      features: ["Écran AMOLED 1,8\"", "7 jours d'autonomie", "Notifications WhatsApp", "Étanche IP68"], stock: 25 }),
    P({ id: 4, slug: "sac-cuir-premium", name: "Sac en cuir Premium", category_id: 2, price: F(38000), commission_bps: 1200, images: [px(27174573), px(27174572), px(27174571)], is_popular: true,
      description: "Cuir pleine fleur, finitions cousues main, bandoulière amovible. Un accessoire intemporel.",
      features: ["Cuir pleine fleur", "Bandoulière amovible", "Doublure en coton", "Fermeture sécurisée"], stock: 18 }),
    P({ id: 5, slug: "parfum-oud-signature", name: "Parfum Oud Signature 100 ml", category_id: 4, price: F(27000), commission_bps: 1000, images: [px(16722498), px(16722501), px(16722452)], is_new: true,
      description: "Notes boisées d'oud, ambre et vanille. Une signature olfactive qui tient toute la journée.",
      features: ["100 ml", "Tenue 12 h+", "Notes oud & ambre", "Flacon verre premium"] }),
    P({ id: 6, slug: "powerbank-20000", name: "Power bank 20 000 mAh", category_id: 1, price: F(12500), promo_price: F(10750), commission_bps: 1000, images: ["/images/powerbank.jpg"], is_popular: true, stock: 90,
      description: "Rechargez 4 fois votre téléphone. Indispensable pendant les coupures d'électricité.",
      features: ["20 000 mAh", "Charge rapide 22,5 W", "USB-C + 2 USB-A", "Écran LED"], rating: 4.9, reviews_count: 342 }),
    P({ id: 7, slug: "blender-multifonction", name: "Blender multifonction 1,5 L", category_id: 3, price: F(32000), promo_price: F(28000), commission_bps: 800, images: ["/images/blender.jpg"],
      description: "Jus de fruits frais, sauces, bouillies : 6 lames inox et moteur 800 W pour la cuisine camerounaise du quotidien.",
      features: ["Moteur 800 W", "Bol verre 1,5 L", "6 lames inox", "3 vitesses + pulse"] }),
    P({ id: 8, slug: "chemise-pagne-homme", name: "Chemise pagne homme", category_id: 2, price: F(15000), commission_bps: 1200, images: ["/images/chemise-pagne.jpg"], is_new: true,
      description: "Coupe moderne, wax 100 % coton, confectionnée par des couturiers de Douala.",
      features: ["Wax 100 % coton", "Coupe ajustée", "Tailles S à XXL", "Fabriqué au Cameroun"] }),
    P({ id: 9, slug: "coffret-soin-karite", name: "Coffret soin karité", category_id: 4, price: F(16000), promo_price: F(14050), commission_bps: 500, images: [px(18441533), px(24602077)],
      description: "Beurre de karité pur, savon naturel et huile nourrissante. La routine soin 100 % naturelle.",
      features: ["Karité pur", "Sans parabènes", "3 produits", "Tous types de peau"] }),
    P({ id: 10, slug: "baskets-urban", name: "Baskets Urban", category_id: 2, price: F(29000), commission_bps: 1000, images: [px(19869753), px(27100548)], stock: 3,
      description: "Légères, respirantes et stylées. Pour marcher toute la journée avec style.",
      features: ["Semelle amortissante", "Mesh respirant", "Pointures 39 à 46", "Ultra légères"] }),
  ];
  const names = ["Arnaud T.", "Sandrine M.", "Blaise N.", "Carine E.", "Yannick F.", "Grâce A."];
  const cities = ["Douala", "Yaoundé", "Bafoussam", "Garoua", "Limbé", "Kribi"];
  const texts = ["Livré en 24 h à Akwa, produit conforme. Je recommande !", "Très bonne qualité pour le prix. Paiement MoMo très simple.", "Service client réactif, je commande encore.", "Emballage soigné et livreur ponctuel."];
  const reviews: Review[] = [];
  let rid = 1;
  products.forEach((p) => {
    for (let i = 0; i < 3; i++) reviews.push({ id: rid++, product_id: p.id, author: names[(p.id + i) % 6], city: cities[(p.id + i * 2) % 6], rating: i === 2 ? 4 : 5, text: texts[(p.id + i) % 4], created_at: now - (i + 1) * 3 * DAY });
  });
  return {
    version: 3, seq: 1000,
    // Compte admin de sandbox préprovisionné, sans mot de passe. Il faut prouver
    // la possession de cette boîte mail via /mot-de-passe avant de se connecter.
    users: [{ id: 1, email: "admin@alwenasshop.com", status: "ACTIVE", created_at: now, updated_at: now, last_login_at: null, referral_code: "ADMIN1", roles: ["SUPER_ADMIN"], subscription_lifetime: true }],
    user_profiles: [{ user_id: 1, first_name: "Admin", last_name: "ALWENAS", phone: "" }], otp_requests: [], sessions: [], categories, products, reviews, carts: [],
    orders: [], payments: [], payment_events: [], referral_links: [], referral_clicks: [], attributions: [], referrals: [], referral_intents: [],
    commissions: [], wallets: [], wallet_transactions: [], pool_conversions: [], withdrawals: [], withdrawal_methods: [], notifications: [],
    audit_logs: [], fraud_events: [], emails: [], rate_hits: [], idempotency: [], subscriptions: [],
  };
}

let cache: DB | null = null;
export function db(): DB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw) as DB; cache.subscriptions ??= [];
      if (!cache.users.some((u) => u.email === "admin@alwenasshop.com")) {
        cache.users.push({ id: 1, email: "admin@alwenasshop.com", status: "ACTIVE", created_at: Date.now(), updated_at: Date.now(), last_login_at: null, referral_code: "ADMIN1", roles: ["SUPER_ADMIN"], subscription_lifetime: true });
        cache.user_profiles.push({ user_id: 1, first_name: "Admin", last_name: "ALWENAS", phone: "" }); persist();
      }
      return cache;
    }
  } catch { /* ignore */ }
  cache = seed();
  persist();
  return cache;
}
export function persist() {
  if (!cache) return;
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* quota */ }
}
export function resetDb() { localStorage.removeItem(KEY); cache = null; db(); }
export const nextId = () => { const d = db(); d.seq += 1; return d.seq; };
export { DAY };
