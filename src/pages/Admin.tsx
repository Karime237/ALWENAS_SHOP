import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Users, Package, Coins, ArrowDownToLine, Boxes, ScrollText, ShieldAlert, Lock, Search, AlertTriangle } from "lucide-react";
import { useApp, useLoad } from "../lib/store";
import * as api from "../server/api";
import type { OrderStatus } from "../server/db";
import { Button, Card, ErrorBox, Input, PageHeader, Skeleton, Stat, StatusBadge, fmtDate } from "../components/ui";
import { DevMailbox } from "../components/DevMailbox";
import { formatFCFA, formatPool } from "../lib/money";
import { cn } from "../utils/cn";

const TABS = [
  { v: "stats", l: "Tableau de bord", i: BarChart3 }, { v: "users", l: "Utilisateurs", i: Users }, { v: "orders", l: "Commandes", i: Package },
  { v: "commissions", l: "Commissions", i: Coins }, { v: "withdrawals", l: "Retraits", i: ArrowDownToLine }, { v: "products", l: "Produits", i: Boxes },
  { v: "audit", l: "Audit", i: ScrollText }, { v: "fraud", l: "Anti-fraude", i: ShieldAlert },
] as const;
type Tab = (typeof TABS)[number]["v"];

function useAct() {
  const { toast } = useApp();
  return async (fn: () => Promise<unknown>, ok: string, after?: () => void) => { try { await fn(); toast(ok); after?.(); } catch (e) { toast((e as Error).message, "error"); } };
}

export default function AdminPage() {
  const { token } = useApp();
  const status = useLoad(() => api.adminStatus(token!), [token]);
  const [tab, setTab] = useState<Tab>("stats");
  if (!status.data) return <Skeleton className="h-64" />;
  if (!status.data.isAdmin) return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <Lock className="mx-auto h-10 w-10 text-slate-400" /><h1 className="mt-3 font-display text-xl font-bold">Accès refusé</h1>
      <p className="mt-2 text-sm text-slate-500">Cette zone est réservée aux administrateurs (rôles SUPER_ADMIN, FINANCE, SUPPORT, PRODUCT_MANAGER, ORDER_MANAGER).</p>
      <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">Sandbox : connectez-vous avec <strong>admin@alwenasshop.com</strong> pour obtenir le rôle SUPER_ADMIN.</p>
      <Link to="/app"><Button variant="outline" className="mt-5">Retour</Button></Link>
    </Card>
  );
  if (!status.data.verified) return <StepUp email={status.data.email} onDone={status.reload} />;
  return (
    <div>
      <PageHeader title="Administration" subtitle={`Connecté en tant que ${status.data.roles.join(", ")} · 2FA vérifiée`} />
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => <button key={t.v} onClick={() => setTab(t.v)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition", tab === t.v ? "bg-ink text-white" : "bg-white ring-1 ring-slate-200 hover:ring-slate-300")}><t.i className="h-4 w-4" />{t.l}</button>)}
      </div>
      {tab === "stats" && <StatsTab />}{tab === "users" && <UsersTab />}{tab === "orders" && <OrdersTab />}{tab === "commissions" && <CommissionsTab />}
      {tab === "withdrawals" && <WithdrawalsTab />}{tab === "products" && <ProductsTab />}{tab === "audit" && <AuditTab />}{tab === "fraud" && <FraudTab />}
    </div>
  );
}

function StepUp({ email, onDone }: { email: string; onDone: () => void }) {
  const { token, toast } = useApp();
  const [sent, setSent] = useState(false); const [code, setCode] = useState(""); const [err, setErr] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-emerald-600" />
      <h1 className="mt-3 font-display text-xl font-bold">Vérification administrateur (2FA)</h1>
      <p className="mt-2 text-sm text-slate-500">Un second code est requis pour accéder à la console d'administration.</p>
      {err && <div className="mt-4"><ErrorBox text={err} /></div>}
      {!sent ? <Button className="mt-5 w-full" loading={loading} onClick={async () => { setLoading(true); try { await api.adminRequestStepUp(token!); setSent(true); toast("Code envoyé par e-mail"); } catch (e) { setErr((e as Error).message); } finally { setLoading(false); } }}>Recevoir un code</Button> : (
        <div className="mt-5 space-y-3">
          <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Code à 6 chiffres" className="text-center font-mono text-xl tracking-[0.4em]" aria-label="Code 2FA" />
          <Button className="w-full" loading={loading} disabled={code.length !== 6} onClick={async () => { setLoading(true); setErr(null); try { await api.adminVerifyStepUp(token!, code); onDone(); } catch (e) { setErr((e as Error).message); } finally { setLoading(false); } }}>Valider</Button>
        </div>
      )}
      <DevMailbox email={email} />
    </Card>
  );
}

