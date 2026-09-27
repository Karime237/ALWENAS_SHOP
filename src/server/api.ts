/**
 * ALWENAS SHOP — API "serveur" (sandbox)
 * Chaque fonction correspond à un endpoint REST documenté dans docs/API.md.
 * Règle absolue : le client n'envoie JAMAIS de prix, de solde, de commission
 * ou de statut. Tout est recalculé et vérifié ici.
 */
import { db, persist, nextId, DAY, type User, type Payment, type Order, type OrderStatus, type Customer, type PaymentProvider, type LedgerEntry, type Commission, type Session, type Role, type Product } from "./db";
import { applyBps, centimesToPoolDisplay, centimesToPoolFloor, poolToCentimes, formatPool, formatFCFA, type Centimes, type PoolCents } from "../lib/money";

export class ApiError extends Error {
  code: string; status: number;
  constructor(message: string, code = "ERROR", status = 400) { super(message); this.code = code; this.status = status; }
}

/* ------------------------------------------------------------------ config */
export const CONFIG = {
  OTP_TTL_MS: 5 * 60 * 1000,
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_COOLDOWN_MS: 45 * 1000,
  OTP_MAX_PER_EMAIL_HOUR: 5,
  OTP_MAX_PER_IP_HOUR: 12,
  ACCESS_AMOUNT_MAX: 5_000_000_00,
  SESSION_TTL_MS: 7 * DAY,
  ATTRIBUTION_WINDOW_MS: 30 * DAY,
  REFUND_WINDOW_MS: 7 * DAY,
  WITHDRAW_MIN: 1_000_00,
  WITHDRAW_MAX: 500_000_00,
  WITHDRAW_FEE_BPS: 100,
  WITHDRAW_FEE_MIN: 100_00,
  FREE_DELIVERY_FROM: 50_000_00,
  ADMIN_STEPUP_TTL_MS: 30 * 60 * 1000,
  /** Paiement unique, accès vendeur à vie. */
  SUBSCRIPTION_PRICE: 1_500_00,
};
export const ADMIN_EMAIL = "admin@alwenasshop.com";
// ⚠️ En production : variable d'environnement PAYMENT_SECRET côté serveur uniquement.
const PSP_WEBHOOK_SECRET = "sandbox_whsec_alwenas_7f3c";

export const REGIONS = ["Adamaoua", "Centre", "Est", "Extrême-Nord", "Littoral", "Nord", "Nord-Ouest", "Ouest", "Sud", "Sud-Ouest"];

/* ------------------------------------------------------------------ utils */
const wait = (ms = 260) => new Promise((r) => setTimeout(r, ms + Math.random() * 180));
const hex = (buf: ArrayBuffer | Uint8Array) => Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
const randHex = (n: number) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); };
async function sha256(s: string) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))); }
export const passwordValid = (s: string) => s.length >= 8 && s.length <= 128 && /[A-Za-z]/.test(s) && /\d/.test(s);
async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 210000 }, key, 256));
}
async function hmac(secret: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
}
const safeEqual = (a: string, b: string) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
function randomOtp() { const a = new Uint32Array(1); let v = 0; do { crypto.getRandomValues(a); v = a[0]; } while (v >= 4_294_000_000); return String(v % 1_000_000).padStart(6, "0"); }
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len = 6) { const a = new Uint8Array(len); crypto.getRandomValues(a); return Array.from(a, (b) => ALPHA[b % 32]).join(""); }
function randomDigits(len: number) { let s = ""; while (s.length < len) s += randomOtp(); return s.slice(0, len); }
export const maskEmail = (e: string) => { const [l, d] = e.split("@"); return `${l.slice(0, 2)}${"*".repeat(Math.max(2, Math.min(5, l.length - 2)))}@${d}`; };
export const maskPhone = (p: string) => `${p.slice(0, 1)}XXXXX${p.slice(-3)}`;
const EMAIL_RE = /^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/;
export const normalizeEmail = (raw: string) => raw.replace(/\s+/g, "").toLowerCase();
const clean = (s: unknown, max = 120) => String(s ?? "").replace(/[<>]/g, "").trim().slice(0, max);
export const MTN_RE = /^6(7\d|8\d|5[0-4])\d{6}$/;
export const ORANGE_RE = /^6(9\d|5[5-9]|4\d)\d{6}$/;

function rateLimit(key: string, windowMs: number, max: number, msg: string) {
  const d = db(); const now = Date.now();
  d.rate_hits = d.rate_hits.filter((h) => now - h.at < 3600_000 * 2);
  const n = d.rate_hits.filter((h) => h.key === key && now - h.at < windowMs).length;
  if (n >= max) throw new ApiError(msg, "RATE_LIMITED", 429);
  d.rate_hits.push({ key, at: now });
}
function audit(actor: string, actor_id: number | null, action: string, target: string, details = "", ip = "sandbox") {
  db().audit_logs.unshift({ id: nextId(), actor, actor_id, action, target, details, at: Date.now(), ip });
}
function fraud(user_id: number | null, type: string, severity: "LOW" | "MEDIUM" | "HIGH", details: string) {
  db().fraud_events.unshift({ id: nextId(), user_id, type, severity, details, status: "OPEN", at: Date.now() });
}
function notify(user_id: number, type: import("./db").Notification["type"], title: string, body: string, link?: string) {
  db().notifications.unshift({ id: nextId(), user_id, type, title, body, read: false, created_at: Date.now(), link });
}
function sendEmail(to: string, kind: string, subject: string, body: string) {
  db().emails.unshift({ id: nextId(), to, kind, subject, body, at: Date.now() });
  db().emails = db().emails.slice(0, 80);
}
function ledger(e: Omit<LedgerEntry, "id" | "created_at">) {
  const entry: LedgerEntry = { ...e, id: `TX${randomDigits(8)}`, created_at: Date.now() };
  db().wallet_transactions.unshift(entry);
  return entry;
}
function wallet(user_id: number) {
  const d = db(); let w = d.wallets.find((x) => x.user_id === user_id);
  if (!w) { w = { user_id, commission_available: 0, fcfa_balance: 0, pending: 0, created_at: Date.now(), updated_at: Date.now() }; d.wallets.push(w); }
  return w;
}
function uniqueId(prefix: string, exists: (id: string) => boolean) { let id = ""; do { id = `${prefix}${randomDigits(5)}`; } while (exists(id)); return id; }

type S = Session & { admin_verified_until?: number };
async function auth(token: string | null | undefined, allowPending = false): Promise<User> {
  if (!token) throw new ApiError("Session expirée. Veuillez vous reconnecter.", "UNAUTHENTICATED", 401);
  const h = await sha256(token); const d = db();
  const s = d.sessions.find((x) => x.token_hash === h) as S | undefined;
  if (!s || s.revoked || s.expires_at < Date.now()) throw new ApiError("Session expirée. Veuillez vous reconnecter.", "UNAUTHENTICATED", 401);
  const u = d.users.find((x) => x.id === s.user_id);
  if (!u) throw new ApiError("Compte introuvable.", "UNAUTHENTICATED", 401);
  if (u.status === "SUSPENDED") throw new ApiError("Votre compte est suspendu. Contactez le support.", "SUSPENDED", 403);
  if (!allowPending && !subInfo(u).active) throw new ApiError("Finalisez votre inscription en réglant 1 500 FCFA avant d'accéder à votre espace.", "PAYMENT_REQUIRED", 402);
  s.last_seen = Date.now();
  return u;
}
async function sessionOf(token: string) { const h = await sha256(token); return db().sessions.find((x) => x.token_hash === h) as S | undefined; }
const profileOf = (id: number) => db().user_profiles.find((p) => p.user_id === id)!;
const displayName = (u: User) => { const p = profileOf(u.id); return p?.first_name || u.email.split("@")[0]; };

/* ================================================================== AUTH */
export type SignupInput = { first_name: string; last_name: string; phone: string; password: string; accept: boolean; referral_code?: string };
function eligibleSponsor(code: string) {
  const u = db().users.find((x) => x.referral_code === code.trim().toUpperCase() && x.status === "ACTIVE");
  return u && subInfo(u).active ? u : null;
}
/**
 * POST /auth/request-otp
 *  - mode "signup" : vérification e-mail à la création du compte ; 1 500 FCFA
 *    fixés côté serveur, aucun paiement avant la confirmation de l'e-mail.
 *  - mode "reset"  : récupération du mot de passe après vérification e-mail.
 * La connexion ordinaire utilise loginPassword, pas un OTP.
 */
export async function requestOtp(input: { email: string; mode: "signup" | "reset"; signup: SignupInput }, device: string) {
  await wait();
  const d = db();
  const mode = input.mode;
  const email = normalizeEmail(input.email || "");
  if (!EMAIL_RE.test(email)) throw new ApiError("Adresse e-mail invalide.", "INVALID_EMAIL");
  const amount: Centimes = CONFIG.SUBSCRIPTION_PRICE;
  let signup: import("./db").OtpRequest["signup"];
  if (mode === "signup" || mode === "reset") {
    const s = input.signup;
    const first_name = clean(s?.first_name, 50), last_name = clean(s?.last_name, 50);
    const phone = String(s?.phone ?? "").replace(/\D/g, "");
    const errs: string[] = [];
    if (mode === "signup") {
      if (first_name.length < 2) errs.push("prénom"); if (last_name.length < 2) errs.push("nom");
      if (!/^6\d{8}$/.test(phone)) errs.push("téléphone (9 chiffres commençant par 6)");
      if (!eligibleSponsor(s?.referral_code ?? "")) errs.push("code de parrainage d'un membre actif");
    }
    if (!passwordValid(s?.password ?? "")) errs.push("mot de passe (8 caractères minimum, lettres et chiffres)");
    if (errs.length) throw new ApiError(`Champs invalides : ${errs.join(", ")}.`, "VALIDATION");
    if (mode === "signup" && !s?.accept) throw new ApiError("Vous devez accepter les conditions générales et la politique d'abonnement.", "VALIDATION");
    const password_salt = randHex(16);
    signup = { first_name, last_name, phone, password_salt, password_hash: await hashPassword(s!.password, password_salt), referral_code: mode === "signup" ? s!.referral_code!.trim().toUpperCase() : undefined };
  }
  const existing = d.users.find((u) => u.email === email);
  if (existing?.status === "SUSPENDED") throw new ApiError("Ce compte est suspendu. Contactez le support.", "SUSPENDED", 403);
  if (mode === "reset" && !existing) throw new ApiError("Aucun compte avec cette adresse.", "NO_ACCOUNT", 404);
  if (mode === "signup" && existing) throw new ApiError("Un compte existe déjà avec cette adresse. Connectez-vous avec le formulaire d'accès.", "ACCOUNT_EXISTS", 409);
  rateLimit(`otp:ip:${device}`, 3600_000, CONFIG.OTP_MAX_PER_IP_HOUR, "Trop de demandes depuis cet appareil. Réessayez plus tard.");
  rateLimit(`otp:email:${email}`, 3600_000, CONFIG.OTP_MAX_PER_EMAIL_HOUR, "Trop de codes demandés pour cette adresse. Réessayez dans une heure.");
  const last = d.otp_requests.find((o) => o.email === email && o.status === "PENDING" && o.mode === mode);
  if (last && Date.now() - last.created_at < CONFIG.OTP_RESEND_COOLDOWN_MS) {
    // on réutilise la tentative en cours plutôt que d'envoyer un nouveau mail
    if (signup) last.signup = signup;
    persist();
    return { requestId: last.id, maskedEmail: maskEmail(email), expiresAt: last.expires_at, resendAt: last.created_at + CONFIG.OTP_RESEND_COOLDOWN_MS, mode };
  }
  const r = await issueOtp(email, amount, device, mode, signup);
  persist();
  return r;
}

