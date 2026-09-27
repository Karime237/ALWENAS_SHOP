import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Coins, Copy, Link2, MessageCircle, MousePointerClick, Share2, ShoppingBag, TrendingUp, Users, Info, Gift, ShieldCheck } from "lucide-react";
import { useApp, useLoad } from "../lib/store";
import * as api from "../server/api";
import { Button, Card, Empty, FacebookIcon, PageHeader, Skeleton, Stat, StatusBadge, copyText, fmtDate, shareLinks, shareUrl } from "../components/ui";
import { formatFCFA, formatPool, centimesToPoolDisplay } from "../lib/money";

export function SalesPage() {
  const { token, toast } = useApp();
  const { data, reload } = useLoad(() => api.listSales(token!), [token]);
  const total = data?.filter((s) => s.status !== "CANCELLED").reduce((a, s) => a + s.amount, 0) ?? 0;
  const com = data?.filter((s) => s.status !== "CANCELLED" && s.status !== "REFUNDED").reduce((a, s) => a + s.commission, 0) ?? 0;
  return (
    <div>
      <PageHeader title="Mes ventes" subtitle="Les commandes attribuées à vos liens" />
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="Ventes" value={data?.length ?? "—"} />
        <Stat label="Montant vendu" value={<span className="text-base">{formatFCFA(total)}</span>} />
        <Stat label="Commissions" value={<span className="text-base text-pool-600">{formatPool(centimesToPoolDisplay(com))}</span>} />
      </div>
      {!data ? <Skeleton className="h-64" /> : data.length === 0 ? <Empty icon={<TrendingUp className="h-6 w-6" />} title="Pas encore de vente" text="Générez un lien produit et partagez-le pour réaliser votre première vente." action={<Link to="/boutique"><Button>Choisir un produit</Button></Link>} /> : (
        <ul className="space-y-3">
          {data.map((s) => (
            <li key={s.id}><Card className="flex items-center gap-4 p-4">
              <img src={s.items[0].image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.items.map((i) => i.name).join(", ")}</p>
                <p className="text-xs text-slate-500">{s.client} · {s.city} · {fmtDate(s.created_at)} · {s.fulfillment === "STORE" ? "Retrait boutique" : "Livraison vendeur"}</p>
                <div className="mt-1 flex flex-wrap gap-1.5"><StatusBadge status={s.status} />{s.commission_status !== "—" && <StatusBadge status={s.commission_status} />}</div>
                {s.fulfillment === "HOME" && s.status === "READY_FOR_PICKUP" && <div className="mt-2"><p className="mb-2 text-xs font-semibold text-amber-700">Article prêt : passez à la boutique physique, récupérez-le puis livrez l'acheteur.</p><Button size="sm" onClick={async () => { try { await api.sellerCollectOrder(token!, s.id); toast("Collecte enregistrée. Livrez l'acheteur."); reload(); } catch (e) { toast((e as Error).message, "error"); } }}>J'ai récupéré l'article</Button></div>}
                {s.status === "OUT_FOR_DELIVERY" && <p className="mt-2 text-xs font-medium text-sky-700">En livraison : l'acheteur confirmera la réception de sa commande.</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular">{formatFCFA(s.amount)}</p>
                <p className="text-xs font-semibold text-pool-600 tabular">+{formatPool(centimesToPoolDisplay(s.commission))}</p>
                <p className="text-[11px] text-slate-400 tabular">Commission : {formatFCFA(s.commission)}</p>
              </div>
            </Card></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CommissionsPage() {
  const { token } = useApp();
  const { data } = useLoad(() => api.listCommissions(token!), [token]);
  const sum = (st: string) => data?.filter((c) => c.status === st).reduce((a, c) => a + c.amount, 0) ?? 0;
  return (
    <div>
      <PageHeader title="Commissions" subtitle="Montants exacts en FCFA, équivalent POOL affiché" />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Disponibles" value={<span className="text-base text-pool-600">{formatPool(centimesToPoolDisplay(sum("AVAILABLE")))}</span>} icon={<Coins className="h-4 w-4" />} accent="bg-amber-50 text-amber-600" />
        <Stat label="En attente" value={<span className="text-base">{formatFCFA(sum("PENDING"))}</span>} />
        <Stat label="Annulées" value={<span className="text-base text-slate-400">{formatFCFA(sum("CANCELLED"))}</span>} />
      </div>
      <p className="mb-4 flex items-start gap-2 rounded-2xl bg-sky-50 p-3 text-xs text-sky-800"><Info className="mt-0.5 h-4 w-4 shrink-0" />Une commission est créée <strong>en attente</strong> dès que le paiement est confirmé, puis devient <strong>disponible</strong> 7 jours après la livraison (délai de remboursement). Elle est annulée si la commande est annulée ou remboursée avant.</p>
      {!data ? <Skeleton className="h-64" /> : data.length === 0 ? <Empty icon={<Coins className="h-6 w-6" />} title="Aucune commission" /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3 font-semibold">Commande</th><th className="px-4 py-3 font-semibold">Produit</th><th className="px-4 py-3 font-semibold">Taux</th><th className="px-4 py-3 text-right font-semibold">Montant</th><th className="px-4 py-3 text-right font-semibold">POOL</th><th className="px-4 py-3 font-semibold">Statut</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{data.map((c) => (
              <tr key={c.id}><td className="px-4 py-3 font-medium">#{c.order_id}<p className="text-[11px] font-normal text-slate-400">{fmtDate(c.created_at)}</p></td><td className="max-w-[180px] truncate px-4 py-3">{c.label}</td><td className="px-4 py-3">{c.rate_label}</td><td className="px-4 py-3 text-right tabular">{formatFCFA(c.amount)}</td><td className="px-4 py-3 text-right font-semibold text-pool-600 tabular">{formatPool(centimesToPoolDisplay(c.amount))}</td><td className="px-4 py-3"><StatusBadge status={c.status} />{c.status === "PENDING" && c.release_at && <p className="mt-0.5 text-[10px] text-slate-400">dispo. le {fmtDate(c.release_at)}</p>}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function LinksPage() {
  const { token, toast } = useApp();
  const { data } = useLoad(() => api.listAffiliateLinks(token!), [token]);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (code: string) => { if (await copyText(shareUrl(`/r/${code}`))) { setCopied(code); toast("Lien copié !"); setTimeout(() => setCopied(null), 2000); } };
  const totals = (data ?? []).reduce((a, l) => ({ clicks: a.clicks + l.clicks, orders: a.orders + l.orders, com: a.com + l.commission_amount }), { clicks: 0, orders: 0, com: 0 });
  return (
    <div>
      <PageHeader title="Mes liens de vente" subtitle="Partagez, suivez, gagnez" action={<Link to="/boutique"><Button size="sm"><Link2 className="h-4 w-4" />Nouveau lien</Button></Link>} />
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="Clics" value={totals.clicks} icon={<MousePointerClick className="h-4 w-4" />} />
        <Stat label="Commandes" value={totals.orders} icon={<ShoppingBag className="h-4 w-4" />} />
        <Stat label="Gains" value={<span className="text-base text-pool-600">{formatPool(centimesToPoolDisplay(totals.com))}</span>} icon={<Coins className="h-4 w-4" />} accent="bg-amber-50 text-amber-600" />
      </div>
      {!data ? <Skeleton className="h-64" /> : data.length === 0 ? <Empty icon={<Link2 className="h-6 w-6" />} title="Aucun lien pour l'instant" text="Ouvrez un produit dans la boutique puis touchez « Générer mon lien »." action={<Link to="/boutique"><Button>Aller à la boutique</Button></Link>} /> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((l) => {
            const url = shareUrl(`/r/${l.code}`);
            const s = shareLinks(url, `🔥 ${l.product.name} à ${formatFCFA(l.product.final_price)} sur ALWENAS SHOP 👉`);
            return (
              <li key={l.id}><Card className="p-4">
                <div className="flex items-center gap-3">
                  <img src={l.product.images[0]} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1"><Link to={`/produit/${l.product.slug}`} className="line-clamp-1 text-sm font-semibold">{l.product.name}</Link><p className="font-mono text-xs text-slate-500">alwenasshop.com/r/{l.code}</p></div>
                  <StatusBadge status={l.status} />
                </div>
                <dl className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
                  <div><dt className="text-[10px] text-slate-500">Clics</dt><dd className="text-sm font-bold tabular">{l.clicks}</dd></div>
                  <div><dt className="text-[10px] text-slate-500">Commandes</dt><dd className="text-sm font-bold tabular">{l.orders}</dd></div>
                  <div><dt className="text-[10px] text-slate-500">Vendu</dt><dd className="text-xs font-bold tabular">{formatFCFA(l.sales_amount)}</dd></div>
                  <div><dt className="text-[10px] text-slate-500">Commission</dt><dd className="text-xs font-bold text-pool-600 tabular">{formatFCFA(l.commission_amount)}</dd></div>
                </dl>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <button onClick={() => copy(l.code)} className="flex flex-col items-center gap-1 rounded-xl bg-ink py-2 text-[10px] font-bold text-white">{copied === l.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}COPIER</button>
                  <a href={s.whatsapp} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-xl bg-[#25D366]/10 py-2 text-[10px] font-bold text-[#128C7E]"><MessageCircle className="h-4 w-4" />WHATSAPP</a>
                  <a href={s.facebook} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-xl bg-[#1877F2]/10 py-2 text-[10px] font-bold text-[#1877F2]"><FacebookIcon className="h-4 w-4" />FACEBOOK</a>
                  <button onClick={() => navigator.share ? navigator.share({ title: l.product.name, url }).catch(() => {}) : copy(l.code)} className="flex flex-col items-center gap-1 rounded-xl bg-slate-100 py-2 text-[10px] font-bold"><Share2 className="h-4 w-4" />PARTAGER</button>
                </div>
              </Card></li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ReferralPage() {
  const { token, toast } = useApp();
  const { data } = useLoad(() => api.getReferral(token!), [token]);
  if (!data) return <Skeleton className="h-72" />;
  const url = shareUrl(`/?parrain=${data.code}`);
  const s = shareLinks(url, "Rejoins-moi sur ALWENAS SHOP : achète malin et gagne des commissions sur tes ventes 👉");
  return (
    <div className="space-y-5">
      <PageHeader title="Parrainage" subtitle="Faites grandir votre réseau de vendeurs" />
      <Card className="brand-gradient border-0 p-6 text-white">
        <p className="text-sm text-white/70">Votre code de parrainage</p>
        <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.2em]">{data.code}</p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 p-2 pl-4 ring-1 ring-white/20"><span className="min-w-0 flex-1 truncate font-mono text-xs">{url}</span><button onClick={async () => { if (await copyText(url)) toast("Lien de parrainage copié"); }} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-700">Copier</button></div>
        <div className="mt-3 flex gap-2"><a href={s.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold"><MessageCircle className="h-4 w-4" />WhatsApp</a><a href={s.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold"><FacebookIcon className="h-4 w-4" />Facebook</a></div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Filleuls confirmés" value={data.list.filter((x) => x.status === "ACTIVE").length} icon={<Users className="h-4 w-4" />} />
        <Stat label="Filleuls vendeurs actifs" value={data.list.filter((x) => x.active_seller).length} icon={<TrendingUp className="h-4 w-4" />} />
        <Stat label="Parrain" value={<span className="text-sm">{data.parent ?? "—"}</span>} icon={<Gift className="h-4 w-4" />} />
      </div>
      <Card className="flex items-start gap-3 bg-slate-50">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <p className="text-sm text-slate-600"><strong className="text-ink">Invitation obligatoire :</strong> un nouveau membre doit saisir le code d'un membre actif ou suivre son lien pour s'inscrire. Cette relation facilite l'accompagnement. <strong>Aucune somme n'est versée pour une inscription ou un paiement de 1 500 FCFA.</strong> Seules les ventes réelles réalisées via <em>vos propres liens produits</em> génèrent des commissions.</p>
      </Card>
      <Card>
        <h2 className="mb-2 font-display font-bold">Personnes parrainées</h2>
        {data.list.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Personne pour l'instant. Partagez votre lien !</p> : (
          <ul className="divide-y divide-slate-100">{data.list.map((r) => <li key={r.id} className="flex items-center justify-between py-3 text-sm"><div><p className="font-semibold">{r.email}</p><p className="text-xs text-slate-500">Inscrit le {fmtDate(r.created_at)} {r.active_seller && "· vendeur actif"}</p></div><StatusBadge status={r.status} /></li>)}</ul>
        )}
      </Card>
    </div>
  );
}
