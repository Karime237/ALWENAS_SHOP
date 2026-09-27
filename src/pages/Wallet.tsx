import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowLeftRight, CheckCircle2, Clock, Coins, History, Info, Smartphone, Wallet as WalletIcon, X } from "lucide-react";
import { useApp, useLoad } from "../lib/store";
import * as api from "../server/api";
import { Button, Card, Empty, ErrorBox, Field, Input, Modal, PageHeader, Skeleton, StatusBadge, fmtDate } from "../components/ui";
import { TxRow, WalletCard } from "../components/Finance";
import { formatFCFA, formatPool, formatPoolNumber, parsePoolInput, poolToCentimes, parseFcfaInput, maskFcfaInput, POOL_RATE_FCFA } from "../lib/money";
import { cn } from "../utils/cn";

const idem = () => crypto.getRandomValues(new Uint32Array(2)).join("-");

export function WalletPage() {
  const { token } = useApp();
  const { data: w, error } = useLoad(() => api.getWallet(token!), [token]);
  const tx = useLoad(() => api.listTransactions(token!), [token]);
  if (error) return <ErrorBox text={error} />;
  if (!w) return <Skeleton className="h-72" />;
  const rows = [
    { label: "POOL disponible", value: formatPool(w.pool), cls: "text-pool-600", icon: Coins },
    { label: "Valeur", value: formatFCFA(w.poolValue, { alwaysDecimals: true }), icon: WalletIcon },
    { label: "POOL en attente", value: formatPool(w.pendingPool), cls: "text-amber-500", icon: Clock },
    { label: "Commissions en attente", value: formatFCFA(w.pending), icon: Clock },
    { label: "FCFA disponible", value: formatFCFA(w.fcfa, { alwaysDecimals: true }), cls: "text-emerald-700", icon: CheckCircle2 },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Mon portefeuille" subtitle="Vos gains issus de ventes réelles" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3"><WalletCard pool={w.pool} value={w.poolValue} /></div>
        <Card className="lg:col-span-2">
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => <li key={r.label} className="flex items-center justify-between gap-3 py-3"><span className="flex items-center gap-2.5 text-sm text-slate-500"><r.icon className="h-4 w-4" />{r.label}</span><span className={cn("font-semibold tabular", r.cls)}>{r.value}</span></li>)}
          </ul>
        </Card>
      </div>
      <Card>
        <h2 className="font-display font-bold">Comment fonctionne le retrait ?</h2>
        <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
          {["Commission POOL disponible", "Conversion", "Solde FCFA disponible", "Demande de retrait", "MTN / Orange"].map((s, i) => (
            <li key={s} className="flex items-center gap-2 sm:flex-col sm:text-center"><span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold", i === 0 ? "pool-gradient text-ink" : i === 4 ? "brand-gradient text-white" : "bg-slate-100")}>{i + 1}</span><span className="text-slate-600">{s}</span></li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0" />Les POOL ne peuvent pas être retirés directement : convertissez-les d'abord en FCFA. Le montant exact en FCFA de chaque commission est conservé dans notre registre, aucun arrondi n'est perdu.</p>
      </Card>
      <Card>
        <div className="flex items-center justify-between"><h2 className="font-display font-bold">Dernières opérations</h2><Link to="/historique" className="text-sm font-semibold text-emerald-700">Historique complet</Link></div>
        {tx.data?.length ? <ul className="divide-y divide-slate-100">{tx.data.slice(0, 6).map((t) => <TxRow key={t.id} t={t} />)}</ul> : <p className="py-6 text-center text-sm text-slate-500">Aucune opération.</p>}
      </Card>
    </div>
  );
}

export function ConvertPage() {
  const { token, toast } = useApp();
  const { data: w, reload } = useLoad(() => api.getWallet(token!), [token]);
  const [raw, setRaw] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ pool: number; fcfa: number } | null>(null);
  const pool = parsePoolInput(raw);
  const err = raw && pool === null ? "Format invalide (2 décimales maximum, ex. 10,50)." : pool !== null && w && pool > w.poolConvertibleMax ? "Montant supérieur à votre solde convertible." : pool === 0 ? "Minimum 0,01 POOL." : null;
  if (!w) return <Skeleton className="h-80" />;
  const pick = (ratio: number) => setRaw(formatPoolNumber(Math.floor(w.poolConvertibleMax * ratio)).replace(/\u202f/g, ""));
  const run = async () => {
    if (!confirm || pool === null) return; setLoading(true);
    try { const r = await api.convertPool(token!, pool, confirm); setDone(r); setConfirm(null); setRaw(""); reload(); toast("Conversion effectuée"); }
    catch (e) { toast((e as Error).message, "error"); setConfirm(null); } finally { setLoading(false); }
  };
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Convertir mes POOL" subtitle="POOL → FCFA disponible au retrait" back="/portefeuille" />
      <Card className="space-y-5 p-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-amber-50 p-3"><p className="text-[11px] text-slate-500">Solde</p><p className="mt-1 text-sm font-bold text-pool-600 tabular">{formatPool(w.pool)}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Taux</p><p className="mt-1 text-sm font-bold">1 POOL = {POOL_RATE_FCFA} FCFA</p></div>
          <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-[11px] text-slate-500">Valeur</p><p className="mt-1 text-sm font-bold text-emerald-700 tabular">{formatFCFA(w.poolValue, { alwaysDecimals: true })}</p></div>
        </div>
        <Field label="Nombre de POOL à convertir" id="pool" error={err} hint={`Maximum convertible : ${formatPool(w.poolConvertibleMax)}`}>
          <div className="relative">
            <Input id="pool" inputMode="decimal" value={raw} placeholder="0,00" onChange={(e) => setRaw(e.target.value.replace(/[^\d,.]/g, "").replace(".", ","))} className="h-16 pr-20 font-display text-2xl font-bold tabular" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-pool-600">POOL</span>
          </div>
        </Field>
        <div className="flex gap-2">{[["25 %", 0.25], ["50 %", 0.5], ["Max", 1]].map(([l, r]) => <button key={l} onClick={() => pick(r as number)} className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-semibold transition hover:bg-slate-200">{l}</button>)}</div>
        <div className="flex flex-col items-center gap-1"><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><ArrowDown className="h-4 w-4" /></span></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
          <p className="text-xs text-slate-500">Vous recevrez</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-emerald-700 tabular">{formatFCFA(pool && !err ? poolToCentimes(pool) : 0, { alwaysDecimals: true })}</p>
        </div>
        <Button variant="pool" size="lg" className="w-full" disabled={!pool || !!err} onClick={() => setConfirm(idem())}><ArrowLeftRight className="h-5 w-5" />CONVERTIR EN FCFA</Button>
        {done && <p className="rounded-2xl bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">✅ {formatPool(done.pool)} convertis en {formatFCFA(done.fcfa, { alwaysDecimals: true })}. <Link to="/retrait" className="underline">Retirer maintenant</Link></p>}
      </Card>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Confirmer la conversion">
        {pool !== null && <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">POOL débités</span><strong className="text-pool-600 tabular">{formatPool(pool)}</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">Taux</span><strong>1 POOL = 550 FCFA</strong></div>
          <div className="flex justify-between border-t pt-3"><span className="text-slate-500">FCFA crédités</span><strong className="text-emerald-700 tabular">{formatFCFA(poolToCentimes(pool), { alwaysDecimals: true })}</strong></div>
          <p className="text-xs text-slate-400">Cette opération est définitive. Les FCFA obtenus sont retirables vers MTN MoMo ou Orange Money.</p>
          <div className="grid grid-cols-2 gap-2 pt-2"><Button variant="outline" onClick={() => setConfirm(null)}>Annuler</Button><Button loading={loading} onClick={run}>Confirmer</Button></div>
        </div>}
      </Modal>
    </div>
  );
}

export function WithdrawPage() {
  const { token, toast } = useApp();
  const { data: w, reload } = useLoad(() => api.getWallet(token!), [token]);
  const list = useLoad(() => api.listWithdrawals(token!), [token]);
  const methods = useLoad(() => api.listWithdrawalMethods(token!), [token]);
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<"MTN" | "ORANGE">("MTN");
  const [phone, setPhone] = useState(""); const [holder, setHolder] = useState(""); const [save, setSave] = useState(true);
  const [confirm, setConfirm] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const cents = parseFcfaInput(amount) ?? 0;
  const fee = cents ? api.withdrawalFee(cents) : 0;
  const phoneOk = network === "MTN" ? api.MTN_RE.test(phone) : api.ORANGE_RE.test(phone);
  const problems = useMemo(() => {
    if (!w) return "";
    if (cents && cents < api.CONFIG.WITHDRAW_MIN) return "Minimum 1 000 FCFA.";
    if (cents > api.CONFIG.WITHDRAW_MAX) return "Maximum 500 000 FCFA par retrait.";
    if (cents > w.fcfa) return "Montant supérieur à votre solde FCFA disponible.";
    return "";
  }, [cents, w]);
  if (!w) return <Skeleton className="h-96" />;
  const valid = cents >= api.CONFIG.WITHDRAW_MIN && !problems && phoneOk && holder.trim().length >= 3;
  const submit = async () => {
    if (!confirm) return; setLoading(true); setErr(null);
    try { const r = await api.requestWithdrawal(token!, { amount: cents, network, phone, holder, save, idem: confirm }); toast(`Retrait #${r.id} enregistré`); setAmount(""); setConfirm(null); reload(); list.reload(); methods.reload(); }
    catch (e) { setErr((e as Error).message); setConfirm(null); } finally { setLoading(false); }
  };
  const cancel = async (id: string) => { try { await api.cancelWithdrawal(token!, id); toast("Retrait annulé, montant recrédité"); reload(); list.reload(); } catch (e) { toast((e as Error).message, "error"); } };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <PageHeader title="Retirer mes gains" subtitle="Vers MTN Mobile Money ou Orange Money" back="/portefeuille" />
        <Card className="space-y-5 p-6">
          <div className="rounded-2xl bg-slate-900 p-5 text-white"><p className="text-xs text-white/60">Solde disponible</p><p className="mt-1 font-display text-3xl font-extrabold tabular">{formatFCFA(w.fcfa, { alwaysDecimals: true })}</p>{w.pool > 0 && <Link to="/convertir" className="mt-2 inline-block text-xs font-semibold text-amber-300">+ {formatPool(w.pool)} à convertir →</Link>}</div>
          {err && <ErrorBox text={err} />}
          <Field label="Montant" id="amt" error={problems || null}>
            <div className="relative"><Input id="amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(maskFcfaInput(e.target.value))} placeholder="0" className="h-14 pr-20 text-xl font-bold tabular" /><span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-slate-400">FCFA</span></div>
          </Field>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Méthode</p>
            <div className="grid grid-cols-2 gap-3" role="radiogroup">
              {(["MTN", "ORANGE"] as const).map((n) => (
                <button key={n} role="radio" aria-checked={network === n} onClick={() => setNetwork(n)} className={cn("flex items-center gap-3 rounded-2xl border-2 p-3 transition", network === n ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200")}>
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl text-xs font-extrabold", n === "MTN" ? "bg-[#ffcc00] text-ink" : "bg-[#ff7900] text-white")}>{n === "MTN" ? "MTN" : "OM"}</span>
                  <span className="text-left text-sm font-semibold">{n === "MTN" ? "MTN CAMEROON" : "ORANGE CAMEROUN"}</span>
                </button>
              ))}
            </div>
          </div>
          {!!methods.data?.length && <div className="flex flex-wrap gap-2">{methods.data.map((m) => <button key={m.id} onClick={() => { setNetwork(m.network); setPhone(m.phone); setHolder(m.holder); }} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold hover:bg-slate-200"><Smartphone className="h-3.5 w-3.5" />{m.network} · {m.masked}</button>)}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Numéro" id="wph" error={phone.length === 9 && !phoneOk ? `Numéro ${network === "MTN" ? "MTN" : "Orange"} invalide` : null}><Input id="wph" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="6XXXXXXXX" /></Field>
            <Field label="Nom du titulaire" id="wh"><Input id="wh" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Tel qu'enregistré chez l'opérateur" /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="h-4 w-4 accent-emerald-600" />Enregistrer ce moyen de retrait</label>
          <dl className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Montant demandé</dt><dd className="tabular">{formatFCFA(cents)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Frais (1 %, min. 100 FCFA)</dt><dd className="tabular">{cents ? `-${formatFCFA(fee)}` : "—"}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold"><dt>Montant net</dt><dd className="tabular text-emerald-700">{formatFCFA(cents ? cents - fee : 0)}</dd></div>
            <div className="flex justify-between text-xs"><dt className="text-slate-500">Délai estimé</dt><dd>Moins de 24 h ouvrées</dd></div>
          </dl>
          <p className="text-xs text-slate-400">Conditions : min. 1 000 FCFA, max. 500 000 FCFA par retrait, 3 demandes / 24 h. Le montant est réservé immédiatement sur votre solde. <Link to="/legal/retrait" className="underline">Politique de retrait</Link></p>
          <Button size="lg" className="w-full" disabled={!valid} onClick={() => setConfirm(idem())}>CONFIRMER LE RETRAIT</Button>
        </Card>
      </div>
      <div className="lg:col-span-2 lg:pt-[72px]">
        <Card>
          <h2 className="mb-2 font-display font-bold">Mes retraits</h2>
          {!list.data?.length ? <p className="py-6 text-center text-sm text-slate-500">Aucun retrait pour le moment.</p> : (
            <ul className="divide-y divide-slate-100">{list.data.map((x) => (
              <li key={x.id} className="py-3 text-sm">
                <div className="flex items-center justify-between"><span className="font-semibold">Retrait #{x.id}</span><StatusBadge status={x.status} /></div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500"><span>{x.network} · {x.phone} · {fmtDate(x.created_at, true)}</span><span className="font-semibold text-ink tabular">{formatFCFA(x.amount)}</span></div>
                {x.failure_reason && x.status !== "SUCCESS" && <p className="mt-1 text-xs text-rose-600">{x.failure_reason}</p>}
                {x.status === "PENDING" && <button onClick={() => cancel(x.id)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><X className="h-3 w-3" />Annuler</button>}
              </li>
            ))}</ul>
          )}
        </Card>
      </div>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Confirmer le retrait">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Réseau</span><strong>{network === "MTN" ? "MTN Cameroon" : "Orange Cameroun"}</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">Numéro</span><strong>{phone.slice(0, 1)}XXXXX{phone.slice(-3)}</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">Titulaire</span><strong>{holder}</strong></div>
          <div className="flex justify-between border-t pt-3"><span className="text-slate-500">Vous recevrez</span><strong className="text-emerald-700 tabular">{formatFCFA(cents - fee)}</strong></div>
          <div className="grid grid-cols-2 gap-2 pt-2"><Button variant="outline" onClick={() => setConfirm(null)}>Annuler</Button><Button loading={loading} onClick={submit}>Confirmer</Button></div>
        </div>
      </Modal>
    </div>
  );
}

const TABS = [{ v: "all", l: "Tout" }, { v: "commission", l: "Commissions" }, { v: "conversion", l: "Conversions" }, { v: "withdrawal", l: "Retraits" }] as const;
export function HistoryPage() {
  const { token } = useApp();
  const { data } = useLoad(() => api.listTransactions(token!), [token]);
  const [tab, setTab] = useState<(typeof TABS)[number]["v"]>("all");
  const rows = (data ?? []).filter((t) => tab === "all" || (tab === "commission" && t.type.startsWith("COMMISSION")) || (tab === "commission" && t.type === "SALE_COMMISSION") || (tab === "conversion" && t.type === "POOL_CONVERSION") || (tab === "withdrawal" && t.type.startsWith("WITHDRAWAL")));
  return (
    <div>
      <PageHeader title="Historique financier" subtitle="Toutes vos opérations, horodatées et référencées" />
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">{TABS.map((t) => <button key={t.v} onClick={() => setTab(t.v)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", tab === t.v ? "bg-ink text-white" : "bg-white ring-1 ring-slate-200")}>{t.l}</button>)}</div>
      {!data ? <Skeleton className="h-64" /> : rows.length === 0 ? <Empty icon={<History className="h-6 w-6" />} title="Aucune opération" /> : <Card className="py-2"><ul className="divide-y divide-slate-100">{rows.map((t) => <TxRow key={t.id} t={t} />)}</ul></Card>}
    </div>
  );
}
