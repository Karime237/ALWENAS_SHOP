import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpRight, Clock, Coins, RotateCcw, XCircle } from "lucide-react";
import { formatFCFA, formatPool, formatPoolNumber, POOL_RATE_FCFA, type Centimes, type PoolCents } from "../lib/money";
import type { LedgerEntry } from "../server/db";
import { fmtDate, StatusBadge } from "./ui";
import { cn } from "../utils/cn";

export function WalletCard({ pool, value, pendingPool, pending, fcfa, compact }: { pool: PoolCents; value: Centimes; pendingPool?: PoolCents; pending?: Centimes; fcfa?: Centimes; compact?: boolean }) {
  return (
    <div className="wallet-card relative overflow-hidden rounded-[28px] p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
      <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/10" />
      <div aria-hidden className="absolute -right-4 -top-4 h-24 w-24 rounded-full border border-white/10" />
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Mon solde</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-white/10"><Coins className="h-3.5 w-3.5" />1 POOL = {POOL_RATE_FCFA} FCFA</span>
      </div>
      <p className="relative mt-5 font-display text-[42px] font-extrabold leading-none tabular sm:text-6xl" aria-label={formatPool(pool)}>
        <span className="pool-text">{formatPoolNumber(pool)}</span> <span className="text-xl font-bold text-amber-300 sm:text-2xl">POOL</span>
      </p>
      <p className="relative mt-3 text-base text-white/70 tabular">≈ {formatFCFA(value, { alwaysDecimals: true })}</p>
      {!compact && (
        <div className="relative mt-6 grid grid-cols-2 gap-3">
          <Link to="/convertir" className="flex h-12 items-center justify-center gap-2 rounded-2xl pool-gradient text-sm font-bold text-ink shadow-lg shadow-amber-500/20 transition hover:brightness-105 active:scale-[0.98]"><ArrowLeftRight className="h-4 w-4" />CONVERTIR</Link>
          <Link to="/retrait" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-bold ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 active:scale-[0.98]"><ArrowDownToLine className="h-4 w-4" />RETIRER</Link>
        </div>
      )}
      {(pendingPool !== undefined || fcfa !== undefined) && (
        <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-sm">
          {pendingPool !== undefined && <div><p className="text-white/50">En attente</p><p className="mt-0.5 font-semibold tabular text-amber-200">{formatPool(pendingPool)}</p><p className="text-xs text-white/40 tabular">{formatFCFA(pending ?? 0)}</p></div>}
          {fcfa !== undefined && <div><p className="text-white/50">FCFA disponible</p><p className="mt-0.5 font-semibold tabular">{formatFCFA(fcfa, { alwaysDecimals: true })}</p><p className="text-xs text-white/40">retirable</p></div>}
        </div>
      )}
    </div>
  );
}

const TX_META: Record<LedgerEntry["type"], { icon: typeof Coins; cls: string }> = {
  SALE_COMMISSION: { icon: Clock, cls: "bg-amber-50 text-amber-600" },
  COMMISSION_RELEASE: { icon: Coins, cls: "bg-amber-100 text-amber-700" },
  COMMISSION_CANCEL: { icon: XCircle, cls: "bg-slate-100 text-slate-500" },
  POOL_CONVERSION: { icon: ArrowLeftRight, cls: "bg-emerald-50 text-emerald-600" },
  WITHDRAWAL: { icon: ArrowUpRight, cls: "bg-sky-50 text-sky-600" },
  WITHDRAWAL_REVERSAL: { icon: RotateCcw, cls: "bg-slate-100 text-slate-600" },
  REFUND: { icon: RotateCcw, cls: "bg-rose-50 text-rose-600" },
  ADJUSTMENT: { icon: Coins, cls: "bg-slate-100 text-slate-600" },
  BONUS: { icon: Coins, cls: "bg-amber-50 text-amber-600" },
};

export function TxRow({ t }: { t: LedgerEntry }) {
  const m = TX_META[t.type]; const Icon = m.icon;
  const isPool = t.bucket === "POOL" || t.bucket === "PENDING";
  const main = t.type === "POOL_CONVERSION" ? `${formatPool(-t.pool_amount)} → ${formatFCFA(t.amount_fcfa)}` : isPool ? `${t.pool_amount >= 0 ? "+" : ""}${formatPool(t.pool_amount)}` : `${t.amount_fcfa >= 0 ? "+" : ""}${formatFCFA(t.amount_fcfa)}`;
  return (
    <li className="flex items-center gap-3 py-3.5">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", m.cls)}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{t.label}</p>
        <p className="truncate text-xs text-slate-500">{t.reference.startsWith("ALW") ? `Commande #${t.reference}` : `Réf. ${t.reference}`} · {fmtDate(t.created_at, true)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-bold tabular", t.type === "POOL_CONVERSION" ? "text-emerald-700" : isPool ? (t.pool_amount < 0 ? "text-slate-500" : t.bucket === "PENDING" ? "text-amber-500" : "text-pool-600") : t.amount_fcfa < 0 ? "text-ink" : "text-emerald-700")}>{main}</p>
        <div className="mt-0.5 flex items-center justify-end gap-1.5">
          {isPool && t.type !== "POOL_CONVERSION" && <span className="text-[11px] text-slate-400 tabular">{formatFCFA(Math.abs(t.amount_fcfa))}</span>}
          {t.status !== "SUCCESS" ? <StatusBadge status={t.status} /> : t.bucket === "PENDING" && t.type === "SALE_COMMISSION" ? <span className="text-[11px] font-medium text-amber-600">en attente</span> : null}
        </div>
      </div>
    </li>
  );
}