async function issueOtp(email: string, amount: Centimes, device: string, mode: "login" | "signup" | "reset" = "signup", signup?: import("./db").OtpRequest["signup"]) {
  const d = db();
  d.otp_requests.forEach((o) => { if (o.email === email && o.status === "PENDING") o.status = "REPLACED"; });
  const code = randomOtp(); const salt = randHex(16);
  const now = Date.now();
  const req = { id: randHex(16), email, code_hash: await sha256(`${salt}:${code}`), salt, created_at: now, expires_at: now + CONFIG.OTP_TTL_MS, attempts: 0, max_attempts: CONFIG.OTP_MAX_ATTEMPTS, status: "PENDING" as const, ip: device, amount, mode, signup };
  d.otp_requests.unshift(req);
  d.otp_requests = d.otp_requests.slice(0, 300);
  sendEmail(email, "OTP", mode === "signup" ? "Confirmez la création de votre compte ALWENAS SHOP" : "Votre code de vérification ALWENAS SHOP", `Votre code de vérification ALWENAS SHOP est : ${code}\n\nCe code est valable 5 minutes et ne peut être utilisé qu'une seule fois. Ne le communiquez jamais, même à un membre de l'équipe ALWENAS.`);
  return { requestId: req.id, maskedEmail: maskEmail(email), expiresAt: req.expires_at, resendAt: now + CONFIG.OTP_RESEND_COOLDOWN_MS, mode };
}

export async function resendOtp(requestId: string, device: string) {
  await wait();
  const d = db();
  const old = d.otp_requests.find((o) => o.id === requestId);
  if (!old) throw new ApiError("Demande introuvable. Recommencez depuis l'accueil.", "NOT_FOUND", 404);
  if (old.mode === "delivery") throw new ApiError("Utilisez la page de votre commande pour redemander un code de réception.", "INVALID_STATE");
  if (Date.now() - old.created_at < CONFIG.OTP_RESEND_COOLDOWN_MS) throw new ApiError("Veuillez patienter avant de demander un nouveau code.", "COOLDOWN", 429);
  rateLimit(`otp:ip:${device}`, 3600_000, CONFIG.OTP_MAX_PER_IP_HOUR, "Trop de demandes depuis cet appareil. Réessayez plus tard.");
  rateLimit(`otp:email:${old.email}`, 3600_000, CONFIG.OTP_MAX_PER_EMAIL_HOUR, "Trop de codes demandés pour cette adresse. Réessayez dans une heure.");
  const r = await issueOtp(old.email, old.amount, device, old.mode ?? "signup", old.signup);
  persist();
  return r;
}

export async function verifyOtp(requestId: string, code: string, device: string, ua: string) {
  await wait(420);
  const d = db();
  const req = d.otp_requests.find((o) => o.id === requestId);
  if (!req) throw new ApiError("Demande introuvable. Recommencez depuis l'accueil.", "NOT_FOUND", 404);
  if (req.mode !== "signup" && req.mode !== "reset") throw new ApiError("Code réservé à un autre parcours.", "INVALID_STATE", 403);
  if (!/^\d{6}$/.test(code)) throw new ApiError("Le code doit contenir 6 chiffres.", "INVALID_CODE");
  if (req.status === "USED" || req.status === "REPLACED") throw new ApiError("Ce code n'est plus valide. Demandez un nouveau code.", "INVALID_STATE");
  if (req.status === "LOCKED" || req.attempts >= req.max_attempts) throw new ApiError("Nombre maximal de tentatives atteint. Demandez un nouveau code.", "LOCKED", 429);
  if (Date.now() > req.expires_at) { req.status = "EXPIRED"; persist(); throw new ApiError("Ce code a expiré. Demandez un nouveau code.", "EXPIRED", 410); }
  const ok = safeEqual(await sha256(`${req.salt}:${code}`), req.code_hash);
  if (!ok) {
    req.attempts += 1;
    if (req.attempts >= req.max_attempts) {
      req.status = "LOCKED";
      fraud(d.users.find((u) => u.email === req.email)?.id ?? null, "OTP_BRUTE_FORCE", "MEDIUM", `${req.email} — ${req.attempts} tentatives échouées (appareil ${device.slice(0, 8)})`);
      persist();
      throw new ApiError("Nombre maximal de tentatives atteint. Demandez un nouveau code.", "LOCKED", 429);
    }
    persist();
    throw new ApiError(`Code incorrect. Vérifiez le code reçu par e-mail. (${req.max_attempts - req.attempts} essai(s) restant(s))`, "WRONG_CODE");
  }
  req.status = "USED";
  let user = d.users.find((u) => u.email === req.email);
  let isNew = false;
  const mode = req.mode ?? "login";
  if (mode === "signup" && user) { persist(); throw new ApiError("Un compte existe déjà avec cette adresse. Connectez-vous ou réinitialisez le mot de passe.", "ACCOUNT_EXISTS", 409); }
  if (!user && mode !== "signup") { persist(); throw new ApiError("Compte introuvable.", "NO_ACCOUNT", 404); }
  if (user && mode === "reset" && req.signup) {
    user.password_hash = req.signup.password_hash;
    user.password_salt = req.signup.password_salt;
    d.sessions.forEach((s) => { if (s.user_id === user!.id) s.revoked = true; });
    audit(user.email, user.id, "PASSWORD_RESET", `user:${user.id}`);
  }
  if (!user) {
    const sponsor = eligibleSponsor(req.signup?.referral_code ?? "");
    if (!sponsor) { persist(); throw new ApiError("Parrain invalide ou inactif. Recommencez votre inscription avec un code valide.", "INVALID_REFERRAL", 400); }
    isNew = true;
    const now = Date.now();
    let rc = ""; do { rc = randomCode(6); } while (d.users.some((u) => u.referral_code === rc));
    const roles: Role[] = []; // les rôles admin sont provisionnés séparément, jamais via l'inscription publique
    user = { id: 10000 + d.users.length * 7 + Math.floor(Math.random() * 7), email: req.email, status: "PENDING_PAYMENT", created_at: now, updated_at: now, last_login_at: null, referral_code: rc, roles, subscription_lifetime: false, password_hash: req.signup?.password_hash, password_salt: req.signup?.password_salt };
    d.users.push(user);
    d.user_profiles.push({ user_id: user.id, first_name: req.signup?.first_name ?? "", last_name: req.signup?.last_name ?? "", phone: req.signup?.phone ?? "" });
    wallet(user.id);
    // Le lien de parrainage est obligatoire ; il ne génère jamais une commission d'inscription.
    const sameDevice = d.sessions.some((s) => s.user_id === sponsor.id && s.device === device);
    d.referrals.push({ id: nextId(), referrer_id: sponsor.id, referred_id: user.id, created_at: now, status: sameDevice ? "BLOCKED" : "PENDING" });
    if (sameDevice) fraud(sponsor.id, "SELF_REFERRAL", "MEDIUM", `Parrainage depuis le même appareil (${user.email})`);
    sendEmail(user.email, "WELCOME", "Bienvenue sur ALWENAS SHOP", "Votre e-mail est vérifié. Pour finaliser votre inscription et activer votre compte, réglez le paiement unique de 1 500 FCFA.");
    notify(user.id, "SECURITY", "Finalisez votre inscription", "Confirmez le paiement unique de 1 500 FCFA pour activer votre compte.", "/abonnement");
    audit("system", null, "USER_PENDING_PAYMENT", `user:${user.id}`, `Invitation par ${sponsor.id}`);
  }
  if (user.status === "SUSPENDED") { persist(); throw new ApiError("Votre compte est suspendu. Contactez le support.", "SUSPENDED", 403); }
  const token = randHex(32);
  const now = Date.now();
  d.sessions.push({ token_hash: await sha256(token), user_id: user.id, created_at: now, expires_at: now + CONFIG.SESSION_TTL_MS, device, revoked: false, last_seen: now, ua: ua.slice(0, 120) });
  user.last_login_at = now;
  notify(user.id, "SECURITY", "Nouvelle connexion", `Connexion depuis ${ua.includes("Mobile") ? "un mobile" : "un ordinateur"} le ${new Date(now).toLocaleString("fr-FR")}.`);
  audit(user.email, user.id, "LOGIN", `user:${user.id}`, "OTP e-mail vérifié");
  persist();
  return { token, isNew, accessAmount: req.amount, needsSubscription: !subInfo(user).active };
}

/** Authentification mot de passe : jamais de montant ni de code OTP sur la page d'accès. */
export async function loginPassword(emailRaw: string, password: string, device: string, ua: string) {
  await wait(250);
  const email = normalizeEmail(emailRaw);
  if (!EMAIL_RE.test(email) || !password) throw new ApiError("Adresse e-mail ou mot de passe invalide.", "INVALID_CREDENTIALS", 401);
  rateLimit(`login:device:${device}`, 15 * 60_000, 12, "Trop de tentatives. Réessayez dans 15 minutes.");
  rateLimit(`login:email:${email}`, 15 * 60_000, 6, "Trop de tentatives. Réessayez dans 15 minutes.");
  const u = db().users.find((x) => x.email === email);
  // Hash factice pour ne pas distinguer les adresses inexistantes par le temps de réponse.
  const actual = await hashPassword(password, u?.password_salt ?? "unknown-user-salt");
  if (!u?.password_hash || !safeEqual(actual, u.password_hash)) { persist(); throw new ApiError("Adresse e-mail ou mot de passe invalide.", "INVALID_CREDENTIALS", 401); }
  if (u.status === "SUSPENDED") throw new ApiError("Compte suspendu. Contactez le support.", "SUSPENDED", 403);
  const token = randHex(32); const now = Date.now();
  db().sessions.push({ token_hash: await sha256(token), user_id: u.id, created_at: now, expires_at: now + CONFIG.SESSION_TTL_MS, device, revoked: false, last_seen: now, ua: ua.slice(0, 120) });
  u.last_login_at = now;
  audit(u.email, u.id, "LOGIN_PASSWORD", `user:${u.id}`); persist();
  return { token, needsSubscription: !subInfo(u).active };
}