function StatsTab() {
  const { token } = useApp();
  const { data: s } = useLoad(() => api.adminStats(token!), [token]);
  if (!s) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Chiffre d'affaires" value={<span className="text-base">{formatFCFA(s.revenue)}</span>} />
        <Stat label="Commandes" value={s.orders} /><Stat label="Paiements réussis" value={s.payments} /><Stat label="Utilisateurs" value={s.users} />
        <Stat label="Ventes affiliées" value={s.sales} />
        <Stat label="Commissions en attente" value={<span className="text-base">{formatFCFA(s.commissionsPending)}</span>} />
        <Stat label="Commissions disponibles" value={<span className="text-base">{formatFCFA(s.commissionsAvailable)}</span>} />
        <Stat label="POOL distribués" value={<span className="text-base text-pool-600">{formatPool(s.poolsDistributed)}</span>} />
        <Stat label="FCFA retirés" value={<span className="text-base">{formatFCFA(s.withdrawn)}</span>} />
        <Stat label="Revenus abonnements" value={<span className="text-base">{formatFCFA(s.subscriptionRevenue)}</span>} />
        <Stat label="Abonnés actifs" value={s.activeSubscribers} />
        <Stat label="Retraits en attente" value={s.pendingWithdrawals} /><Stat label="Remboursements" value={s.refunds} /><Stat label="Produits / Stock" value={`${s.products} / ${s.stock}`} />
      </div>
      {(s.lowStock.length > 0 || s.openFraud > 0) && (
        <Card className="border-amber-200 bg-amber-50/60">
          <p className="flex items-center gap-2 font-semibold text-amber-800"><AlertTriangle className="h-5 w-5" />Points d'attention</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">{s.lowStock.map((p) => <li key={p.name}>Stock faible : {p.name} ({p.stock})</li>)}{s.openFraud > 0 && <li>{s.openFraud} événement(s) de fraude à vérifier</li>}</ul>
        </Card>
      )}
    </div>
  );
}

