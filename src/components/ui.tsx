import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { cn } from "../utils/cn";
import { formatPool, formatFCFA, type PoolCents, type Centimes } from "../lib/money";

export function Logo({ className, dark = false, size = "md" }: { className?: string; dark?: boolean; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "h-12 w-12 text-xl" : size === "sm" ? "h-8 w-8 text-sm" : "h-9 w-9 text-base";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("relative grid place-items-center rounded-xl brand-gradient font-display font-extrabold text-white shadow-lg shadow-emerald-600/25", s)}>
        A<span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-pool-400 ring-2 ring-white" />
      </span>
      <span className={cn("font-display font-extrabold tracking-tight", size === "lg" ? "text-2xl" : "text-lg", dark ? "text-white" : "text-ink")}>
        ALWENAS <span className="text-brand-600">SHOP</span>
      </span>
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "dark" | "ghost" | "outline" | "pool" | "danger"; loading?: boolean; size?: "sm" | "md" | "lg" };
export function Button({ variant = "primary", loading, size = "md", className, children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: "brand-gradient text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:brightness-110",
    dark: "bg-ink text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20",
    ghost: "bg-transparent text-ink hover:bg-slate-100",
    outline: "border border-slate-200 bg-white text-ink hover:border-slate-300 hover:bg-slate-50",
    pool: "pool-gradient text-ink shadow-lg shadow-amber-500/30 hover:brightness-105",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  }[variant];
  const s = { sm: "h-9 px-3.5 text-sm rounded-xl", md: "h-12 px-5 text-[15px] rounded-2xl", lg: "h-14 px-7 text-base rounded-2xl" }[size];
  return (
    <button disabled={disabled || loading} className={cn("inline-flex select-none items-center justify-center gap-2 font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50", v, s, className)} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(10,16,32,0.04),0_8px_24px_-12px_rgba(10,16,32,0.08)]", className)} {...rest}>{children}</div>;
}

export function Field({ label, hint, error, children, id }: { label: string; hint?: string; error?: string | null; children: ReactNode; id?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {error ? <p className="text-xs font-medium text-rose-600" role="alert">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] text-ink placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 disabled:bg-slate-50", className)} {...rest} />;
}
export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15", className)} {...rest}>{children}</select>;
}

export function Pool({ value, className }: { value: PoolCents; className?: string }) {
  return <span className={cn("tabular font-semibold text-pool-600", className)}>{formatPool(value)}</span>;
}
export const Fcfa = ({ value, className, decimals }: { value: Centimes; className?: string; decimals?: boolean }) => <span className={cn("tabular", className)}>{formatFCFA(value, { alwaysDecimals: decimals })}</span>;

const STATUS: Record<string, [string, string]> = {
  PENDING: ["En attente", "bg-amber-50 text-amber-700 ring-amber-200"],
  PENDING_PAYMENT: ["Paiement requis", "bg-amber-50 text-amber-700 ring-amber-200"],
  PAYMENT_PENDING: ["Paiement en attente", "bg-amber-50 text-amber-700 ring-amber-200"],
  PAID: ["Payée", "bg-sky-50 text-sky-700 ring-sky-200"],
  PROCESSING: ["En traitement", "bg-indigo-50 text-indigo-700 ring-indigo-200"],
  SHIPPED: ["Expédiée", "bg-violet-50 text-violet-700 ring-violet-200"],
  READY_FOR_PICKUP: ["Prête en boutique", "bg-violet-50 text-violet-700 ring-violet-200"],
  OUT_FOR_DELIVERY: ["En livraison", "bg-sky-50 text-sky-700 ring-sky-200"],
  DELIVERED: ["Livrée", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  CANCELLED: ["Annulée", "bg-slate-100 text-slate-600 ring-slate-200"],
  REFUNDED: ["Remboursée", "bg-rose-50 text-rose-700 ring-rose-200"],
  AVAILABLE: ["Disponible", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  SUCCESS: ["Succès", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  FAILED: ["Échec", "bg-rose-50 text-rose-700 ring-rose-200"],
  ACTIVE: ["Actif", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  SUSPENDED: ["Suspendu", "bg-rose-50 text-rose-700 ring-rose-200"],
  BLOCKED: ["Bloqué", "bg-rose-50 text-rose-700 ring-rose-200"],
  OPEN: ["À vérifier", "bg-amber-50 text-amber-700 ring-amber-200"],
  REVIEWED: ["Vérifié", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  DISMISSED: ["Classé", "bg-slate-100 text-slate-600 ring-slate-200"],
  DRAFT: ["Brouillon", "bg-slate-100 text-slate-600 ring-slate-200"],
  EXEMPT: ["Exempté", "bg-sky-50 text-sky-700 ring-sky-200"],
  EXPIRED: ["Expiré", "bg-amber-50 text-amber-700 ring-amber-200"],
  NONE: ["Non abonné", "bg-slate-100 text-slate-600 ring-slate-200"],
};
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const [label, cls] = STATUS[status] ?? [status, "bg-slate-100 text-slate-600 ring-slate-200"];
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", cls, className)}>{label}</span>;
}

export function Skeleton({ className }: { className?: string }) { return <div className={cn("skeleton rounded-2xl", className)} />; }
export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">{icon}</div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function ErrorBox({ text }: { text: string }) { return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{text}</div>; }

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: string | boolean; action?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="mb-6 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {back && (
          <button onClick={() => (typeof back === "string" ? nav(back) : nav(-1))} aria-label="Retour" className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-50">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="page-in w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl safe-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Reveal({ children, delay = 0, className, as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <Tag ref={ref as never} className={cn("reveal", v && "is-visible", className)} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}

export const fmtDate = (t: number, time = false) => new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) });

export const PUBLIC_ORIGIN = "https://alwenasshop.com";
export const shareUrl = (path: string) => `${window.location.origin}${window.location.pathname}#${path}`;
export async function copyText(t: string) { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } }
export function shareLinks(url: string, text: string) {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };
}

export function Stat({ label, value, icon, accent }: { label: string; value: ReactNode; icon?: ReactNode; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {icon && <span className={cn("grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600", accent)}>{icon}</span>}
      </div>
      <p className="mt-2 font-display text-xl font-bold tabular">{value}</p>
    </Card>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M13.5 21v-7.5h2.5l.4-3H13.5V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3z" /></svg>;
}

export function TextLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return <Link to={to} className={cn("font-semibold text-brand-600 underline-offset-4 hover:underline", className)}>{children}</Link>;
}
