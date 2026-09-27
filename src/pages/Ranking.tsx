import { Link } from "react-router-dom";
import { Trophy, ArrowUpRight } from "lucide-react";
import { useApp, useLoad } from "../lib/store";
import * as api from "../server/api";
import { Card, PageHeader, Skeleton } from "../components/ui";
import { formatPool, formatFCFA } from "../lib/money";

export function PoolRanking({ full = false }: { full?: boolean }) {
  const { token } = useApp();
  const { data: r } = useLoad(() => api.getPoolRanking(token!), [token]);
  if (!r) return <Skeleton className="h-48" />;
  return <section aria-label="Progression POOL sur 30 jours" className="space-y-4">
    {full ? <PageHeader title="Classement POOL" subtitle="Ventes livrées et commissions libérées sur les 30 derniers jours" /> : <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Vos 30 derniers jours</h2><Link to="/classement" className="flex items-center gap-1 text-sm font-semibold text-emerald-700">Classement <ArrowUpRight className="h-4 w-4" /></Link></div>}
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Niveau {r.mine.level} · {formatPool(r.mine.lifetimePool)} cumulés</p><p className="mt-1 font-display text-3xl font-extrabold text-pool-600">{formatPool(r.mine.pool)}</p><p className="mt-1 text-xs text-slate-500">Gagnés sur 30 jours · {formatFCFA(r.mine.earnedFcfa)} · place #{r.place} sur {r.total}</p></div><span className="grid h-14 w-14 place-items-center rounded-2xl pool-gradient"><Trophy className="h-7 w-7" /></span></div>
      {r.mine.next && <p className="mt-3 text-xs text-slate-600">Prochain niveau : {r.mine.next} POOL cumulés. Votre niveau et votre portefeuille ne sont pas remis à zéro après 30 jours.</p>}
    </Card>
    {full && <><h2 className="font-display font-bold">Les vendeurs les plus actifs</h2><Card><ol className="divide-y divide-slate-100">{r.leaders.map((x) => <li key={x.place} className="flex items-center gap-3 py-3 text-sm"><span className="w-8 font-bold text-amber-600">#{x.place}</span><span className="flex-1 font-semibold">{x.name}{x.isMe ? " (vous)" : ""}<span className="ml-2 text-xs font-normal text-slate-400">{x.level}</span>{x.place <= 3 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Badge top {x.place}</span>}</span><span className="font-bold text-pool-600">{formatPool(x.pool)}</span></li>)}</ol></Card><p className="text-xs text-slate-500">Les badges top 3 récompensent symboliquement les performances sur 30 jours : aucun bonus financier n'est attribué pour un niveau, un abonnement ou un parrainage. Seules les ventes réelles génèrent des commissions.</p></>}
  </section>;
}

export default function RankingPage() { return <PoolRanking full />; }