import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2, Smartphone, CreditCard, Lock, CheckCircle2, XCircle, FlaskConical, Loader2, Package, ChevronRight, Truck, Store } from "lucide-react";
import { useApp, useLoad, deviceId } from "../lib/store";
import * as api from "../server/api";
import type { PaymentProvider } from "../server/db";
import { Button, Card, Empty, ErrorBox, Field, Input, PageHeader, Select, Skeleton, StatusBadge, fmtDate } from "../components/ui";
import { formatFCFA } from "../lib/money";
import { cn } from "../utils/cn";

const GUEST_KEY = "alw_guest_orders";
const guestOrders = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(GUEST_KEY) || "{}"); } catch { return {}; } };
const saveGuest = (id: string, key: string) => localStorage.setItem(GUEST_KEY, JSON.stringify({ ...guestOrders(), [id]: key }));

function Summary({ subtotal, delivery, discount, total, children }: { subtotal: number; delivery: number; discount: number; total: number; children?: React.ReactNode }) {
  return (
    <Card className="space-y-3">
      <h2 className="font-display font-bold">Résumé</h2>
      {children}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-slate-500">Sous-total</dt><dd className="tabular">{formatFCFA(subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Livraison</dt><dd className="tabular">{delivery === 0 && subtotal > 0 ? <span className="font-semibold text-emerald-600">Offerte</span> : formatFCFA(delivery)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Réduction</dt><dd className="tabular text-emerald-600">{discount ? `-${formatFCFA(discount)}` : "—"}</dd></div>
        <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold"><dt>TOTAL</dt><dd className="font-display tabular">{formatFCFA(total)}</dd></div>
      </dl>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><Lock className="h-3 w-3" />Prix recalculés par le serveur à partir du catalogue officiel.</p>
    </Card>
  );
}