/* ========================================================== ABONNEMENT */
function subInfo(u: User) {
  const exempt = u.roles.length > 0;
  // Migration : seules les souscriptions confirmées par un PSP sont reconnues.
  const paid = db().subscriptions.some((s) => s.user_id === u.id && s.status === "SUCCESS");
  const active = exempt || !!u.subscription_lifetime || paid;
  const status: "EXEMPT" | "ACTIVE" | "NONE" = exempt ? "EXEMPT" : active ? "ACTIVE" : "NONE";
  return { active, status, expires_at: null, price: CONFIG.SUBSCRIPTION_PRICE, lifetime: true };
}
function requireSub(u: User) {
  if (!subInfo(u).active) throw new ApiError("Abonnement vendeur requis (1 500 FCFA). Activez-le pour utiliser cette fonctionnalité.", "SUBSCRIPTION_REQUIRED", 402);
}
export async function getSubscription(token: string) {
  await wait(120);
  const u = await auth(token, true); const d = db();
  return { ...subInfo(u), phone: profileOf(u.id)?.phone ?? "", history: d.subscriptions.filter((s) => s.user_id === u.id).sort((a, b) => b.created_at - a.created_at).map((s) => ({ ...s, phone: maskPhone(s.phone) })) };
}
/** POST /subscriptions — crée la demande de paiement de l'abonnement (montant fixé côté serveur) */
export async function createSubscriptionPayment(token: string, provider: "MTN_MOMO" | "ORANGE_MONEY", phoneRaw: string) {
  await wait(320);
  const u = await auth(token, true); const d = db();
  if (subInfo(u).active) throw new ApiError("Votre abonnement est déjà actif à vie.", "ALREADY_SUBSCRIBED", 409);
  if (d.subscriptions.some((s) => s.user_id === u.id && s.status === "PENDING")) throw new ApiError("Un paiement est déjà en attente. Vérifiez sa confirmation avant de réessayer.", "PAYMENT_PENDING", 409);
  const phone = String(phoneRaw).replace(/\D/g, "");
  if (provider !== "MTN_MOMO" && provider !== "ORANGE_MONEY") throw new ApiError("Moyen de paiement invalide.", "VALIDATION");
  if (provider === "MTN_MOMO" && !MTN_RE.test(phone)) throw new ApiError("Ce numéro n'est pas un numéro MTN Cameroon valide.", "VALIDATION");
  if (provider === "ORANGE_MONEY" && !ORANGE_RE.test(phone)) throw new ApiError("Ce numéro n'est pas un numéro Orange Cameroun valide.", "VALIDATION");
  rateLimit(`sub:${u.id}`, 10 * 60_000, 5, "Trop de tentatives de paiement. Réessayez dans quelques minutes.");
  const now = Date.now();
  const id = uniqueId("SUB", (x) => d.subscriptions.some((s) => s.id === x));
  const paymentId = `PAY${randHex(6).toUpperCase()}`;
  d.payments.unshift({ id: paymentId, order_id: id, kind: "SUBSCRIPTION", provider, amount: CONFIG.SUBSCRIPTION_PRICE, status: "PENDING", psp_ref: `PSP-${randomCode(10)}`, created_at: now, updated_at: now });
  d.subscriptions.unshift({ id, user_id: u.id, amount: CONFIG.SUBSCRIPTION_PRICE, provider, phone, status: "PENDING", payment_id: paymentId, created_at: now, period_start: null, period_end: null });
  audit(u.email, u.id, "SUBSCRIPTION_PAYMENT_CREATED", id, `${provider} ${maskPhone(phone)}`);
  persist();
  return { subscriptionId: id, paymentId, amount: CONFIG.SUBSCRIPTION_PRICE, phone: maskPhone(phone), provider };
}
export async function getSubscriptionPayment(token: string, subscriptionId: string) {
  await wait(80);
  const u = await auth(token, true);
  const s = db().subscriptions.find((x) => x.id === subscriptionId && x.user_id === u.id);
  if (!s) throw new ApiError("Paiement introuvable.", "NOT_FOUND", 404);
  return { ...s, phone: maskPhone(s.phone), subscription: subInfo(u) };
}
/** Traitement du webhook PSP pour un paiement d'abonnement (appelé par paymentsWebhook) */
function handleSubscriptionPayment(pay: Payment, status: "SUCCESS" | "FAILED", amount: number) {
  const d = db(); const s = d.subscriptions.find((x) => x.id === pay.order_id);
  if (!s) throw new ApiError("Abonnement inconnu.", "NOT_FOUND", 404);
  if (pay.status !== "PENDING") { persist(); return { status: pay.status, subscriptionId: s.id }; } // idempotent
  const now = Date.now(); pay.updated_at = now;
  const u = d.users.find((x) => x.id === s.user_id)!;
  if (status === "SUCCESS" && amount === pay.amount) {
    pay.status = "SUCCESS"; s.status = "SUCCESS";
    s.period_start = now; s.period_end = null;
    u.subscription_lifetime = true; u.status = "ACTIVE"; u.updated_at = now;
    const invitation = d.referrals.find((r) => r.referred_id === u.id && r.status === "PENDING");
    if (invitation) {
      invitation.status = "ACTIVE";
      notify(invitation.referrer_id, "SECURITY", "Filleul inscrit", "Votre filleul a finalisé son inscription. Aucune commission n'est versée sur les inscriptions.", "/parrainage");
    }
    notify(u.id, "PAYMENT", "Abonnement activé à vie", "Votre accès vendeur est actif sans date d'expiration. Générez vos liens et commencez à vendre !", "/boutique");
    sendEmail(u.email, "SUBSCRIPTION_ACTIVE", "Votre abonnement ALWENAS SHOP est actif", `Paiement unique de ${formatFCFA(pay.amount)} confirmé (réf. ${s.id}).\nVotre accès vendeur est valable à vie.`);
    audit("psp-webhook", null, "SUBSCRIPTION_ACTIVATED", `user:${u.id}`, s.id);
  } else {
    pay.status = "FAILED"; s.status = "FAILED";
    if (status === "SUCCESS") fraud(u.id, "PAYMENT_AMOUNT_MISMATCH", "HIGH", `Abonnement ${s.id} : reçu ${amount} ≠ attendu ${pay.amount}`);
    notify(u.id, "PAYMENT", "Paiement de l'abonnement non abouti", "Aucun montant n'a été débité. Vous pouvez réessayer.", "/abonnement");
  }
  persist();
  return { status: pay.status, subscriptionId: s.id };
}

export async function logout(token: string) {
  await wait(120);
  const s = await sessionOf(token);
  if (s) { s.revoked = true; audit("user", s.user_id, "LOGOUT", `user:${s.user_id}`); persist(); }
}

export async function me(token: string | null) {
  const u = await auth(token, true);
  persist();
  return { id: u.id, email: u.email, roles: u.roles, name: displayName(u), referral_code: u.referral_code, subscription: subInfo(u) };
}

/* ============================================================ CATALOGUE */
export type ProductDTO = Product & { category: string; final_price: Centimes; commission_preview: Centimes; in_stock: boolean };
const toDTO = (p: Product): ProductDTO => {
  const final_price = p.promo_price ?? p.price;
  return { ...p, category: db().categories.find((c) => c.id === p.category_id)?.name ?? "", final_price, commission_preview: applyBps(final_price, p.commission_bps), in_stock: p.stock > 0 };
};
export async function listCategories() { await wait(80); return db().categories.map((c) => ({ ...c, count: db().products.filter((p) => p.category_id === c.id && p.status === "ACTIVE").length })); }
export async function listProducts(q: { search?: string; category?: string; filter?: "promo" | "popular" | "new"; sort?: "recent" | "price_asc" | "price_desc" | "commission"; page?: number; pageSize?: number } = {}) {
  await wait(160);
  const d = db();
  let items = d.products.filter((p) => p.status === "ACTIVE");
  if (q.search) { const s = q.search.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); items = items.filter((p) => (p.name + " " + p.description).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(s)); }
  if (q.category) { const c = d.categories.find((x) => x.slug === q.category); items = items.filter((p) => p.category_id === c?.id); }
  if (q.filter === "promo") items = items.filter((p) => p.promo_price);
  if (q.filter === "popular") items = items.filter((p) => p.is_popular);
  if (q.filter === "new") items = items.filter((p) => p.is_new);
  const fp = (p: Product) => p.promo_price ?? p.price;
  if (q.sort === "price_asc") items.sort((a, b) => fp(a) - fp(b));
  else if (q.sort === "price_desc") items.sort((a, b) => fp(b) - fp(a));
  else if (q.sort === "commission") items.sort((a, b) => applyBps(fp(b), b.commission_bps) - applyBps(fp(a), a.commission_bps));
  else items.sort((a, b) => b.created_at - a.created_at);
  const pageSize = Math.min(q.pageSize ?? 8, 24); const page = Math.max(1, q.page ?? 1);
  return { items: items.slice((page - 1) * pageSize, page * pageSize).map(toDTO), total: items.length, page, pages: Math.max(1, Math.ceil(items.length / pageSize)) };
}
export async function getProduct(slug: string) {
  await wait(140);
  const d = db();
  const p = d.products.find((x) => x.slug === slug && x.status === "ACTIVE");
  if (!p) throw new ApiError("Produit introuvable.", "NOT_FOUND", 404);
  return { product: toDTO(p), reviews: d.reviews.filter((r) => r.product_id === p.id), related: d.products.filter((x) => x.category_id === p.category_id && x.id !== p.id && x.status === "ACTIVE").slice(0, 4).map(toDTO) };
}

/* ================================================================= CART */
function cartOf(id: string) { const d = db(); let c = d.carts.find((x) => x.id === id); if (!c) { c = { id, lines: [], updated_at: Date.now() }; d.carts.push(c); } return c; }
export function deliveryFee(city: string, subtotal: Centimes): Centimes {
  if (subtotal === 0) return 0;
  if (subtotal >= CONFIG.FREE_DELIVERY_FROM) return 0;
  return /douala|yaound/i.test(city) ? 1500_00 : 2500_00;
}
function discountFor(code: string, subtotal: Centimes, email: string): Centimes {
  const c = code.trim().toUpperCase();
  if (!c) return 0;
  if (c !== "BIENVENUE10") throw new ApiError("Code promo invalide ou expiré.", "INVALID_PROMO");
  if (db().orders.some((o) => o.customer.email === email && ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status) && o.discount > 0)) throw new ApiError("Ce code est réservé à la première commande.", "INVALID_PROMO");
  return Math.min(applyBps(subtotal, 1000), 5000_00);
}
function computeCart(id: string, city = "Douala", promo = "", email = "", fulfillment: "HOME" | "STORE" = "HOME") {
  const d = db(); const c = cartOf(id);
  const lines = c.lines.map((l) => {
    const p = d.products.find((x) => x.id === l.product_id);
    if (!p || p.status !== "ACTIVE") return null;
    const unit = p.promo_price ?? p.price; const qty = Math.min(l.qty, Math.max(p.stock, 0));
    return { product: toDTO(p), qty, requested: l.qty, unit_price: unit, line_total: unit * qty };
  }).filter(Boolean) as { product: ProductDTO; qty: number; requested: number; unit_price: Centimes; line_total: Centimes }[];
  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const discount = promo ? discountFor(promo, subtotal, email) : 0;
  const delivery = fulfillment === "STORE" ? 0 : deliveryFee(city, subtotal);
  return { lines, subtotal, delivery, discount, total: subtotal - discount + delivery, count: lines.reduce((s, l) => s + l.qty, 0) };
}
export async function getCart(cartId: string, city?: string) { await wait(90); const r = computeCart(cartId, city); persist(); return r; }
export async function addToCart(cartId: string, productId: number, qty: number) {
  await wait(140);
  const d = db(); const p = d.products.find((x) => x.id === productId && x.status === "ACTIVE");
  if (!p) throw new ApiError("Produit introuvable.", "NOT_FOUND", 404);
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw new ApiError("Quantité invalide (1 à 10).", "INVALID_QTY");
  if (p.stock <= 0) throw new ApiError("Produit en rupture de stock.", "OUT_OF_STOCK");
  const c = cartOf(cartId); const line = c.lines.find((l) => l.product_id === productId);
  const newQty = Math.min((line?.qty ?? 0) + qty, 10, p.stock);
  if (line) line.qty = newQty; else c.lines.push({ product_id: productId, qty: newQty });
  c.updated_at = Date.now(); persist();
  return computeCart(cartId);
}
export async function updateCart(cartId: string, productId: number, qty: number) {
  await wait(90);
  const c = cartOf(cartId);
  if (qty <= 0) c.lines = c.lines.filter((l) => l.product_id !== productId);
  else { const p = db().products.find((x) => x.id === productId); const l = c.lines.find((x) => x.product_id === productId); if (l && p) l.qty = Math.min(Math.floor(qty), 10, p.stock); }
  persist(); return computeCart(cartId);
}
export async function quoteCheckout(cartId: string, city: string, promo: string, email: string, fulfillment: "HOME" | "STORE" = "HOME") { await wait(100); return computeCart(cartId, city, promo, normalizeEmail(email), fulfillment); }

