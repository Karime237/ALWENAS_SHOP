import { Link } from "react-router-dom";
import { ArrowDownToLine, ChevronRight, FlaskConical, Link2, Package, ShoppingBag, TrendingUp, Wallet, Coins, Clock, Users } from "lucide-react";
import { useApp, useLoad } from "../lib/store";
import * as api from "../server/api";
import { Card, ErrorBox, Skeleton, Stat } from "../components/ui";
import { TxRow, WalletCard } from "../components/Finance";
import { formatFCFA } from "../lib/money";
import { SubscriptionBanner } from "./Subscription";
import { PoolRanking } from "./Ranking";

const SHORTCUTS = [
  { to: "/boutique", label: "Boutique", icon: ShoppingBag, cls: "from-emerald-500 to-teal-500" },
  { to: "/liens", label: "Mes liens", icon: Link2, cls: "from-amber-400 to-orange-500" },
  { to: "/ventes", label: "Mes ventes", icon: TrendingUp, cls: "from-sky-500 to-indigo-500" },
  { to: "/portefeuille", label: "Portefeuille", icon: Wallet, cls: "from-slate-700 to-slate-900" },
  { to: "/retrait", label: "Retraits", icon: ArrowDownToLine, cls: "from-rose-500 to-pink-500" },
];

export default function Dashboard() {
  const { token } = useApp();
  const { data: d, error, loading } = useLoad(() => api.getDashboard(token!), [token]);
  if (error) return <ErrorBox text={error} />;
  if (loading || !d) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Bonjour {d.name} 👋</h1>
        </div>
        {d.demo && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200" title="Historique de ventes simulé pour la démonstration"><FlaskConical className="h-3.5 w-3.5" />Données de démonstration</span>}
      </div>

      <SubscriptionBanner />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3"><WalletCard pool={d.pool} value={d.poolValue} pendingPool={d.pendingPool} pending={d.pending} fcfa={d.fcfa} /></div>
        <div className="grid grid-cols-2 gap-3 xl:col-span-2">
          <Stat label="Ventes" value={d.sales} icon={<TrendingUp className="h-4 w-4" />} accent="bg-sky-50 text-sky-600" />
          <Stat label="Commandes" value={d.orders} icon={<Package className="h-4 w-4" />} />
          <Stat label="Commissions disponibles" value={<span className="text-base sm:text-lg">{formatFCFA(d.poolValue, { alwaysDecimals: true })}</span>} icon={<Coins className="h-4 w-4" />} accent="bg-amber-50 text-amber-600" />
          <Stat label="Commissions en attente" value={<span className="text-base sm:text-lg">{formatFCFA(d.pending)}</span>} icon={<Clock className="h-4 w-4" />} accent="bg-amber-50 text-amber-500" />
          <Stat label="Retraits" value={d.withdrawals} icon={<ArrowDownToLine className="h-4 w-4" />} />
          <Stat label="Liens actifs" value={d.links} icon={<Link2 className="h-4 w-4" />} accent="bg-emerald-50 text-emerald-600" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-amber-200 bg-amber-50/60"><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Solde POOL issu des ventes</p><p className="mt-2 font-display text-3xl font-extrabold text-pool-600">{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.pool / 100)} POOL</p><p className="mt-1 text-sm text-slate-500">Commissions disponibles · ≈ {formatFCFA(d.poolValue, { alwaysDecimals: true })}</p></Card>
        <Card className="border-emerald-200 bg-emerald-50/60"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Solde FCFA issu des ventes</p><p className="mt-2 font-display text-3xl font-extrabold text-emerald-700">{formatFCFA(d.fcfa, { alwaysDecimals: true })}</p><p className="mt-1 text-sm text-slate-500">Commissions converties, disponibles au retrait</p></Card>
      </div>
      <PoolRanking />

      <section aria-labelledby="shortcuts">
        <h2 id="shortcuts" className="mb-3 text-sm font-semibold text-slate-500">Raccourcis</h2>
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {SHORTCUTS.map((s) => (
            <Link key={s.to} to={s.to} className="group flex flex-col items-center gap-2 rounded-2xl p-1 text-center">
              <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${s.cls} text-white shadow-lg transition group-hover:-translate-y-0.5 group-hover:shadow-xl sm:h-16 sm:w-16`}><s.icon className="h-6 w-6" /></span>
              <span className="text-[11px] font-semibold leading-tight sm:text-xs">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-1 flex items-center justify-between"><h2 className="font-display font-bold">Activité récente</h2><Link to="/historique" className="text-sm font-semibold text-emerald-700">Tout voir</Link></div>
          {d.recent.length ? <ul className="divide-y divide-slate-100">{d.recent.map((t) => <TxRow key={t.id} t={t} />)}</ul> : <p className="py-8 text-center text-sm text-slate-500">Aucune opération pour le moment.</p>}
        </Card>
        <Card className="brand-gradient border-0 text-white">
          <h2 className="font-display text-lg font-bold">Gagnez sur chaque vente réelle</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {["Choisissez un produit dans la boutique", "Générez votre lien unique", "Partagez sur WhatsApp, Facebook, TikTok", "Commission créditée après livraison"].map((s, i) => (
              <li key={s} className="flex items-center gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold">{i + 1}</span>{s}</li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/boutique" className="inline-flex h-11 items-center gap-1 rounded-2xl bg-white px-4 text-sm font-bold text-emerald-700">Choisir un produit <ChevronRight className="h-4 w-4" /></Link>
            <Link to="/parrainage" className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-white/10 px-4 text-sm font-semibold ring-1 ring-white/20"><Users className="h-4 w-4" />Parrainage</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