export function CartPage() {
  const { refreshCart } = useApp();
  const { data, loading, setData } = useLoad(() => api.getCart(deviceId()), []);
  const upd = async (id: number, q: number) => { const r = await api.updateCart(deviceId(), id, q); setData(r); refreshCart(); };
  if (loading || !data) return <Skeleton className="h-64" />;
  return (
    <div>
      <PageHeader title="Mon panier" subtitle={`${data.count} article(s)`} back />
      {data.lines.length === 0 ? <Empty icon={<ShoppingBag className="h-6 w-6" />} title="Votre panier est vide" text="Découvrez nos produits et profitez de la livraison rapide partout au Cameroun." action={<Link to="/boutique"><Button>Aller à la boutique</Button></Link>} /> : (
        <div className="grid gap-6 lg:grid-cols-3">
          <ul className="space-y-3 lg:col-span-2">
            {data.lines.map((l) => (
              <li key={l.product.id}><Card className="flex gap-4 p-3 sm:p-4">
                <Link to={`/produit/${l.product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100"><img src={l.product.images[0]} alt={l.product.name} className="h-full w-full object-cover" /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2"><Link to={`/produit/${l.product.slug}`} className="line-clamp-2 text-sm font-semibold">{l.product.name}</Link><button onClick={() => upd(l.product.id, 0)} aria-label="Retirer" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>
                  <p className="text-xs text-slate-500 tabular">{formatFCFA(l.unit_price)} / unité</p>
                  {l.qty < l.requested && <p className="text-xs font-medium text-amber-600">Stock limité : quantité ajustée à {l.qty}</p>}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-xl border border-slate-200">
                      <button onClick={() => upd(l.product.id, l.qty - 1)} className="grid h-9 w-9 place-items-center" aria-label="Diminuer"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-7 text-center text-sm font-bold tabular">{l.qty}</span>
                      <button onClick={() => upd(l.product.id, l.qty + 1)} className="grid h-9 w-9 place-items-center" aria-label="Augmenter"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <p className="font-display font-bold tabular">{formatFCFA(l.line_total)}</p>
                  </div>
                </div>
              </Card></li>
            ))}
          </ul>
          <div className="space-y-3">
            <Summary subtotal={data.subtotal} delivery={data.delivery} discount={data.discount} total={data.total} />
            <p className="px-1 text-xs text-slate-500">Livraison estimée pour Douala. Elle sera recalculée selon votre ville.</p>
            <Link to="/checkout"><Button size="lg" className="w-full">Passer la commande <ChevronRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}

const PAY: { v: PaymentProvider; label: string; sub: string; cls: string }[] = [
  { v: "MTN_MOMO", label: "MTN Mobile Money", sub: "Validation par *126#", cls: "bg-[#ffcc00] text-ink" },
  { v: "ORANGE_MONEY", label: "Orange Money", sub: "Validation par #150#", cls: "bg-[#ff7900] text-white" },
  { v: "CARD", label: "Carte bancaire", sub: "Visa / Mastercard via PSP", cls: "bg-ink text-white" },
];

export function CheckoutPage() {
  const { me, token, refreshCart } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ first_name: "", last_name: "", phone: "", email: me?.email ?? "", region: "Littoral", city: "Douala", district: "", address: "", notes: "" });
  const [provider, setProvider] = useState<PaymentProvider>("MTN_MOMO");
  const [fulfillment, setFulfillment] = useState<"HOME" | "STORE">("HOME");
  const [promo, setPromo] = useState(""); const [appliedPromo, setApplied] = useState("");
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof api.quoteCheckout>> | null>(null);
  const [err, setErr] = useState<string | null>(null); const [promoErr, setPromoErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (token) api.getProfile(token).then((p) => setF((x) => ({ ...x, first_name: x.first_name || p.first_name, last_name: x.last_name || p.last_name, phone: x.phone || p.phone, email: x.email || p.email }))); }, [token]);
  useEffect(() => { const t = setTimeout(() => api.quoteCheckout(deviceId(), f.city, appliedPromo, f.email, fulfillment).then((q) => { setQuote(q); setPromoErr(null); }).catch((e) => { setPromoErr(e.message); setApplied(""); }), 250); return () => clearTimeout(t); }, [f.city, appliedPromo, f.email, fulfillment]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (loading) return; setErr(null); setLoading(true);
    try {
      const r = await api.createOrder({ cartId: deviceId(), device: deviceId(), token, customer: f, provider, promo: appliedPromo, fulfillment });
      saveGuest(r.orderId, r.guestKey); refreshCart();
      nav(`/paiement/${r.orderId}`, { replace: true });
    } catch (e) { setErr((e as Error).message); window.scrollTo({ top: 0, behavior: "smooth" }); } finally { setLoading(false); }
  };
  if (quote && quote.lines.length === 0) return <Empty icon={<ShoppingBag className="h-6 w-6" />} title="Votre panier est vide" action={<Link to="/boutique"><Button>Aller à la boutique</Button></Link>} />;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3" noValidate>
      <div className="space-y-5 lg:col-span-2">
        <PageHeader title="Paiement" subtitle="Aucun compte requis — vos informations restent confidentielles" back="/panier" />
        {err && <ErrorBox text={err} />}
        <Card className="space-y-4">
          <h2 className="font-display font-bold">Vos informations</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" id="ln"><Input id="ln" autoComplete="family-name" value={f.last_name} onChange={set("last_name")} required /></Field>
            <Field label="Prénom" id="fn"><Input id="fn" autoComplete="given-name" value={f.first_name} onChange={set("first_name")} required /></Field>
            <Field label="Téléphone" id="ph" hint="9 chiffres, ex. 677123456"><Input id="ph" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 9) })} placeholder="6XXXXXXXX" required /></Field>
            <Field label="E-mail" id="em"><Input id="em" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value.replace(/\s/g, "") })} required /></Field>
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display font-bold">Comment récupérer votre commande ?</h2>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Mode de remise">
            <button type="button" role="radio" aria-checked={fulfillment === "HOME"} onClick={() => setFulfillment("HOME")} className={cn("flex items-center gap-3 rounded-2xl border-2 p-4 text-left", fulfillment === "HOME" ? "border-emerald-500 bg-emerald-50" : "border-slate-200")}><Truck className="h-6 w-6 text-emerald-600" /><span><strong className="block text-sm">Livraison à domicile</strong><small className="text-slate-500">Le vendeur récupère l'article en boutique et vous livre.</small></span></button>
            <button type="button" role="radio" aria-checked={fulfillment === "STORE"} onClick={() => setFulfillment("STORE")} className={cn("flex items-center gap-3 rounded-2xl border-2 p-4 text-left", fulfillment === "STORE" ? "border-emerald-500 bg-emerald-50" : "border-slate-200")}><Store className="h-6 w-6 text-emerald-600" /><span><strong className="block text-sm">Retrait en boutique</strong><small className="text-slate-500">Gratuit. Présentez votre référence de commande.</small></span></button>
          </div>
          {fulfillment === "HOME" && <><h3 className="text-sm font-semibold">Adresse de livraison</h3><div className="grid gap-4 sm:grid-cols-2">
            <Field label="Région" id="rg"><Select id="rg" value={f.region} onChange={set("region")}>{api.REGIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
            <Field label="Ville" id="ct"><Input id="ct" autoComplete="address-level2" value={f.city} onChange={set("city")} required /></Field>
            <Field label="Quartier" id="qt"><Input id="qt" value={f.district} onChange={set("district")} placeholder="Ex. Bonamoussadi" required /></Field>
            <Field label="Adresse" id="ad"><Input id="ad" autoComplete="street-address" value={f.address} onChange={set("address")} placeholder="Rue, repère, immeuble…" required /></Field>
          </div></>}
          <Field label="Informations supplémentaires" id="nt"><textarea id="nt" value={f.notes} onChange={set("notes")} rows={2} placeholder="Ex. appeler avant de livrer, derrière la pharmacie…" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[15px] focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" /></Field>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display font-bold">Moyen de paiement</h2>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
            {PAY.map((p) => (
              <button type="button" role="radio" aria-checked={provider === p.v} key={p.v} onClick={() => setProvider(p.v)} className={cn("flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition", provider === p.v ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 hover:border-slate-300")}>
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", p.cls)}>{p.v === "CARD" ? <CreditCard className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}</span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{p.label}</span><span className="block text-[11px] text-slate-500">{p.sub}</span></span>
              </button>
            ))}
          </div>
          {provider !== "CARD" && <p className="text-xs text-slate-500">Le numéro de téléphone ci-dessus doit être un numéro {provider === "MTN_MOMO" ? "MTN" : "Orange"} : une demande de paiement lui sera envoyée.</p>}
        </Card>
      </div>
      <div className="space-y-3 lg:pt-[72px]">
        {quote ? (
          <Summary subtotal={quote.subtotal} delivery={quote.delivery} discount={quote.discount} total={quote.total}>
            <ul className="space-y-2">{quote.lines.map((l) => <li key={l.product.id} className="flex items-center gap-3 text-sm"><img src={l.product.images[0]} alt="" className="h-11 w-11 rounded-xl object-cover" /><span className="min-w-0 flex-1"><span className="line-clamp-1 font-medium">{l.product.name}</span><span className="text-xs text-slate-500">Qté {l.qty}</span></span><span className="tabular">{formatFCFA(l.line_total)}</span></li>)}</ul>
            <div className="flex gap-2 border-t border-slate-100 pt-3">
              <Input value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder="Code promo" aria-label="Code promo" className="h-10 rounded-xl text-sm" />
              <Button type="button" size="sm" variant="outline" className="h-10" onClick={() => setApplied(promo)}>Appliquer</Button>
            </div>
            {promoErr ? <p className="text-xs text-rose-600">{promoErr}</p> : <p className="text-[11px] text-slate-400">Première commande ? Essayez <strong>BIENVENUE10</strong></p>}
          </Summary>
        ) : <Skeleton className="h-72" />}
        <Button type="submit" size="lg" className="w-full" loading={loading}><Lock className="h-4 w-4" />Payer {quote ? formatFCFA(quote.total) : ""}</Button>
        <p className="text-center text-[11px] text-slate-400">En validant, vous acceptez les <Link to="/legal/vente" className="underline">conditions de vente</Link>.</p>
      </div>
    </form>
  );
}

export function PaymentPage() {
  const { id = "" } = useParams();
  const { token, toast } = useApp();
  const guestKey = guestOrders()[id] ?? null;
  const { data: order, error, reload } = useLoad(() => api.getOrder(id, { token, guestKey }), [id]);
  const [sim, setSim] = useState<"SUCCESS" | "FAILED" | null>(null);
  const confirm = async (o: "SUCCESS" | "FAILED") => { setSim(o); try { await api.sandboxPspConfirm(order!.payment_id, o); reload(); } catch (e) { toast((e as Error).message, "error"); } finally { setSim(null); } };
  if (error) return <ErrorBox text={error} />;
  if (!order) return <Skeleton className="h-80" />;
  const pending = order.status === "PAYMENT_PENDING";
  const ok = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status);
  const provider = PAY.find((p) => p.v === order.payment_method)!;

  return (
    <div className="mx-auto max-w-lg">
      <Card className="p-6 text-center sm:p-8">
        {pending && <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-amber-50 text-amber-500"><Smartphone className="h-8 w-8" /></div>
          <h1 className="mt-4 font-display text-xl font-bold">Validez le paiement sur votre téléphone</h1>
          <p className="mt-2 text-sm text-slate-500">Une demande de <strong className="text-ink">{formatFCFA(order.total)}</strong> a été envoyée via {provider.label}. {order.payment_method === "MTN_MOMO" ? "Composez *126# si la notification n'apparaît pas." : order.payment_method === "ORANGE_MONEY" ? "Composez #150# si la notification n'apparaît pas." : ""}</p>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-amber-600"><Loader2 className="h-4 w-4 animate-spin" />En attente de confirmation du prestataire…</p>
        </>}
        {ok && <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
          <h1 className="mt-4 font-display text-xl font-bold">Commande confirmée 🎉</h1>
          <p className="mt-2 text-sm text-slate-500">Paiement confirmé par le serveur. Un e-mail de confirmation a été envoyé à {order.customer.email}.</p>
        </>}
        {order.status === "CANCELLED" && <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-rose-50 text-rose-600"><XCircle className="h-8 w-8" /></div>
          <h1 className="mt-4 font-display text-xl font-bold">Paiement non abouti</h1>
          <p className="mt-2 text-sm text-slate-500">Aucun montant n'a été débité. Le stock a été libéré ; vous pouvez recommencer.</p>
          <Link to="/boutique"><Button className="mt-5">Retour à la boutique</Button></Link>
        </>}
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Commande</span><span className="font-semibold">#{order.id}</span></div>
          <div className="mt-1 flex justify-between"><span className="text-slate-500">Statut</span><StatusBadge status={order.status} /></div>
          <div className="mt-1 flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold tabular">{formatFCFA(order.total)}</span></div>
        </div>
        {ok && <div className="mt-5 grid gap-2 sm:grid-cols-2"><Link to={`/commandes/${order.id}`}><Button variant="outline" className="w-full"><Package className="h-4 w-4" />Suivre ma commande</Button></Link><Link to="/boutique"><Button className="w-full">Continuer mes achats</Button></Link></div>}
      </Card>
      {pending && (
        <Card className="mt-4 border-dashed border-amber-300 bg-amber-50/60">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><FlaskConical className="h-4 w-4" />Simulateur prestataire de paiement (sandbox)</p>
          <p className="mt-1 text-xs text-amber-800/80">En production, le PSP notifie le serveur via un webhook signé (HMAC). Simulez sa réponse :</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" loading={sim === "SUCCESS"} disabled={!!sim} onClick={() => confirm("SUCCESS")}>Paiement réussi</Button>
            <Button size="sm" variant="outline" loading={sim === "FAILED"} disabled={!!sim} onClick={() => confirm("FAILED")}>Paiement échoué</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const TIMELINE = ["PAID", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
export function OrdersPage() {
  const { token } = useApp();
  const { data, loading } = useLoad(async () => {
    const mine = await api.listMyOrders(token!);
    const g = guestOrders();
    const extra = await Promise.all(Object.entries(g).filter(([id]) => !mine.some((o) => o.id === id)).map(([id, k]) => api.getOrder(id, { guestKey: k }).catch(() => null)));
    return [...mine, ...(extra.filter(Boolean) as typeof mine)].sort((a, b) => b.created_at - a.created_at);
  }, [token]);
  return (
    <div>
      <PageHeader title="Mes commandes" subtitle="Suivez vos achats en temps réel" />
      {loading ? <Skeleton className="h-48" /> : !data?.length ? <Empty icon={<Package className="h-6 w-6" />} title="Aucune commande" text="Vos achats apparaîtront ici." action={<Link to="/boutique"><Button>Découvrir la boutique</Button></Link>} /> : (
        <ul className="space-y-3">
          {data.map((o) => (
            <li key={o.id}><Link to={`/commandes/${o.id}`}><Card className="flex items-center gap-4 transition hover:shadow-md">
              <img src={o.items[0].image} alt="" className="h-16 w-16 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">#{o.id}</p><p className="truncate text-xs text-slate-500">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</p><p className="mt-1 text-xs text-slate-400">{fmtDate(o.created_at)}</p></div>
              <div className="text-right"><p className="font-display font-bold tabular">{formatFCFA(o.total)}</p><StatusBadge status={o.status} className="mt-1" /></div>
            </Card></Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const { token, toast } = useApp();
  const { data: o, error, reload } = useLoad(() => api.getOrder(id, { token, guestKey: guestOrders()[id] ?? null }), [id]);
  const [deliveryCode, setDeliveryCode] = useState("");
  const [deliverySent, setDeliverySent] = useState(false);
  if (error) return <ErrorBox text={error} />;
  if (!o) return <Skeleton className="h-80" />;
  const idx = TIMELINE.indexOf(o.status as (typeof TIMELINE)[number]);
  return (
    <div className="space-y-5">
      <PageHeader title={`Commande #${o.id}`} subtitle={fmtDate(o.created_at, true)} back action={<StatusBadge status={o.status} />} />
      {idx >= 0 && (
        <Card><ol className={cn("grid gap-2", o.fulfillment === "STORE" ? "grid-cols-4" : "grid-cols-5")}>
          {TIMELINE.filter((s) => o.fulfillment !== "STORE" || s !== "OUT_FOR_DELIVERY").map((s) => <li key={s} className="text-center"><div className={cn("mx-auto h-2 rounded-full", TIMELINE.indexOf(s) <= idx ? "brand-gradient" : "bg-slate-200")} /><p className={cn("mt-2 text-[10px] font-semibold sm:text-xs", TIMELINE.indexOf(s) <= idx ? "text-emerald-700" : "text-slate-400")}>{{ PAID: "Payée", PROCESSING: "Préparation", READY_FOR_PICKUP: "Prête", OUT_FOR_DELIVERY: "En livraison", DELIVERED: "Remise" }[s]}</p></li>)}
        </ol></Card>
      )}
      {o.fulfillment === "HOME" && o.status === "OUT_FOR_DELIVERY" && <Card className="border-emerald-200 bg-emerald-50"><h2 className="font-bold">Avez-vous reçu votre article ?</h2><p className="mt-1 text-sm text-slate-600">Confirmez uniquement après avoir reçu et vérifié votre commande. Un code sera envoyé à votre e-mail ; le vendeur ne doit jamais le recevoir.</p>
        {!deliverySent ? <Button className="mt-3" onClick={async () => { try { const r = await api.requestDeliveryOtp(o.id, guestOrders()[o.id] ?? "", deviceId()); toast(`Code envoyé à ${r.maskedEmail}`); setDeliverySent(true); } catch (e) { toast((e as Error).message, "error"); } }}>Recevoir mon code de réception</Button> : <div className="mt-3 flex flex-wrap gap-2"><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Code à 6 chiffres" aria-label="Code de réception" value={deliveryCode} onChange={(e) => setDeliveryCode(e.target.value.replace(/\D/g, ""))} className="max-w-48" /><Button disabled={deliveryCode.length !== 6} onClick={async () => { try { await api.buyerConfirmDelivery(o.id, guestOrders()[o.id] ?? "", deliveryCode); toast("Réception confirmée"); reload(); } catch (e) { toast((e as Error).message, "error"); } }}>Confirmer la réception</Button><button className="text-xs font-semibold text-emerald-700" onClick={async () => { try { await api.requestDeliveryOtp(o.id, guestOrders()[o.id] ?? "", deviceId()); toast("Nouveau code envoyé"); } catch (e) { toast((e as Error).message, "error"); } }}>Renvoyer</button></div>}
      </Card>}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-display font-bold">Articles</h2>
          <ul className="divide-y divide-slate-100">{o.items.map((i) => <li key={i.product_id} className="flex items-center gap-3 py-3"><img src={i.image} alt="" className="h-14 w-14 rounded-xl object-cover" /><div className="min-w-0 flex-1"><Link to={`/produit/${i.slug}`} className="text-sm font-semibold">{i.name}</Link><p className="text-xs text-slate-500 tabular">{formatFCFA(i.unit_price)} × {i.qty}</p></div><p className="font-semibold tabular">{formatFCFA(i.line_total)}</p></li>)}</ul>
          <h2 className="mb-2 mt-6 font-display font-bold">Livraison</h2>
          <p className="text-sm text-slate-600">{o.fulfillment === "STORE" ? "Retrait en boutique physique · présentez la référence de commande." : `${o.customer.first_name} ${o.customer.last_name} · ${o.customer.phone.slice(0, 3)}XXX${o.customer.phone.slice(-3)} · ${o.customer.address}, ${o.customer.district}, ${o.customer.city} (${o.customer.region})`}</p>
          <h2 className="mb-2 mt-6 font-display font-bold">Historique</h2>
          <ul className="space-y-1.5 text-sm">{o.history.map((h, i) => <li key={i} className="flex justify-between gap-2"><StatusBadge status={h.status} /><span className="text-xs text-slate-400">{fmtDate(h.at, true)}</span></li>)}</ul>
        </Card>
        <Summary subtotal={o.subtotal} delivery={o.delivery} discount={o.discount} total={o.total}>
          <p className="text-xs text-slate-500">Paiement : {PAY.find((p) => p.v === o.payment_method)?.label} · <StatusBadge status={o.payment?.status ?? "PENDING"} /></p>
        </Summary>
      </div>
    </div>
  );
}
