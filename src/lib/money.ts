/**
 * ALWENAS SHOP — Règles monétaires
 * ------------------------------------------------------------
 * - Tous les montants FCFA sont stockés en CENTIMES entiers (1 FCFA = 100 centimes)
 *   afin de représenter exactement 25,75 POOL × 550 = 14 162,50 FCFA.
 * - Les POOL sont exprimés en CENTIÈMES entiers (1,00 POOL = 100).
 * - 1 POOL = 550 FCFA  ⇒  1 centième de POOL = 550 centimes FCFA.
 * - Aucun calcul financier n'utilise de flottant : uniquement des entiers.
 * - Le ledger conserve toujours le montant FCFA exact ; le POOL n'est
 *   qu'une représentation (affichage arrondi au centième, demi supérieur).
 */

export const POOL_RATE_FCFA = 550;
/** centimes FCFA pour 1 centième de POOL */
export const CENTIMES_PER_POOL_CENT = POOL_RATE_FCFA; // 550

export type Centimes = number; // entier
export type PoolCents = number; // entier

const assertInt = (n: number) => {
  if (!Number.isSafeInteger(n)) throw new Error("Montant non entier : calcul financier refusé");
  return n;
};

export const fcfa = (wholeFcfa: number): Centimes => assertInt(Math.round(wholeFcfa)) * 100;

/** POOL (centièmes) → FCFA (centimes), exact */
export const poolToCentimes = (p: PoolCents): Centimes => assertInt(p) * CENTIMES_PER_POOL_CENT;

/** FCFA (centimes) → POOL (centièmes) arrondi demi-supérieur (affichage) */
export const centimesToPoolDisplay = (c: Centimes): PoolCents => {
  assertInt(c);
  const q = Math.floor(c / CENTIMES_PER_POOL_CENT);
  const r = c - q * CENTIMES_PER_POOL_CENT;
  return r * 2 >= CENTIMES_PER_POOL_CENT ? q + 1 : q;
};

/** FCFA (centimes) → POOL (centièmes) arrondi inférieur (maximum convertible) */
export const centimesToPoolFloor = (c: Centimes): PoolCents => Math.floor(assertInt(c) / CENTIMES_PER_POOL_CENT);

/** Pourcentage en points de base (1000 = 10 %) appliqué à un montant entier, arrondi au centime inférieur */
export const applyBps = (c: Centimes, bps: number): Centimes => Math.floor((assertInt(c) * bps) / 10000);

const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");

/** 1234550 → "12 345,50" ; entiers ronds → "12 345" (option) */
export const formatCentimes = (c: Centimes, opts: { alwaysDecimals?: boolean } = {}) => {
  assertInt(c);
  const neg = c < 0;
  const a = Math.abs(c);
  const whole = Math.floor(a / 100);
  const dec = a % 100;
  const base = group(String(whole));
  const s = dec === 0 && !opts.alwaysDecimals ? base : `${base},${String(dec).padStart(2, "0")}`;
  return (neg ? "-" : "") + s;
};

export const formatFCFA = (c: Centimes, opts?: { alwaysDecimals?: boolean }) => `${formatCentimes(c, opts)} FCFA`;

/** Toujours exactement 2 décimales, virgule française */
export const formatPoolNumber = (p: PoolCents) => {
  assertInt(p);
  const neg = p < 0;
  const a = Math.abs(p);
  return `${neg ? "-" : ""}${group(String(Math.floor(a / 100)))},${String(a % 100).padStart(2, "0")}`;
};
export const formatPool = (p: PoolCents) => `${formatPoolNumber(p)} POOL`;

/** Parse "10,5" / "10.50" → 1050 centièmes ; null si invalide ou > 2 décimales */
export const parsePoolInput = (raw: string): PoolCents | null => {
  const s = raw.replace(/\s|\u202f/g, "").replace(",", ".");
  if (!/^\d{1,9}(\.\d{0,2})?$/.test(s)) return null;
  const [w, d = ""] = s.split(".");
  return Number(w) * 100 + Number((d + "00").slice(0, 2));
};

/** Parse saisie FCFA entière ("14 162") → centimes */
export const parseFcfaInput = (raw: string): Centimes | null => {
  const s = raw.replace(/[\s\u202f.]/g, "");
  if (!/^\d{1,10}$/.test(s)) return null;
  return Number(s) * 100;
};

/** Garde uniquement les chiffres et formate avec séparateurs pour l'input */
export const maskFcfaInput = (raw: string) => {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10);
  return digits ? group(digits) : "";
};