/* ============================================================ AFFILIATION */
export async function registerReferralIntent(code: string, device: string) {
  const d = db(); const c = clean(code, 12).toUpperCase();
  if (!d.users.some((u) => u.referral_code === c)) return false;
  d.referral_intents = d.referral_intents.filter((i) => i.device !== device);
  d.referral_intents.push({ device, code: c, at: Date.now() }); persist(); return true;
}
/** GET /r/:code — enregistre le clic et l'attribution (dernier clic, 30 jours) */
export async function resolveAffiliateLink(code: string, device: string, token: string | null) {
  await wait(150);
  const d = db(); const link = d.referral_links.find((l) => l.code === clean(code, 12).toUpperCase());
  if (!link || link.status !== "ACTIVE") throw new ApiError("Ce lien n'est plus actif.", "NOT_FOUND", 404);
  const product = d.products.find((p) => p.id === link.product_id)!;
  let viewer: User | null = null; try { viewer = token ? await auth(token) : null; } catch { viewer = null; }
  const self = viewer?.id === link.user_id;
  rateLimit(`click:${link.id}:${device}`, 60_000, 30, "Trop de clics.");
  const recent = d.referral_clicks.some((c) => c.link_id === link.id && c.device === device && Date.now() - c.at < 30 * 60_000);
  d.referral_clicks.push({ id: nextId(), link_id: link.id, device, at: Date.now(), self });
  if (!recent && !self) link.clicks += 1;
  if (!self) {
    d.attributions = d.attributions.filter((a) => a.device !== device);
    d.attributions.push({ device, link_id: link.id, affiliate_user_id: link.user_id, product_id: link.product_id, clicked_at: Date.now(), expires_at: Date.now() + CONFIG.ATTRIBUTION_WINDOW_MS });
  }
  persist();
  return { slug: product.slug, self };
}
export async function createAffiliateLink(token: string, productId: number, campaign = "Général") {
  await wait();
  const u = await auth(token); const d = db();
  requireSub(u);
  const p = d.products.find((x) => x.id === productId && x.status === "ACTIVE");
  if (!p) throw new ApiError("Produit introuvable.", "NOT_FOUND", 404);
  rateLimit(`link:${u.id}`, 60_000, 20, "Trop de liens générés. Patientez une minute.");
  let link = d.referral_links.find((l) => l.user_id === u.id && l.product_id === p.id && l.status === "ACTIVE");
  if (!link) {
    let code = ""; do { code = randomCode(6); } while (d.referral_links.some((l) => l.code === code));
    link = { id: nextId(), code, user_id: u.id, product_id: p.id, campaign: clean(campaign, 30), created_at: Date.now(), status: "ACTIVE", clicks: 0, orders: 0, sales_amount: 0, commission_amount: 0 };
    d.referral_links.push(link);
  }
  persist();
  return { code: link.code, product: toDTO(p) };
}
export async function listAffiliateLinks(token: string) {
  await wait(); const u = await auth(token); const d = db();
  return d.referral_links.filter((l) => l.user_id === u.id).sort((a, b) => b.created_at - a.created_at).map((l) => ({ ...l, product: toDTO(d.products.find((p) => p.id === l.product_id)!) }));
}

/* ============================================================ ORDERS & PAY */
export async function createOrder(input: { cartId: string; device: string; token: string | null; customer: Customer; provider: PaymentProvider; promo: string; fulfillment: "HOME" | "STORE" }) {
  await wait(380);
  const d = db();
  const c: Customer = {
    first_name: clean(input.customer.first_name, 50), last_name: clean(input.customer.last_name, 50), phone: clean(input.customer.phone, 12).replace(/\D/g, ""),
    email: normalizeEmail(input.customer.email || ""), region: clean(input.customer.region, 30), city: clean(input.customer.city, 60), district: clean(input.customer.district, 60),
    address: clean(input.customer.address, 160), notes: clean(input.customer.notes, 300),
  };
  const errs: string[] = [];
  if (c.first_name.length < 2) errs.push("prénom"); if (c.last_name.length < 2) errs.push("nom");
  if (!/^6\d{8}$/.test(c.phone)) errs.push("téléphone (9 chiffres commençant par 6)");
  if (!EMAIL_RE.test(c.email)) errs.push("e-mail"); if (!REGIONS.includes(c.region)) errs.push("région");
  if (input.fulfillment !== "HOME" && input.fulfillment !== "STORE") errs.push("mode de retrait/livraison");
  if (input.fulfillment === "HOME") {
    if (c.city.length < 2) errs.push("ville"); if (c.district.length < 2) errs.push("quartier"); if (c.address.length < 3) errs.push("adresse");
  }
  if (errs.length) throw new ApiError(`Champs invalides : ${errs.join(", ")}.`, "VALIDATION");
  if (!["MTN_MOMO", "ORANGE_MONEY", "CARD"].includes(input.provider)) throw new ApiError("Moyen de paiement invalide.", "VALIDATION");
  if (input.provider === "MTN_MOMO" && !MTN_RE.test(c.phone)) throw new ApiError("Ce numéro n'est pas un numéro MTN Cameroon valide.", "VALIDATION");
  if (input.provider === "ORANGE_MONEY" && !ORANGE_RE.test(c.phone)) throw new ApiError("Ce numéro n'est pas un numéro Orange Cameroun valide.", "VALIDATION");
  rateLimit(`order:${input.device}`, 10 * 60_000, 6, "Trop de commandes en peu de temps. Réessayez plus tard.");
  let buyer: User | null = null; try { buyer = input.token ? await auth(input.token) : null; } catch { buyer = null; }
  const q = computeCart(input.cartId, c.city, input.promo, c.email, input.fulfillment);
  if (!q.lines.length) throw new ApiError("Votre panier est vide.", "EMPTY_CART");
  for (const l of q.lines) if (l.qty < l.requested || l.qty === 0) throw new ApiError(`Stock insuffisant pour « ${l.product.name} ».`, "OUT_OF_STOCK");
  // Attribution (dernier clic valide, 30 jours)
  const now = Date.now();
  const att = d.attributions.find((a) => a.device === input.device && a.expires_at > now);
  let affiliate: User | null = att ? d.users.find((u) => u.id === att.affiliate_user_id && u.status === "ACTIVE" && subInfo(u).active) ?? null : null;
  if (affiliate && (affiliate.email === c.email || buyer?.id === affiliate.id)) {
    fraud(affiliate.id, "SELF_PURCHASE", "MEDIUM", `Achat via son propre lien (${c.email}). Commission non attribuée.`);
    affiliate = null;
  }
  const ratio = q.subtotal ? (q.subtotal - q.discount) / q.subtotal : 1; // appliqué ensuite en entier
  void ratio;
  const items = q.lines.map((l) => {
    const p = d.products.find((x) => x.id === l.product.id)!;
    const base = q.subtotal ? Math.floor((l.line_total * (q.subtotal - q.discount)) / q.subtotal) : 0;
    return { product_id: p.id, name: p.name, slug: p.slug, image: p.images[0], unit_price: l.unit_price, qty: l.qty, line_total: l.line_total, commission_bps: p.commission_bps, commission: affiliate ? applyBps(base, p.commission_bps) : 0 };
  });
  items.forEach((it) => { d.products.find((p) => p.id === it.product_id)!.stock -= it.qty; }); // réservation du stock
  const id = uniqueId("ALW", (x) => d.orders.some((o) => o.id === x));
  const paymentId = `PAY${randHex(6).toUpperCase()}`;
  const order: Order = {
    id, user_id: buyer?.id ?? null, customer: c, items, subtotal: q.subtotal, delivery: q.delivery, discount: q.discount, total: q.total, status: "PAYMENT_PENDING",
    payment_method: input.provider, payment_id: paymentId, affiliate_user_id: affiliate?.id ?? null, referral_link_id: affiliate ? att!.link_id : null,
    commission_total: items.reduce((s, i) => s + i.commission, 0), created_at: now, updated_at: now, history: [{ status: "PENDING", at: now, by: "client" }, { status: "PAYMENT_PENDING", at: now, by: "system" }], guest_key: randHex(12), fulfillment: input.fulfillment, seller_collected_at: null, buyer_confirmed_at: null,
  };
  d.orders.unshift(order);
  d.payments.unshift({ id: paymentId, order_id: id, provider: input.provider, amount: q.total, status: "PENDING", psp_ref: `PSP-${randomCode(10)}`, created_at: now, updated_at: now });
  cartOf(input.cartId).lines = [];
  sendEmail(c.email, "ORDER_CONFIRMED", `Commande #${id} enregistrée`, `Bonjour ${c.first_name},\n\nVotre commande #${id} (${formatFCFA(q.total)}) est enregistrée. Validez le paiement sur votre téléphone pour la confirmer.`);
  persist();
  return { orderId: id, paymentId, amount: q.total, guestKey: order.guest_key, provider: input.provider, phone: maskPhone(c.phone) };
}

/**
 * Simulation du prestataire de paiement (PSP). En production, c'est le PSP
 * (MTN MoMo / Orange Money / agrégateur) qui appelle POST /payments/webhook
 * avec une signature HMAC ; le navigateur n'intervient jamais.
 */
export async function sandboxPspConfirm(paymentId: string, outcome: "SUCCESS" | "FAILED") {
  await wait(900);
  const p = db().payments.find((x) => x.id === paymentId);
  if (!p) throw new ApiError("Paiement introuvable.", "NOT_FOUND", 404);
  const payload = JSON.stringify({ event_id: `evt_${randHex(8)}`, payment_id: p.id, psp_ref: p.psp_ref, status: outcome, amount: p.amount, currency: "XAF", at: Date.now() });
  const signature = await hmac(PSP_WEBHOOK_SECRET, payload);
  return paymentsWebhook(payload, signature);
}

