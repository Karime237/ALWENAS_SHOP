import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, CheckCircle2, Crown, FlaskConical, Link2, Loader2, Lock, ShieldCheck, Smartphone, Wallet, XCircle, TrendingUp, ArrowRight, Info } from "lucide-react";
import { useApp, useLoad } from "../lib/store";
import * as api from "../server/api";
import { Button, Card, ErrorBox, Field, Input, Skeleton, StatusBadge, fmtDate } from "../components/ui";
import { Steps } from "./Auth";
import { formatFCFA } from "../lib/money";
import { cn } from "../utils/cn";

const BENEFITS = [
  { i: Link2, t: "Liens de vente illimités", d: "Un lien unique pour chaque produit du catalogue." },
  { i: TrendingUp, t: "Commissions 5 à 12 %", d: "Sur chaque vente réelle, calculées au centime." },
  { i: Wallet, t: "Portefeuille POOL & retraits", d: "Conversion en FCFA et retrait MTN / Orange." },
  { i: ShieldCheck, t: "Suivi & support vendeur", d: "Statistiques de clics, ventes et accompagnement." },
];

type Provider = "MTN_MOMO" | "ORANGE_MONEY";

export function SubscriptionPage() {
  const { token, me, refreshMe, toast } = useApp();
  const nav = useNavigate();
  const sub = useLoad(() => api.getSubscription(token!), [token]);
  const [provider, setProvider] = useState<Provider>("MTN_MOMO");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{ subscriptionId: string; paymentId: string; phone: string; provider: Provider } | null>(null);
  const [result, setResult] = useState<"SUCCESS" | "FAILED" | null>(null);
  const [sim, setSim] = useState<"SUCCESS" | "FAILED" | null>(null);

  useEffect(() => { if (sub.data?.phone && !phone) { setPhone(sub.data.phone); setProvider(api.ORANGE_RE.test(sub.data.phone) ? "ORANGE_MONEY" : "MTN_MOMO"); } }, [sub.data]); // eslint-disable-line
  if (!sub.data || !me) return <Skeleton className="h-96" />;
  const s = sub.data;
  const phoneOk = provider === "MTN_MOMO" ? api.MTN_RE.test(phone) : api.ORANGE_RE.test(phone);
  const firstTime = s.status === "NONE";
  const unfinished = s.history.find((h) => h.status === "PENDING");

  const pay = async () => {
    setErr(null); setLoading(true);
    try { const r = await api.createSubscriptionPayment(token!, provider, phone); setPending(r); setResult(null); }
    catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  };
  const simulate = async (o: "SUCCESS" | "FAILED") => {
    if (!pending) return; setSim(o);
    try {
      await api.sandboxPspConfirm(pending.paymentId, o);
      const r = await api.getSubscriptionPayment(token!, pending.subscriptionId);
      setResult(r.status === "SUCCESS" ? "SUCCESS" : "FAILED");
      if (r.status === "SUCCESS") { await refreshMe(); sub.reload(); toast("Abonnement activé 🎉"); }
    } catch (e) { toast((e as Error).message, "error"); } finally { setSim(null); }
  };

  // Écran de succès
  if (result === "SUCCESS") return (
    <div className="mx-auto max-w-lg">
      {firstTime && <div className="mb-6"><Steps current={3} /></div>}
      <Card className="p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
        <h1 className="mt-4 font-display text-2xl font-bold">Bienvenue parmi les vendeurs ALWENAS 🎉</h1>
        <p className="mt-2 text-sm text-slate-500">Votre inscription est finalisée. Le paiement unique de 1 500 FCFA a été confirmé par le prestataire : votre accès vendeur est actif à vie.</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => nav("/app")}>Mon tableau de bord</Button>
          <Button onClick={() => nav("/boutique")}>Générer mon premier lien <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      {firstTime && <div className="mb-6"><Steps current={3} /></div>}
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{s.active ? "Mon accès vendeur à vie" : `Dernière étape, ${me.name} !`}</h1>
        <p className="mt-1 text-sm text-slate-500">{s.active ? "Votre accès vendeur n'expire pas." : "Votre compte est en attente : payez maintenant pour finaliser votre inscription et accéder à la plateforme."}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Offre */}
        <div className="relative overflow-hidden rounded-[28px] bg-ink p-7 text-white lg:col-span-2">
          <div aria-hidden className="animate-drift absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-amber-300 ring-1 ring-white/10"><Crown className="h-3.5 w-3.5" />Abonnement vendeur</span>
          <p className="relative mt-5 font-display text-5xl font-extrabold tabular">1 500 <span className="text-2xl">FCFA</span></p>
          <p className="relative text-sm text-white/60">paiement unique · accès à vie</p>
          <ul className="relative mt-6 space-y-4">
            {BENEFITS.map((b) => <li key={b.t} className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10"><b.i className="h-4 w-4 text-amber-300" /></span><span><span className="block text-sm font-semibold">{b.t}</span><span className="block text-xs text-white/60">{b.d}</span></span></li>)}
          </ul>
          <p className="relative mt-6 rounded-2xl bg-white/5 p-3 text-[11px] leading-relaxed text-white/60 ring-1 ring-white/10">Paiement une seule fois. Il ne génère <strong className="text-white">aucune commission</strong> pour un parrain : seules les ventes réelles de produits sont rémunérées.</p>
        </div>

        {/* Paiement */}
        <div className="space-y-4 lg:col-span-3">
          {s.status !== "NONE" && (
            <Card className={cn("flex items-center gap-4", s.active ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/60")}>
              <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", s.active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{s.active ? <BadgeCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}</span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{s.status === "EXEMPT" ? "Compte administrateur — exempté" : "Accès vendeur actif à vie"}</p>
              </div>
            </Card>
          )}

          {!s.active && !pending && (
            <Card className="space-y-5 p-6">
              <h2 className="font-display text-lg font-bold">Finaliser mon inscription · payer 1 500 FCFA</h2>
              {unfinished && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm"><p className="font-semibold text-amber-800">Un paiement est en attente (#{unfinished.id}).</p><Button size="sm" variant="outline" className="mt-2" onClick={() => setPending({ subscriptionId: unfinished.id, paymentId: unfinished.payment_id, phone: unfinished.phone, provider: unfinished.provider })}>Reprendre le paiement</Button></div>}
              {err && <ErrorBox text={err} />}
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Moyen de paiement">
                {([["MTN_MOMO", "MTN Mobile Money", "MTN", "bg-[#ffcc00] text-ink"], ["ORANGE_MONEY", "Orange Money", "OM", "bg-[#ff7900] text-white"]] as const).map(([v, l, abbr, c]) => (
                  <button key={v} role="radio" aria-checked={provider === v} onClick={() => setProvider(v)} className={cn("flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition", provider === v ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 hover:border-slate-300")}>
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold", c)}>{abbr}</span>
                    <span className="text-sm font-semibold leading-tight">{l}</span>
                  </button>
                ))}
              </div>
              <Field label={`Numéro ${provider === "MTN_MOMO" ? "MTN" : "Orange"} à débiter`} id="sub-ph" error={phone.length === 9 && !phoneOk ? `Ce n'est pas un numéro ${provider === "MTN_MOMO" ? "MTN" : "Orange"} valide.` : null} hint="La demande de paiement sera envoyée sur ce numéro.">
                <Input id="sub-ph" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="6XXXXXXXX" className="tabular" />
              </Field>
              <dl className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Accès vendeur à vie</dt><dd className="tabular">{formatFCFA(s.price)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Frais</dt><dd>0 FCFA</dd></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total à payer</dt><dd className="font-display tabular">{formatFCFA(s.price)}</dd></div>
              </dl>
              <Button size="lg" className="w-full" loading={loading} disabled={!phoneOk || !!unfinished} onClick={pay}><Lock className="h-4 w-4" />PAYER 1 500 FCFA</Button>
            </Card>
          )}

          {pending && (
            <Card className="p-6 text-center">
              {result === "FAILED" ? (<>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600"><XCircle className="h-7 w-7" /></div>
                <h2 className="mt-3 font-display text-lg font-bold">Paiement non abouti</h2>
                <p className="mt-1 text-sm text-slate-500">Aucun montant n'a été débité. Vérifiez votre solde Mobile Money et réessayez.</p>
                <Button className="mt-4" onClick={() => { setPending(null); setResult(null); }}>Réessayer</Button>
              </>) : (<>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-500"><Smartphone className="h-7 w-7" /></div>
                <h2 className="mt-3 font-display text-lg font-bold">Validez le paiement sur votre téléphone</h2>
                <p className="mt-1 text-sm text-slate-500">Demande de <strong className="text-ink">1 500 FCFA</strong> envoyée au {pending.phone}. {pending.provider === "MTN_MOMO" ? "Composez *126# si la notification n'apparaît pas." : "Composez #150# si la notification n'apparaît pas."}</p>
                <p className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-amber-600"><Loader2 className="h-4 w-4 animate-spin" />En attente de confirmation du prestataire…</p>
                <p className="mt-2 text-xs text-slate-400">Réf. {pending.subscriptionId}</p>
              </>)}
            </Card>
          )}
          {pending && !result && (
            <Card className="border-dashed border-amber-300 bg-amber-50/60">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><FlaskConical className="h-4 w-4" />Simulateur prestataire de paiement (sandbox)</p>
              <p className="mt-1 text-xs text-amber-800/80">En production, MTN / Orange notifient le serveur via un webhook signé. Simulez la réponse :</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" loading={sim === "SUCCESS"} disabled={!!sim} onClick={() => simulate("SUCCESS")}>Paiement réussi</Button>
                <Button size="sm" variant="outline" loading={sim === "FAILED"} disabled={!!sim} onClick={() => simulate("FAILED")}>Paiement échoué</Button>
              </div>
            </Card>
          )}

          {s.history.length > 0 && (
            <Card>
              <h2 className="mb-2 font-display font-bold">Historique des paiements</h2>
              <ul className="divide-y divide-slate-100 text-sm">{s.history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span><span className="font-semibold">#{h.id}</span><span className="block text-xs text-slate-500">{h.provider === "MTN_MOMO" ? "MTN" : "Orange"} · {h.phone} · {fmtDate(h.created_at, true)}</span>{h.period_end && <span className="block text-xs text-emerald-700">Période jusqu'au {fmtDate(h.period_end)}</span>}</span>
                  <span className="text-right"><span className="block font-semibold tabular">{formatFCFA(h.amount)}</span><StatusBadge status={h.status} /></span>
                </li>
              ))}</ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Verrou côté interface. Le serveur applique la même règle (SUBSCRIPTION_REQUIRED). */
export function SubscriptionGate({ children, feature }: { children: ReactNode; feature: string }) {
  const { me } = useApp();
  if (!me || me.subscription.active) return <>{children}</>;
  return (
    <div className="mx-auto max-w-lg">
      <Card className="overflow-hidden p-0 text-center">
        <div className="brand-gradient px-6 py-8 text-white">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15"><Lock className="h-7 w-7" /></span>
          <h1 className="mt-4 font-display text-xl font-bold">{feature} est réservé aux abonnés</h1>
          <p className="mt-1 text-sm text-white/80">Activez votre accès vendeur une seule fois pour débloquer cette fonctionnalité.</p>
        </div>
        <div className="p-6">
          <p className="font-display text-3xl font-extrabold">1 500 FCFA <span className="text-base font-semibold text-slate-400">une seule fois</span></p>
          <ul className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm">{BENEFITS.map((b) => <li key={b.t} className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />{b.t}</li>)}</ul>
          <Link to="/abonnement"><Button size="lg" className="mt-6 w-full">Activer mon abonnement <ArrowRight className="h-4 w-4" /></Button></Link>
          <Link to="/boutique" className="mt-3 inline-block text-sm text-slate-500 hover:text-ink">Continuer mes achats</Link>
        </div>
      </Card>
    </div>
  );
}

export function SubscriptionBanner() {
  const { me } = useApp();
  if (!me || me.subscription.active) return null;
  return (
    <Link to="/abonnement" className="group flex items-center gap-4 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-4 transition hover:shadow-lg sm:p-5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl pool-gradient text-ink shadow-lg shadow-amber-500/20"><Crown className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Activez votre accès vendeur à vie</span>
        <span className="block text-sm text-slate-500">1 500 FCFA une seule fois · liens de vente, commissions et retraits</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white sm:inline-flex">Payer 1 500 FCFA<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
      <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 sm:hidden" />
    </Link>
  );
}

export function SubscriptionInfoNote() {
  return <p className="flex items-start gap-2 text-xs text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0" />Avant paiement confirmé, le compte provisoire n'accède pas à l'espace membre. Les visiteurs peuvent acheter librement sans compte.</p>;
}