function UsersTab() {
  const { token } = useApp(); const act = useAct(); const [q, setQ] = useState("");
  const { data, reload } = useLoad(() => api.adminUsers(token!, q), [token, q]);
  return (
    <Card className="p-0">
      <div className="border-b p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par e-mail ou ID" className="h-10 pl-9 text-sm" /></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{["ID", "E-mail", "Statut", "Abonnement", "POOL", "FCFA", "Ventes", "Filleuls", "Retraits", "Dernière connexion", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{data?.map((u) => (
          <tr key={u.id}><td className="px-4 py-3">#{u.id}</td><td className="px-4 py-3 font-medium">{u.email}{u.roles.length > 0 && <span className="ml-1 text-[10px] text-emerald-600">{u.roles.join(",")}</span>}</td><td className="px-4 py-3"><StatusBadge status={u.status} /></td>
            <td className="px-4 py-3"><StatusBadge status={u.subscription} /></td>
            <td className="px-4 py-3 tabular text-pool-600">{formatPool(u.pool)}</td><td className="px-4 py-3 tabular">{formatFCFA(u.fcfa)}</td><td className="px-4 py-3">{u.sales}</td><td className="px-4 py-3">{u.referrals}</td><td className="px-4 py-3">{u.withdrawals}</td>
            <td className="px-4 py-3 text-xs text-slate-500">{u.last_login_at ? fmtDate(u.last_login_at, true) : "—"}</td>
            <td className="px-4 py-3">{u.roles.length === 0 && (u.status === "ACTIVE" ? <Button size="sm" variant="outline" className="text-rose-600" onClick={() => { const r = prompt("Motif de la suspension ?"); if (r) act(() => api.adminSetUserStatus(token!, u.id, "SUSPENDED", r), "Utilisateur suspendu", reload); }}>Suspendre</Button> : <Button size="sm" variant="outline" onClick={() => act(() => api.adminSetUserStatus(token!, u.id, "ACTIVE", "Réactivation"), "Utilisateur réactivé", reload)}>Réactiver</Button>)}</td></tr>
        ))}</tbody></table></div>
    </Card>
  );
}

const NEXT: Partial<Record<OrderStatus, [OrderStatus, string][]>> = {
  PAID: [["PROCESSING", "Confirmer / préparer"], ["CANCELLED", "Annuler"]], PROCESSING: [["READY_FOR_PICKUP", "Prête en boutique"], ["SHIPPED", "Expédier (achat direct)"], ["CANCELLED", "Annuler"]],
  READY_FOR_PICKUP: [["DELIVERED", "Remise au client en boutique"], ["CANCELLED", "Annuler"]], SHIPPED: [["DELIVERED", "Livrée"], ["REFUNDED", "Rembourser"]], OUT_FOR_DELIVERY: [["REFUNDED", "Rembourser"]], DELIVERED: [["REFUNDED", "Rembourser"]],
};
function OrdersTab() {
  const { token } = useApp(); const act = useAct();
  const { data, reload } = useLoad(() => api.adminOrders(token!), [token]);
  if (!data) return <Skeleton className="h-64" />;
  if (!data.length) return <Card className="py-10 text-center text-sm text-slate-500">Aucune commande réelle. Passez une commande depuis la boutique (via un lien affilié pour tester l'attribution).</Card>;
  return (
    <div className="space-y-3">{data.map((o) => (
      <Card key={o.id} className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="font-semibold">#{o.id} · <span className="tabular">{formatFCFA(o.total)}</span></p><p className="text-xs text-slate-500">{o.customer.first_name} {o.customer.last_name} · {o.customer.city} · {o.customer.email} · {fmtDate(o.created_at, true)}</p></div>
          <div className="flex gap-1.5"><StatusBadge status={o.status} /><StatusBadge status={o.payment?.status ?? "PENDING"} /></div>
        </div>
        <p className="mt-2 text-sm text-slate-600">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</p>
        <p className="mt-1 text-xs text-slate-500">{o.fulfillment === "STORE" ? "Retrait par le client en boutique" : "Livraison à domicile par le vendeur"} · Paiement : {o.payment_method} · Affilié : {o.affiliate ?? "aucun"}{o.commission_total > 0 && <> · Commission : <strong className="text-pool-600">{formatFCFA(o.commission_total)}</strong></>}</p>
        {NEXT[o.status] && <div className="mt-3 flex flex-wrap gap-2">{NEXT[o.status]!.filter(([to]) => (to !== "DELIVERED" || o.fulfillment === "STORE" || !o.affiliate_user_id) && (to !== "SHIPPED" || (o.fulfillment === "HOME" && !o.affiliate_user_id)) && (to !== "READY_FOR_PICKUP" || o.fulfillment === "STORE" || !!o.affiliate_user_id)).map(([to, l]) => <Button key={to} size="sm" variant={to === "CANCELLED" || to === "REFUNDED" ? "outline" : "dark"} onClick={() => act(() => api.adminOrderTransition(token!, o.id, to), `Commande ${l.toLowerCase()}`, reload)}>{l}</Button>)}</div>}
      </Card>
    ))}</div>
  );
}

function CommissionsTab() {
  const { token } = useApp(); const act = useAct();
  const { data, reload } = useLoad(() => api.adminCommissions(token!), [token]);
  return (
    <Card className="overflow-x-auto p-0"><table className="w-full min-w-[860px] text-sm">
      <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{["ID", "Utilisateur", "Commande", "Produit", "Montant", "Taux", "POOL", "Statut", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{data?.map((c) => (
        <tr key={c.id}><td className="px-4 py-3">{c.id}</td><td className="px-4 py-3">{c.email}</td><td className="px-4 py-3">#{c.order_id}<p className="text-[10px] text-slate-400">{c.order_status}</p></td><td className="max-w-[160px] truncate px-4 py-3">{c.label}</td>
          <td className="px-4 py-3 tabular">{formatFCFA(c.amount)}</td><td className="px-4 py-3">{c.rate_label}</td><td className="px-4 py-3 tabular text-pool-600">{formatPool(c.pool)}</td><td className="px-4 py-3"><StatusBadge status={c.status} /></td>
          <td className="px-4 py-3">{c.status === "PENDING" && c.order_status === "DELIVERED" && <Button size="sm" variant="pool" onClick={() => act(() => api.adminReleaseCommission(token!, c.id), "Commission libérée", reload)} title="Sandbox : simule l'expiration du délai de 7 jours">Libérer (délai écoulé)</Button>}</td></tr>
      ))}</tbody></table>
      <p className="border-t p-3 text-xs text-slate-500">Aucune modification directe de solde n'est possible : les soldes évoluent uniquement via des écritures du registre (commissions, conversions, retraits, ajustements justifiés).</p>
    </Card>
  );
}

function WithdrawalsTab() {
  const { token } = useApp(); const act = useAct();
  const { data, reload } = useLoad(() => api.adminWithdrawals(token!), [token]);
  if (data && !data.length) return <Card className="py-10 text-center text-sm text-slate-500">Aucune demande de retrait.</Card>;
  return (
    <Card className="overflow-x-auto p-0"><table className="w-full min-w-[820px] text-sm">
      <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{["ID", "Utilisateur", "Montant", "Net", "Réseau", "Numéro", "Statut", "Date", "Actions"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{data?.map((w) => (
        <tr key={w.id}><td className="px-4 py-3 font-medium">#{w.id}</td><td className="px-4 py-3">{w.email}</td><td className="px-4 py-3 tabular">{formatFCFA(w.amount)}</td><td className="px-4 py-3 tabular">{formatFCFA(w.net)}</td><td className="px-4 py-3">{w.network}</td><td className="px-4 py-3 font-mono text-xs">{w.phone}</td><td className="px-4 py-3"><StatusBadge status={w.status} /></td><td className="px-4 py-3 text-xs text-slate-500">{fmtDate(w.created_at, true)}</td>
          <td className="px-4 py-3"><div className="flex gap-1.5">
            {w.status === "PENDING" && <><Button size="sm" variant="dark" onClick={() => act(() => api.adminWithdrawalAction(token!, w.id, "PROCESS"), "Retrait en traitement", reload)}>Traiter</Button><Button size="sm" variant="outline" onClick={() => act(() => api.adminWithdrawalAction(token!, w.id, "CANCEL"), "Retrait annulé", reload)}>Annuler</Button></>}
            {w.status === "PROCESSING" && <><Button size="sm" onClick={() => act(() => api.adminWithdrawalAction(token!, w.id, "SUCCESS"), "PSP : retrait confirmé", reload)}>PSP ✓ Succès</Button><Button size="sm" variant="danger" onClick={() => act(() => api.adminWithdrawalAction(token!, w.id, "FAILED"), "PSP : retrait échoué", reload)}>PSP ✗ Échec</Button></>}
          </div></td></tr>
      ))}</tbody></table></Card>
  );
}

function ProductsTab() {
  const { token } = useApp(); const act = useAct();
  const { data, reload } = useLoad(() => api.adminProducts(token!), [token]);
  const [edit, setEdit] = useState<Record<number, { price: string; stock: string; bps: string }>>({});
  return (
    <Card className="overflow-x-auto p-0"><table className="w-full min-w-[860px] text-sm">
      <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{["Produit", "SKU", "Prix (FCFA)", "Promo", "Stock", "Commission %", "Statut", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{data?.map((p) => {
        const e = edit[p.id] ?? { price: String(p.price / 100), stock: String(p.stock), bps: String(p.commission_bps / 100) };
        const set = (k: keyof typeof e, v: string) => setEdit({ ...edit, [p.id]: { ...e, [k]: v.replace(/[^\d.]/g, "") } });
        return (
          <tr key={p.id}><td className="px-4 py-3"><div className="flex items-center gap-2"><img src={p.images[0]} alt="" className="h-9 w-9 rounded-lg object-cover" /><span className="max-w-[160px] truncate font-medium">{p.name}</span></div></td><td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
            <td className="px-4 py-3"><Input value={e.price} onChange={(x) => set("price", x.target.value)} className="h-9 w-24 rounded-lg px-2 text-sm" aria-label="Prix" /></td>
            <td className="px-4 py-3 tabular text-xs">{p.promo_price ? formatFCFA(p.promo_price) : "—"}</td>
            <td className="px-4 py-3"><Input value={e.stock} onChange={(x) => set("stock", x.target.value)} className={cn("h-9 w-16 rounded-lg px-2 text-sm", p.stock < 5 && "border-amber-300")} aria-label="Stock" /></td>
            <td className="px-4 py-3"><Input value={e.bps} onChange={(x) => set("bps", x.target.value)} className="h-9 w-16 rounded-lg px-2 text-sm" aria-label="Commission" /></td>
            <td className="px-4 py-3"><button onClick={() => act(() => api.adminUpdateProduct(token!, p.id, { status: p.status === "ACTIVE" ? "DRAFT" : "ACTIVE" }), "Statut modifié", reload)}><StatusBadge status={p.status} /></button></td>
            <td className="px-4 py-3"><Button size="sm" variant="dark" onClick={() => act(() => api.adminUpdateProduct(token!, p.id, { price: Math.round(Number(e.price)) * 100, stock: Math.round(Number(e.stock)), commission_bps: Math.round(Number(e.bps) * 100), ...(p.promo_price && Math.round(Number(e.price)) * 100 <= p.promo_price ? { promo_price: null } : {}) }), "Produit mis à jour", reload)}>Enregistrer</Button></td></tr>
        );
      })}</tbody></table></Card>
  );
}

function AuditTab() {
  const { token } = useApp();
  const { data } = useLoad(() => api.adminAudit(token!), [token]);
  return <Card className="p-2"><ul className="divide-y divide-slate-100 text-sm">{data?.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"><span><strong className="font-mono text-xs">{a.action}</strong> · {a.target} <span className="text-slate-500">— {a.actor}</span>{a.details && <span className="block max-w-xl truncate text-xs text-slate-400">{a.details}</span>}</span><span className="text-xs text-slate-400">{fmtDate(a.at, true)}</span></li>)}</ul></Card>;
}

function FraudTab() {
  const { token } = useApp(); const act = useAct();
  const { data, reload } = useLoad(() => api.adminFraud(token!), [token]);
  if (data && !data.length) return <Card className="py-10 text-center text-sm text-slate-500">Aucun événement suspect. Les détections (auto-achat, abus OTP, numéros partagés, retraits multiples, remboursements répétés, webhooks invalides) apparaîtront ici.</Card>;
  return (
    <div className="space-y-3">{data?.map((f) => (
      <Card key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="flex items-center gap-2 font-semibold"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", f.severity === "HIGH" ? "bg-rose-100 text-rose-700" : f.severity === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>{f.severity}</span>{f.type}</p><p className="text-sm text-slate-600">{f.details}</p><p className="text-xs text-slate-400">{fmtDate(f.at, true)}{f.user_id ? ` · utilisateur #${f.user_id}` : ""}</p></div>
        <div className="flex items-center gap-2"><StatusBadge status={f.status} />{f.status === "OPEN" && <><Button size="sm" variant="outline" onClick={() => act(() => api.adminFraudReview(token!, f.id, "REVIEWED"), "Marqué vérifié", reload)}>Vérifié</Button><Button size="sm" variant="ghost" onClick={() => act(() => api.adminFraudReview(token!, f.id, "DISMISSED"), "Classé", reload)}>Classer</Button></>}</div>
      </Card>
    ))}</div>
  );
}