/** POST /payments/webhook — authentifié par signature HMAC-SHA256 */
export async function paymentsWebhook(rawBody: string, signature: string) {
  const d = db();
  const valid = safeEqual(await hmac(PSP_WEBHOOK_SECRET, rawBody), signature);
  const ev = JSON.parse(rawBody) as { event_id: string; payment_id: string; status: "SUCCESS" | "FAILED"; amount: number };
  d.payment_events.unshift({ id: nextId(), event_id: ev.event_id, payment_id: ev.payment_id, status: ev.status, signature_valid: valid, received_at: Date.now() });
  if (!valid) { fraud(null, "WEBHOOK_BAD_SIGNATURE", "HIGH", `Webhook rejeté pour ${ev.payment_id}`); persist(); throw new ApiError("Signature invalide.", "BAD_SIGNATURE", 401); }
  if (d.idempotency.includes(ev.event_id)) return { status: "DUPLICATE" };
  d.idempotency.push(ev.event_id);
  const pay = d.payments.find((x) => x.id === ev.payment_id); if (!pay) throw new ApiError("Paiement inconnu.", "NOT_FOUND", 404);
  if (pay.kind === "SUBSCRIPTION") return handleSubscriptionPayment(pay, ev.status, ev.amount);
  const order = d.orders.find((o) => o.id === pay.order_id)!;
  if (pay.status !== "PENDING") { persist(); return { status: pay.status, orderId: order.id }; } // idempotent / double paiement
  const now = Date.now();
  if (ev.status === "SUCCESS" && ev.amount === pay.amount) {
    pay.status = "SUCCESS"; pay.updated_at = now;
    order.status = "PAID"; order.updated_at = now; order.history.push({ status: "PAID", at: now, by: "psp-webhook" });
    sendEmail(order.customer.email, "PAYMENT_CONFIRMED", `Paiement confirmé — Commande #${order.id}`, `Bonjour ${order.customer.first_name},\n\nNous avons bien reçu votre paiement de ${formatFCFA(order.total)}. ${order.fulfillment === "STORE" ? "Nous vous préviendrons quand votre article sera disponible à la boutique." : "Le vendeur sera chargé de récupérer votre article à la boutique puis de vous livrer."}`);
    if (order.affiliate_user_id && order.commission_total > 0) {
      const c: Commission = { id: nextId(), user_id: order.affiliate_user_id, order_id: order.id, label: order.items.map((i) => i.name).join(", "), base_amount: order.subtotal - order.discount, amount: order.commission_total, rate_label: [...new Set(order.items.map((i) => `${i.commission_bps / 100} %`))].join(" / "), status: "PENDING", created_at: now, release_at: null, released_at: null };
      d.commissions.push(c);
      const w = wallet(c.user_id); w.pending += c.amount; w.updated_at = now;
      ledger({ user_id: c.user_id, type: "SALE_COMMISSION", label: `Commission vente · ${order.items[0].name}${order.items.length > 1 ? ` +${order.items.length - 1}` : ""}`, amount_fcfa: c.amount, pool_amount: centimesToPoolDisplay(c.amount), bucket: "PENDING", reference: order.id, status: "SUCCESS" });
      const link = d.referral_links.find((l) => l.id === order.referral_link_id);
      if (link) { link.orders += 1; link.sales_amount += order.subtotal - order.discount; link.commission_amount += c.amount; }
      notify(c.user_id, "SALE", "Nouvelle vente", `Commande #${order.id} payée. ${order.fulfillment === "HOME" ? "Après préparation, passez à la boutique récupérer l'article pour livrer l'acheteur." : "Le client retirera l'article en boutique."} Commission en attente : ${formatPool(centimesToPoolDisplay(c.amount))}.`, "/ventes");
      const aff = d.users.find((u) => u.id === c.user_id)!;
      sendEmail(aff.email, "NEW_SALE", `Nouvelle vente #${order.id}`, `Une commission de ${formatFCFA(c.amount)} est en attente. Elle sera disponible après livraison et expiration du délai de remboursement (7 jours).`);
    }
    if (order.user_id) notify(order.user_id, "PAYMENT", "Paiement confirmé", `Commande #${order.id} payée : ${formatFCFA(order.total)}.`, "/commandes");
  } else {
    pay.status = "FAILED"; pay.updated_at = now;
    order.status = "CANCELLED"; order.updated_at = now; order.history.push({ status: "CANCELLED", at: now, by: "psp-webhook" });
    order.items.forEach((it) => { d.products.find((p) => p.id === it.product_id)!.stock += it.qty; });
    if (ev.status === "SUCCESS") fraud(order.user_id, "PAYMENT_AMOUNT_MISMATCH", "HIGH", `Montant reçu ${ev.amount} ≠ attendu ${pay.amount} (${order.id})`);
  }
  persist();
  return { status: pay.status, orderId: order.id };
}

const orderView = (o: Order) => ({ ...o, customer: { ...o.customer }, payment: db().payments.find((p) => p.id === o.payment_id) ?? null });
export async function getOrder(orderId: string, opts: { token?: string | null; guestKey?: string | null }) {
  await wait(120);
  const o = db().orders.find((x) => x.id === orderId);
  if (!o) throw new ApiError("Commande introuvable.", "NOT_FOUND", 404);
  if (opts.guestKey && safeEqual(opts.guestKey, o.guest_key)) return orderView(o);
  if (opts.token) { const u = await auth(opts.token); if (o.user_id === u.id || o.customer.email === u.email) return orderView(o); }
  throw new ApiError("Accès refusé à cette commande.", "FORBIDDEN", 403);
}
export async function listMyOrders(token: string) {
  await wait(); const u = await auth(token);
  return db().orders.filter((o) => !o.demo && (o.user_id === u.id || o.customer.email === u.email)).map(orderView);
}

/** Le vendeur confirme uniquement la collecte. Il ne peut PAS valider seul sa commission. */
export async function sellerCollectOrder(token: string, orderId: string) {
  const u = await auth(token); requireSub(u);
  const o = db().orders.find((x) => x.id === orderId && x.affiliate_user_id === u.id);
  if (!o || o.fulfillment !== "HOME" || o.status !== "READY_FOR_PICKUP") throw new ApiError("Cette commande n'est pas prête pour la collecte.", "INVALID_STATE");
  const now = Date.now(); o.seller_collected_at = now; o.status = "OUT_FOR_DELIVERY"; o.updated_at = now;
  o.history.push({ status: "OUT_FOR_DELIVERY", at: now, by: `seller:${u.id}` });
  notify(u.id, "ORDER", "Article collecté", `Livrez la commande #${o.id} à l'acheteur. Seul l'acheteur pourra confirmer sa réception.`, "/ventes");
  sendEmail(o.customer.email, "ORDER_SHIPPED", `Commande #${o.id} en livraison`, "Votre vendeur a collecté l'article à la boutique et vous contactera pour la livraison. Confirmez la réception depuis la page de votre commande.");
  audit(u.email, u.id, "SELLER_COLLECTED", `order:${o.id}`); persist();
}

/** Confirmation avec clé de commande ET code e-mail à usage unique de l'acheteur. */
export async function requestDeliveryOtp(orderId: string, guestKey: string, device: string) {
  const o = db().orders.find((x) => x.id === orderId);
  if (!o || !guestKey || !safeEqual(guestKey, o.guest_key)) throw new ApiError("Accès refusé.", "FORBIDDEN", 403);
  if (o.fulfillment !== "HOME" || o.status !== "OUT_FOR_DELIVERY" || !o.seller_collected_at) throw new ApiError("La livraison ne peut pas encore être confirmée.", "INVALID_STATE");
  rateLimit(`delivery:${orderId}:${device}`, 3600_000, 5, "Trop de codes demandés. Réessayez plus tard.");
  const existing = db().otp_requests.find((r) => r.order_id === orderId && r.mode === "delivery" && r.status === "PENDING");
  if (existing && Date.now() - existing.created_at < CONFIG.OTP_RESEND_COOLDOWN_MS) throw new ApiError("Patientez 45 secondes avant de redemander un code.", "COOLDOWN", 429);
  if (existing) existing.status = "REPLACED";
  const code = randomOtp(), salt = randHex(16), now = Date.now();
  db().otp_requests.unshift({ id: randHex(16), email: o.customer.email, code_hash: await sha256(`${salt}:${code}`), salt, created_at: now, expires_at: now + CONFIG.OTP_TTL_MS, attempts: 0, max_attempts: CONFIG.OTP_MAX_ATTEMPTS, status: "PENDING", ip: device, amount: 0, mode: "delivery", order_id: orderId });
  sendEmail(o.customer.email, "DELIVERY_CONFIRM", `Confirmez la réception #${orderId}`, `Votre code de confirmation de réception ALWENAS SHOP est : ${code}\nValable 5 minutes. Ne communiquez ce code qu'après avoir reçu et vérifié votre article.`);
  persist();
  return { maskedEmail: maskEmail(o.customer.email) };
}
export async function buyerConfirmDelivery(orderId: string, guestKey: string, code: string) {
  const o = db().orders.find((x) => x.id === orderId);
  if (!o || !guestKey || !safeEqual(guestKey, o.guest_key)) throw new ApiError("Accès refusé.", "FORBIDDEN", 403);
  if (o.fulfillment !== "HOME" || o.status !== "OUT_FOR_DELIVERY" || !o.seller_collected_at) throw new ApiError("La livraison ne peut pas encore être confirmée.", "INVALID_STATE");
  const req = db().otp_requests.find((r) => r.order_id === orderId && r.mode === "delivery" && r.status === "PENDING");
  if (!req || Date.now() > req.expires_at) throw new ApiError("Code expiré. Demandez un nouveau code.", "EXPIRED", 410);
  if (req.attempts >= req.max_attempts) throw new ApiError("Trop de tentatives. Demandez un nouveau code.", "LOCKED", 429);
  if (!/^\d{6}$/.test(code) || !safeEqual(await sha256(`${req.salt}:${code}`), req.code_hash)) {
    req.attempts++; if (req.attempts >= req.max_attempts) req.status = "LOCKED";
    persist(); throw new ApiError("Code incorrect. Vérifiez l'e-mail reçu.", "WRONG_CODE");
  }
  req.status = "USED";
  markDelivered(o, "buyer-confirmation"); persist();
}

function markDelivered(o: Order, by: string) {
  if (o.status === "DELIVERED") return;
  const now = Date.now(); o.status = "DELIVERED"; o.updated_at = now; o.buyer_confirmed_at = by === "buyer-confirmation" ? now : null;
  o.history.push({ status: "DELIVERED", at: now, by });
  const c = db().commissions.find((x) => x.order_id === o.id);
  if (c) c.release_at = now + CONFIG.REFUND_WINDOW_MS;
  if (o.affiliate_user_id) notify(o.affiliate_user_id, "ORDER", "Livraison validée", `Commande #${o.id} livrée. Vos POOL seront disponibles après 7 jours sans remboursement.`, "/ventes");
  sendEmail(o.customer.email, "ORDER_DELIVERED", `Commande #${o.id} livrée`, "Votre commande est livrée. Vous disposez de 7 jours pour signaler un problème.");
}

/* ============================================================ COMMISSIONS */
function releaseCommission(c: Commission, at = Date.now()) {
  if (c.status !== "PENDING") return;
  const w = wallet(c.user_id);
  c.status = "AVAILABLE"; c.released_at = at;
  w.pending -= c.amount; w.commission_available += c.amount; w.updated_at = at;
  db().wallet_transactions.unshift({ id: `TX${randomDigits(8)}`, user_id: c.user_id, type: "COMMISSION_RELEASE", label: `Commission disponible · #${c.order_id}`, amount_fcfa: c.amount, pool_amount: centimesToPoolDisplay(c.amount), bucket: "POOL", reference: c.order_id, status: "SUCCESS", created_at: at });
  notify(c.user_id, "COMMISSION", "Commission disponible 💰", `+${formatPool(centimesToPoolDisplay(c.amount))} disponibles suite à la commande #${c.order_id}.`, "/portefeuille");
}
function releaseDue() {
  const now = Date.now();
  db().commissions.forEach((c) => {
    const o = db().orders.find((x) => x.id === c.order_id);
    if (c.status === "PENDING" && c.release_at && c.release_at <= now && o?.status === "DELIVERED") releaseCommission(c);
  });
}
export async function listCommissions(token: string) {
  await wait(); const u = await auth(token); releaseDue(); persist();
  return db().commissions.filter((c) => c.user_id === u.id).sort((a, b) => b.created_at - a.created_at);
}
export const POOL_LEVELS = [
  { from: 0, to: 99, name: "STARTER" },
  { from: 100, to: 299, name: "SELLER" },
  { from: 300, to: 899, name: "ARCHIEVER" },
  { from: 900, to: 1000, name: "PERMOMER" },
  { from: 1001, to: Infinity, name: "ELITE" },
] as const;
/** Niveau cumulatif issu des ventes ; classement calculé séparément sur 30 jours. */
function poolProgress(userId: number) {
  const commissions = db().commissions.filter((c) => c.user_id === userId && c.status === "AVAILABLE" && !!c.released_at);
  const earned = commissions.filter((c) => c.released_at! >= Date.now() - 30 * DAY).reduce((sum, c) => sum + c.amount, 0);
  const lifetime = commissions.reduce((sum, c) => sum + c.amount, 0);
  const pool = centimesToPoolDisplay(earned);
  const lifetimePool = centimesToPoolDisplay(lifetime);
  const level = POOL_LEVELS.find((l) => lifetimePool >= l.from * 100 && lifetimePool < (l.to + 1) * 100) ?? POOL_LEVELS[0];
  return { pool, lifetimePool, level: level.name, next: level.to === Infinity ? null : level.to + 1, earnedFcfa: earned };
}
export async function getPoolRanking(token: string) {
  const u = await auth(token); releaseDue();
  const ranked = db().users.filter((x) => !x.roles.length).map((x) => ({ user: x, progress: poolProgress(x.id) })).sort((a, b) => b.progress.earnedFcfa - a.progress.earnedFcfa);
  persist();
  return { mine: poolProgress(u.id), place: ranked.findIndex((r) => r.user.id === u.id) + 1, total: ranked.length,
    leaders: ranked.slice(0, 10).map((r, i) => ({ place: i + 1, name: `${profileOf(r.user.id)?.first_name || r.user.email.split("@")[0]} ${profileOf(r.user.id)?.last_name?.charAt(0) || ""}.`, pool: r.progress.pool, level: r.progress.level, isMe: r.user.id === u.id })) };
}
export async function listSales(token: string) {
  await wait(); const u = await auth(token);
  return db().orders.filter((o) => o.affiliate_user_id === u.id).sort((a, b) => b.created_at - a.created_at).map((o) => ({
    id: o.id, items: o.items.map((i) => ({ name: i.name, qty: i.qty, image: i.image })), client: `${o.customer.first_name} ${o.customer.last_name.charAt(0)}.`, city: o.customer.city,
    amount: o.subtotal - o.discount, commission: o.commission_total, status: o.status, created_at: o.created_at,
    fulfillment: o.fulfillment ?? "HOME", seller_collected_at: o.seller_collected_at ?? null,
    commission_status: db().commissions.find((c) => c.order_id === o.id)?.status ?? "—",
  }));
}

/* ================================================================ WALLET */
export async function getWallet(token: string) {
  await wait(); const u = await auth(token); releaseDue();
  const w = wallet(u.id); persist();
  return {
    pool: centimesToPoolDisplay(w.commission_available), poolConvertibleMax: centimesToPoolFloor(w.commission_available), poolValue: w.commission_available,
    fcfa: w.fcfa_balance, pending: w.pending, pendingPool: centimesToPoolDisplay(w.pending),
  };
}
export async function listTransactions(token: string) { await wait(); const u = await auth(token); return db().wallet_transactions.filter((t) => t.user_id === u.id); }

/** POST /pool/convert — atomique et idempotent */
export async function convertPool(token: string, pool: PoolCents, idem: string) {
  await wait(450);
  const u = await auth(token); const d = db();
  requireSub(u);
  if (!Number.isSafeInteger(pool) || pool < 1) throw new ApiError("Montant de conversion invalide (minimum 0,01 POOL).", "VALIDATION");
  const key = `convert:${u.id}:${idem}`;
  if (d.idempotency.includes(key)) throw new ApiError("Cette conversion a déjà été traitée.", "DUPLICATE", 409);
  const w = wallet(u.id); const fcfaAmt = poolToCentimes(pool);
  if (fcfaAmt > w.commission_available) throw new ApiError("Solde POOL insuffisant.", "INSUFFICIENT_FUNDS");
  d.idempotency.push(key);
  w.commission_available -= fcfaAmt; w.fcfa_balance += fcfaAmt; w.updated_at = Date.now();
  const id = uniqueId("CV", (x) => d.pool_conversions.some((c) => c.id === x));
  d.pool_conversions.unshift({ id, user_id: u.id, pool_amount: pool, fcfa_amount: fcfaAmt, created_at: Date.now() });
  ledger({ user_id: u.id, type: "POOL_CONVERSION", label: `Conversion ${formatPool(pool)} → FCFA`, amount_fcfa: fcfaAmt, pool_amount: -pool, bucket: "FCFA", reference: id, status: "SUCCESS" });
  notify(u.id, "CONVERSION", "Conversion effectuée", `${formatPool(pool)} convertis en ${formatFCFA(fcfaAmt)}.`, "/portefeuille");
  audit(u.email, u.id, "POOL_CONVERSION", id, `${pool} centièmes → ${fcfaAmt} centimes`);
  persist();
  return { id, pool, fcfa: fcfaAmt };
}

export function withdrawalFee(amount: Centimes) { return Math.max(CONFIG.WITHDRAW_FEE_MIN, applyBps(amount, CONFIG.WITHDRAW_FEE_BPS)); }
/** POST /withdrawals — réserve le solde de manière atomique (pas de double retrait) */
export async function requestWithdrawal(token: string, input: { amount: Centimes; network: "MTN" | "ORANGE"; phone: string; holder: string; save: boolean; idem: string }) {
  await wait(500);
  const u = await auth(token); const d = db();
  requireSub(u);
  const phone = String(input.phone).replace(/\D/g, ""); const holder = clean(input.holder, 60);
  if (!Number.isSafeInteger(input.amount) || input.amount % 100 !== 0) throw new ApiError("Montant invalide (FCFA entiers uniquement).", "VALIDATION");
  if (input.amount < CONFIG.WITHDRAW_MIN) throw new ApiError("Montant minimum de retrait : 1 000 FCFA.", "VALIDATION");
  if (input.amount > CONFIG.WITHDRAW_MAX) throw new ApiError("Montant maximum par retrait : 500 000 FCFA.", "VALIDATION");
  if (input.network === "MTN" && !MTN_RE.test(phone)) throw new ApiError("Numéro MTN Cameroon invalide.", "VALIDATION");
  if (input.network === "ORANGE" && !ORANGE_RE.test(phone)) throw new ApiError("Numéro Orange Cameroun invalide.", "VALIDATION");
  if (holder.length < 3) throw new ApiError("Nom du titulaire requis.", "VALIDATION");
  const key = `wd:${u.id}:${input.idem}`;
  if (d.idempotency.includes(key)) throw new ApiError("Cette demande a déjà été enregistrée.", "DUPLICATE", 409);
  rateLimit(`wd:${u.id}`, DAY, 3, "Limite de 3 demandes de retrait par 24 h atteinte.");
  const w = wallet(u.id);
  if (input.amount > w.fcfa_balance) throw new ApiError("Solde FCFA disponible insuffisant. Convertissez d'abord vos POOL.", "INSUFFICIENT_FUNDS");
  d.idempotency.push(key);
  const fee = withdrawalFee(input.amount);
  w.fcfa_balance -= input.amount; w.updated_at = Date.now();
  const id = uniqueId("WD", (x) => d.withdrawals.some((q) => q.id === x));
  d.withdrawals.unshift({ id, user_id: u.id, amount: input.amount, fee, net: input.amount - fee, network: input.network, phone, holder, status: "PENDING", created_at: Date.now(), updated_at: Date.now() });
  ledger({ user_id: u.id, type: "WITHDRAWAL", label: `Retrait ${input.network === "MTN" ? "MTN MoMo" : "Orange Money"} · ${maskPhone(phone)}`, amount_fcfa: -input.amount, pool_amount: 0, bucket: "FCFA", reference: id, status: "PENDING" });
  if (input.save && !d.withdrawal_methods.some((m) => m.user_id === u.id && m.phone === phone)) d.withdrawal_methods.push({ id: nextId(), user_id: u.id, network: input.network, phone, holder, created_at: Date.now() });
  const recent = d.withdrawals.filter((x) => x.user_id === u.id && Date.now() - x.created_at < DAY).length;
  if (recent >= 3) fraud(u.id, "MULTIPLE_WITHDRAWALS", "LOW", `${recent} retraits en 24 h`);
  const otherUsersSamePhone = d.withdrawal_methods.some((m) => m.phone === phone && m.user_id !== u.id);
  if (otherUsersSamePhone) fraud(u.id, "SHARED_PAYOUT_NUMBER", "HIGH", `Numéro ${maskPhone(phone)} utilisé par plusieurs comptes`);
  notify(u.id, "WITHDRAWAL", "Retrait demandé", `Retrait #${id} de ${formatFCFA(input.amount)} en attente de traitement.`, "/retrait");
  sendEmail(u.email, "WITHDRAWAL_REQUESTED", `Retrait #${id} demandé`, `Montant : ${formatFCFA(input.amount)}\nFrais : ${formatFCFA(fee)}\nNet : ${formatFCFA(input.amount - fee)}\nRéseau : ${input.network}`);
  audit(u.email, u.id, "WITHDRAWAL_REQUEST", id, `${input.amount} centimes`);
  persist();
  return { id };
}
export async function listWithdrawals(token: string) { await wait(); const u = await auth(token); return db().withdrawals.filter((w) => w.user_id === u.id).map((w) => ({ ...w, phone: maskPhone(w.phone) })); }
export async function listWithdrawalMethods(token: string) { await wait(80); const u = await auth(token); return db().withdrawal_methods.filter((m) => m.user_id === u.id).map((m) => ({ ...m, masked: maskPhone(m.phone) })); }
export async function deleteWithdrawalMethod(token: string, id: number) { const u = await auth(token); const d = db(); d.withdrawal_methods = d.withdrawal_methods.filter((m) => !(m.id === id && m.user_id === u.id)); audit(u.email, u.id, "PAYOUT_METHOD_DELETE", `method:${id}`); persist(); }
export async function cancelWithdrawal(token: string, id: string) {
  await wait(); const u = await auth(token); const d = db();
  const w = d.withdrawals.find((x) => x.id === id && x.user_id === u.id);
  if (!w || w.status !== "PENDING") throw new ApiError("Ce retrait ne peut plus être annulé.", "INVALID_STATE");
  finalizeWithdrawal(w.id, "CANCELLED", "Annulé par l'utilisateur"); persist();
}
function finalizeWithdrawal(id: string, status: "SUCCESS" | "FAILED" | "CANCELLED", reason = "") {
  const d = db(); const w = d.withdrawals.find((x) => x.id === id)!; const u = d.users.find((x) => x.id === w.user_id)!;
  w.status = status; w.updated_at = Date.now(); if (reason) w.failure_reason = reason;
  const tx = d.wallet_transactions.find((t) => t.reference === id && t.type === "WITHDRAWAL");
  if (status === "SUCCESS") {
    if (tx) tx.status = "SUCCESS"; w.psp_ref = `PO-${randomCode(10)}`;
    notify(u.id, "WITHDRAWAL", "Retrait effectué ✅", `${formatFCFA(w.net)} envoyés sur votre compte ${w.network === "MTN" ? "MTN MoMo" : "Orange Money"}.`, "/retrait");
    sendEmail(u.email, "WITHDRAWAL_SUCCESS", `Retrait #${id} effectué`, `${formatFCFA(w.net)} ont été envoyés au ${maskPhone(w.phone)}.`);
  } else {
    if (tx) tx.status = status === "FAILED" ? "FAILED" : "CANCELLED";
    const wal = wallet(u.id); wal.fcfa_balance += w.amount; wal.updated_at = Date.now();
    ledger({ user_id: u.id, type: "WITHDRAWAL_REVERSAL", label: `Remboursement retrait #${id}`, amount_fcfa: w.amount, pool_amount: 0, bucket: "FCFA", reference: id, status: "SUCCESS" });
    notify(u.id, "WITHDRAWAL", status === "FAILED" ? "Retrait échoué" : "Retrait annulé", `${formatFCFA(w.amount)} recrédités sur votre solde FCFA. ${reason}`, "/retrait");
    if (status === "FAILED") sendEmail(u.email, "WITHDRAWAL_FAILED", `Retrait #${id} échoué`, `Motif : ${reason}. Le montant a été recrédité sur votre solde.`);
  }
}

/* ========================================================= DASHBOARD & CO */
export async function getDashboard(token: string) {
  const u = await auth(token); const d = db(); releaseDue();
  const w = wallet(u.id);
  const r = {
    name: displayName(u), email: u.email, demo: !!u.demo_seeded, subscription: subInfo(u),
    pool: centimesToPoolDisplay(w.commission_available), poolValue: w.commission_available, fcfa: w.fcfa_balance, pending: w.pending, pendingPool: centimesToPoolDisplay(w.pending), progress: poolProgress(u.id),
    sales: d.orders.filter((o) => o.affiliate_user_id === u.id && !["CANCELLED", "PAYMENT_PENDING", "PENDING"].includes(o.status)).length,
    orders: d.orders.filter((o) => !o.demo && (o.user_id === u.id || o.customer.email === u.email)).length,
    withdrawals: d.withdrawals.filter((x) => x.user_id === u.id).length,
    links: d.referral_links.filter((l) => l.user_id === u.id).length,
    recent: d.wallet_transactions.filter((t) => t.user_id === u.id).slice(0, 4),
  };
  persist(); await wait(180); return r;
}
export async function listNotifications(token: string) { await wait(100); const u = await auth(token); return db().notifications.filter((n) => n.user_id === u.id).slice(0, 60); }
export async function unreadCount(token: string) { const u = await auth(token); return db().notifications.filter((n) => n.user_id === u.id && !n.read).length; }
export async function markNotification(token: string, id: number | "all") {
  const u = await auth(token); db().notifications.forEach((n) => { if (n.user_id === u.id && (id === "all" || n.id === id)) n.read = true; }); persist();
}
export async function getReferral(token: string) {
  await wait(); const u = await auth(token); const d = db();
  const list = d.referrals.filter((r) => r.referrer_id === u.id).map((r) => { const x = d.users.find((y) => y.id === r.referred_id)!; return { id: r.id, email: maskEmail(x.email), created_at: r.created_at, status: r.status, active_seller: d.referral_links.some((l) => l.user_id === x.id) }; });
  const parent = d.referrals.find((r) => r.referred_id === u.id);
  return { code: u.referral_code, list, parent: parent ? maskEmail(d.users.find((y) => y.id === parent.referrer_id)!.email) : null };
}
export async function getProfile(token: string) {
  await wait(); const u = await auth(token); const p = profileOf(u.id);
  return { id: u.id, email: u.email, created_at: u.created_at, referral_code: u.referral_code, roles: u.roles, first_name: p.first_name, last_name: p.last_name, phone: p.phone };
}
export async function updateProfile(token: string, input: { first_name: string; last_name: string; phone: string }) {
  await wait(); const u = await auth(token); const p = profileOf(u.id);
  const phone = String(input.phone || "").replace(/\D/g, "");
  if (phone && !/^6\d{8}$/.test(phone)) throw new ApiError("Téléphone invalide (9 chiffres commençant par 6).", "VALIDATION");
  p.first_name = clean(input.first_name, 50); p.last_name = clean(input.last_name, 50); p.phone = phone;
  u.updated_at = Date.now(); audit(u.email, u.id, "PROFILE_UPDATE", `user:${u.id}`); persist();
}
export async function listSessions(token: string) {
  await wait(); const u = await auth(token); const cur = await sha256(token);
  return db().sessions.filter((s) => s.user_id === u.id).sort((a, b) => b.created_at - a.created_at).slice(0, 10).map((s) => ({ created_at: s.created_at, last_seen: s.last_seen, device: s.ua.includes("Mobile") ? "Mobile" : "Ordinateur", current: s.token_hash === cur, active: !s.revoked && s.expires_at > Date.now() }));
}
export async function revokeOtherSessions(token: string) {
  const u = await auth(token); const cur = await sha256(token);
  db().sessions.forEach((s) => { if (s.user_id === u.id && s.token_hash !== cur) s.revoked = true; });
  audit(u.email, u.id, "SESSIONS_REVOKED", `user:${u.id}`); persist();
}

/* =================================================================== DEV */
export function devOutbox(email?: string) { return db().emails.filter((e) => !email || e.to === email).slice(0, 15); }

/* ================================================================= ADMIN */
async function requireAdmin(token: string, roles: Role[] = []) {
  const u = await auth(token);
  if (!u.roles.length) throw new ApiError("Accès réservé aux administrateurs.", "FORBIDDEN", 403);
  const s = await sessionOf(token);
  if (!s?.admin_verified_until || s.admin_verified_until < Date.now()) throw new ApiError("Vérification 2FA administrateur requise.", "STEP_UP_REQUIRED", 401);
  if (roles.length && !u.roles.includes("SUPER_ADMIN") && !roles.some((r) => u.roles.includes(r))) throw new ApiError("Permission insuffisante pour cette action.", "FORBIDDEN", 403);
  return u;
}
export async function adminStatus(token: string) {
  const u = await auth(token); const s = await sessionOf(token);
  return { isAdmin: u.roles.length > 0, roles: u.roles, verified: !!s?.admin_verified_until && s.admin_verified_until > Date.now(), email: u.email };
}
const adminOtps = new Map<number, { hash: string; salt: string; exp: number; tries: number }>();
export async function adminRequestStepUp(token: string) {
  await wait(); const u = await auth(token);
  if (!u.roles.length) throw new ApiError("Accès réservé aux administrateurs.", "FORBIDDEN", 403);
  rateLimit(`admin2fa:${u.id}`, 10 * 60_000, 5, "Trop de demandes 2FA.");
  const code = randomOtp(); const salt = randHex(8);
  adminOtps.set(u.id, { hash: await sha256(`${salt}:${code}`), salt, exp: Date.now() + CONFIG.OTP_TTL_MS, tries: 0 });
  sendEmail(u.email, "SECURITY", "Code 2FA administrateur ALWENAS", `Code de confirmation administrateur : ${code}`); persist();
}
export async function adminVerifyStepUp(token: string, code: string) {
  await wait(); const u = await auth(token); const o = adminOtps.get(u.id);
  if (!o || o.exp < Date.now()) throw new ApiError("Code expiré. Demandez un nouveau code.", "EXPIRED");
  if (++o.tries > 5) throw new ApiError("Nombre maximal de tentatives atteint.", "LOCKED");
  if (!safeEqual(await sha256(`${o.salt}:${code}`), o.hash)) throw new ApiError("Code incorrect.", "WRONG_CODE");
  adminOtps.delete(u.id); const s = (await sessionOf(token))!; s.admin_verified_until = Date.now() + CONFIG.ADMIN_STEPUP_TTL_MS;
  audit(u.email, u.id, "ADMIN_2FA_OK", `user:${u.id}`); persist();
}
export async function adminStats(token: string) {
  await wait(); await requireAdmin(token); releaseDue(); const d = db();
  const real = d.orders.filter((o) => !o.demo);
  const paid = real.filter((o) => ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status));
  return {
    revenue: paid.reduce((s, o) => s + o.total, 0), orders: real.length, payments: d.payments.filter((p) => p.status === "SUCCESS").length, users: d.users.length,
    sales: d.orders.filter((o) => o.affiliate_user_id && o.status !== "CANCELLED").length,
    commissionsPending: d.commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amount, 0),
    commissionsAvailable: d.commissions.filter((c) => c.status === "AVAILABLE").reduce((s, c) => s + c.amount, 0),
    poolsDistributed: centimesToPoolDisplay(d.commissions.filter((c) => c.status === "AVAILABLE").reduce((s, c) => s + c.amount, 0)),
    withdrawn: d.withdrawals.filter((w) => w.status === "SUCCESS").reduce((s, w) => s + w.net, 0),
    pendingWithdrawals: d.withdrawals.filter((w) => w.status === "PENDING" || w.status === "PROCESSING").length,
    refunds: d.orders.filter((o) => o.status === "REFUNDED").length, products: d.products.length, stock: d.products.reduce((s, p) => s + p.stock, 0),
    lowStock: d.products.filter((p) => p.stock < 5).map((p) => ({ name: p.name, stock: p.stock })), openFraud: d.fraud_events.filter((f) => f.status === "OPEN").length,
    subscriptionRevenue: d.subscriptions.filter((s) => s.status === "SUCCESS").reduce((a, s) => a + s.amount, 0),
    activeSubscribers: d.users.filter((u) => !u.roles.length && (u.subscription_expires_at ?? 0) > Date.now()).length,
  };
}
export async function adminUsers(token: string, search = "") {
  await wait(); await requireAdmin(token, ["SUPPORT", "FINANCE"]); const d = db(); const s = search.toLowerCase();
  return d.users.filter((u) => !s || u.email.includes(s) || String(u.id).includes(s)).map((u) => {
    const w = wallet(u.id);
    return { id: u.id, email: u.email, status: u.status, roles: u.roles, created_at: u.created_at, subscription: subInfo(u).status, sub_expires: u.subscription_expires_at ?? null, last_login_at: u.last_login_at, pool: centimesToPoolDisplay(w.commission_available), fcfa: w.fcfa_balance, pending: w.pending,
      sales: d.orders.filter((o) => o.affiliate_user_id === u.id).length, referrals: d.referrals.filter((r) => r.referrer_id === u.id).length, withdrawals: d.withdrawals.filter((x) => x.user_id === u.id).length };
  });
}
export async function adminSetUserStatus(token: string, userId: number, status: "ACTIVE" | "SUSPENDED", reason: string) {
  const a = await requireAdmin(token, ["SUPPORT"]); const d = db(); const u = d.users.find((x) => x.id === userId);
  if (!u) throw new ApiError("Utilisateur introuvable.", "NOT_FOUND"); if (u.id === a.id) throw new ApiError("Action impossible sur votre propre compte.", "FORBIDDEN");
  u.status = status; if (status === "SUSPENDED") d.sessions.forEach((s) => { if (s.user_id === u.id) s.revoked = true; });
  audit(a.email, a.id, status === "SUSPENDED" ? "USER_SUSPEND" : "USER_REACTIVATE", `user:${u.id}`, reason || "—"); persist();
}
export async function adminOrders(token: string) { await wait(); await requireAdmin(token, ["ORDER_MANAGER", "SUPPORT"]); return db().orders.filter((o) => !o.demo).map((o) => ({ ...orderView(o), affiliate: db().users.find((u) => u.id === o.affiliate_user_id)?.email ?? null })); }
const TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = { PAID: ["PROCESSING", "CANCELLED"], PROCESSING: ["READY_FOR_PICKUP", "SHIPPED", "CANCELLED"], READY_FOR_PICKUP: ["DELIVERED", "CANCELLED"], SHIPPED: ["DELIVERED", "REFUNDED"], OUT_FOR_DELIVERY: ["REFUNDED"], DELIVERED: ["REFUNDED"] };
export async function adminOrderTransition(token: string, orderId: string, to: OrderStatus) {
  const a = await requireAdmin(token, to === "REFUNDED" ? ["FINANCE"] : ["ORDER_MANAGER"]); const d = db();
  const o = d.orders.find((x) => x.id === orderId); if (!o) throw new ApiError("Commande introuvable.", "NOT_FOUND");
  if (!TRANSITIONS[o.status]?.includes(to)) throw new ApiError(`Transition ${o.status} → ${to} non autorisée.`, "INVALID_STATE");
  if (to === "SHIPPED" && (o.fulfillment !== "HOME" || !!o.affiliate_user_id)) throw new ApiError("Expédition réservée aux commandes directes sans vendeur affilié.", "INVALID_STATE");
  if (to === "DELIVERED" && o.fulfillment !== "STORE" && !!o.affiliate_user_id) throw new ApiError("La livraison à domicile affiliée doit être confirmée par l'acheteur.", "INVALID_STATE");
  const now = Date.now();
  if (to === "DELIVERED") markDelivered(o, a.email);
  else { o.status = to; o.updated_at = now; o.history.push({ status: to, at: now, by: a.email }); }
  const c = d.commissions.find((x) => x.order_id === o.id);
  if (to === "READY_FOR_PICKUP") {
    if (o.fulfillment === "HOME" && o.affiliate_user_id) {
      notify(o.affiliate_user_id, "ORDER", "Article prêt : passez en boutique", `Commande #${o.id} prête. Récupérez l'article à la boutique physique, puis livrez l'acheteur.`, "/ventes");
      const seller = d.users.find((x) => x.id === o.affiliate_user_id);
      if (seller) sendEmail(seller.email, "SELLER_PICKUP", `Commande #${o.id} à collecter`, "Passez à la boutique physique récupérer l'article pour le livrer à l'acheteur. Votre commission restera en attente jusqu'à confirmation de la livraison et fin du délai de retour.");
    } else if (o.fulfillment === "STORE") sendEmail(o.customer.email, "READY_FOR_PICKUP", `Commande #${o.id} prête`, "Votre article est disponible à la boutique physique. Présentez votre référence de commande pour le récupérer.");
  }
  if (to === "SHIPPED") sendEmail(o.customer.email, "ORDER_SHIPPED", `Commande #${o.id} expédiée`, "Votre colis est en route. Le livreur vous appellera avant la livraison.");
  if (to === "CANCELLED" || to === "REFUNDED") {
    const pay = d.payments.find((p) => p.id === o.payment_id); if (pay && pay.status === "SUCCESS") pay.status = "REFUNDED";
    o.items.forEach((it) => { const p = d.products.find((x) => x.id === it.product_id); if (p) p.stock += it.qty; });
    if (c && c.status === "PENDING") {
      c.status = "CANCELLED"; const w = wallet(c.user_id); w.pending -= c.amount;
      ledger({ user_id: c.user_id, type: "COMMISSION_CANCEL", label: `Commission annulée · #${o.id} (${to === "REFUNDED" ? "remboursement" : "annulation"})`, amount_fcfa: -c.amount, pool_amount: -centimesToPoolDisplay(c.amount), bucket: "PENDING", reference: o.id, status: "SUCCESS" });
      notify(c.user_id, "COMMISSION", "Commission annulée", `La commande #${o.id} a été ${to === "REFUNDED" ? "remboursée" : "annulée"}. La commission en attente est annulée.`, "/commissions");
    }
    const refundsByEmail = d.orders.filter((x) => x.customer.email === o.customer.email && x.status === "REFUNDED").length;
    if (refundsByEmail >= 2) fraud(o.user_id, "REPEATED_REFUNDS", "MEDIUM", `${o.customer.email} : ${refundsByEmail} remboursements`);
  }
  if (o.user_id) notify(o.user_id, "ORDER", `Commande #${o.id}`, `Nouveau statut : ${to}.`, "/commandes");
  audit(a.email, a.id, `ORDER_${to}`, `order:${o.id}`); persist();
}
export async function adminCommissions(token: string) { await wait(); await requireAdmin(token, ["FINANCE"]); releaseDue(); const d = db(); return d.commissions.slice().sort((a, b) => b.created_at - a.created_at).map((c) => ({ ...c, email: d.users.find((u) => u.id === c.user_id)?.email ?? "", order_status: d.orders.find((o) => o.id === c.order_id)?.status ?? "", pool: centimesToPoolDisplay(c.amount) })); }
/** Simulation : considère le délai de remboursement comme écoulé (sandbox uniquement) */
export async function adminReleaseCommission(token: string, id: number) {
  const a = await requireAdmin(token, ["FINANCE"]); const d = db(); const c = d.commissions.find((x) => x.id === id);
  if (!c || c.status !== "PENDING") throw new ApiError("Commission non éligible.", "INVALID_STATE");
  if (d.orders.find((o) => o.id === c.order_id)?.status !== "DELIVERED") throw new ApiError("La commande doit être livrée.", "INVALID_STATE");
  releaseCommission(c); audit(a.email, a.id, "COMMISSION_RELEASE_FORCED", `commission:${id}`, "Sandbox : délai de remboursement simulé comme écoulé"); persist();
}
export async function adminWithdrawals(token: string) { await wait(); await requireAdmin(token, ["FINANCE"]); const d = db(); return d.withdrawals.map((w) => ({ ...w, phone: maskPhone(w.phone), email: d.users.find((u) => u.id === w.user_id)?.email ?? "" })); }
export async function adminWithdrawalAction(token: string, id: string, action: "PROCESS" | "SUCCESS" | "FAILED" | "CANCEL") {
  const a = await requireAdmin(token, ["FINANCE"]); await wait(action === "PROCESS" ? 200 : 700); const w = db().withdrawals.find((x) => x.id === id);
  if (!w) throw new ApiError("Retrait introuvable.", "NOT_FOUND");
  if (action === "PROCESS") { if (w.status !== "PENDING") throw new ApiError("Statut invalide.", "INVALID_STATE"); w.status = "PROCESSING"; w.updated_at = Date.now(); }
  else if (action === "CANCEL") { if (w.status !== "PENDING") throw new ApiError("Statut invalide.", "INVALID_STATE"); finalizeWithdrawal(id, "CANCELLED", "Annulé par l'administration"); }
  else { if (w.status !== "PROCESSING") throw new ApiError("Le retrait doit être en traitement.", "INVALID_STATE"); finalizeWithdrawal(id, action, action === "FAILED" ? "Rejet du prestataire (numéro non enregistré)" : ""); }
  audit(a.email, a.id, `WITHDRAWAL_${action}`, `withdrawal:${id}`); persist();
}
export async function adminProducts(token: string) { await wait(); await requireAdmin(token, ["PRODUCT_MANAGER"]); return db().products.map(toDTO); }
export async function adminUpdateProduct(token: string, id: number, patch: { price?: number; promo_price?: number | null; stock?: number; commission_bps?: number; status?: "ACTIVE" | "DRAFT" }) {
  const a = await requireAdmin(token, ["PRODUCT_MANAGER"]); const p = db().products.find((x) => x.id === id); if (!p) throw new ApiError("Produit introuvable.", "NOT_FOUND");
  const int = (n: unknown, min: number, max: number) => { if (!Number.isSafeInteger(n) || (n as number) < min || (n as number) > max) throw new ApiError("Valeur invalide.", "VALIDATION"); return n as number; };
  const before = JSON.stringify({ price: p.price, promo: p.promo_price, stock: p.stock, bps: p.commission_bps, status: p.status });
  if (patch.price !== undefined) p.price = int(patch.price, 100_00, 10_000_000_00);
  if (patch.promo_price !== undefined) p.promo_price = patch.promo_price === null ? null : int(patch.promo_price, 100_00, p.price - 1);
  if (patch.stock !== undefined) p.stock = int(patch.stock, 0, 100000);
  if (patch.commission_bps !== undefined) p.commission_bps = int(patch.commission_bps, 0, 3000);
  if (patch.status) p.status = patch.status;
  audit(a.email, a.id, "PRODUCT_UPDATE", `product:${p.id}`, `${before} → ${JSON.stringify({ price: p.price, promo: p.promo_price, stock: p.stock, bps: p.commission_bps, status: p.status })}`); persist();
}
export async function adminAudit(token: string) { await wait(); await requireAdmin(token, ["SUPPORT", "FINANCE"]); return db().audit_logs.slice(0, 150); }
export async function adminFraud(token: string) { await wait(); await requireAdmin(token, ["SUPPORT", "FINANCE"]); return db().fraud_events.slice(0, 150); }
export async function adminFraudReview(token: string, id: number, status: "REVIEWED" | "DISMISSED") {
  const a = await requireAdmin(token, ["SUPPORT", "FINANCE"]); const f = db().fraud_events.find((x) => x.id === id); if (f) f.status = status;
  audit(a.email, a.id, `FRAUD_${status}`, `fraud:${id}`); persist();
}
