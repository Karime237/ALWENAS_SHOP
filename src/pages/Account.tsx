import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bell, ChevronDown, Coins, CreditCard, LogOut, Mail, Package, Shield, ShieldCheck, Smartphone, Trash2, TrendingUp, ArrowLeftRight, ArrowDownToLine, FileText, RotateCcw } from "lucide-react";
import { useApp, useLoad } from "../lib/store";
import * as api from "../server/api";
import { Button, Card, Empty, ErrorBox, Field, Input, PageHeader, Skeleton, fmtDate } from "../components/ui";
import { FAQ, LEGAL } from "../content";
import { resetDb } from "../server/db";
import { cn } from "../utils/cn";

export function ProfilePage() {
  const { token, toast, logout } = useApp();
  const nav = useNavigate();
  const { data, reload } = useLoad(() => api.getProfile(token!), [token]);
  const methods = useLoad(() => api.listWithdrawalMethods(token!), [token]);
  const sessions = useLoad(() => api.listSessions(token!), [token]);
  const [f, setF] = useState({ first_name: "", last_name: "", phone: "" });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (data) setF({ first_name: data.first_name, last_name: data.last_name, phone: data.phone }); }, [data]);
  if (!data) return <Skeleton className="h-96" />;
  const save = async () => { setSaving(true); setErr(null); try { await api.updateProfile(token!, f); toast("Profil mis à jour"); reload(); } catch (e) { setErr((e as Error).message); } finally { setSaving(false); } };
  return (
    <div className="space-y-5">
      <PageHeader title="Mon profil" />
      <Card className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-2xl brand-gradient font-display text-2xl font-bold text-white">{(data.first_name || data.email).charAt(0).toUpperCase()}</span>
        <div className="min-w-0"><p className="truncate font-display text-lg font-bold">{data.first_name || data.last_name ? `${data.first_name} ${data.last_name}` : "Complétez votre profil"}</p><p className="truncate text-sm text-slate-500">{data.email}</p></div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-display font-bold">Informations personnelles</h2>
          {err && <ErrorBox text={err} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" id="pl"><Input id="pl" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
            <Field label="Prénom" id="pf"><Input id="pf" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
          </div>
          <Field label="Téléphone" id="pp"><Input id="pp" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 9) })} placeholder="6XXXXXXXX" /></Field>
          <Field label="E-mail" id="pe" hint="Adresse d'authentification protégée : modification uniquement via le support avec double vérification."><Input id="pe" value={data.email} disabled /></Field>
          <Button onClick={save} loading={saving}>Enregistrer</Button>
        </Card>
        <Card>
          <h2 className="mb-3 font-display font-bold">Compte</h2>
          <dl className="divide-y divide-slate-100 text-sm">
            {[["ID utilisateur", `#${data.id}`], ["Date d'inscription", fmtDate(data.created_at)], ["Code affilié", data.referral_code], ["Rôle", data.roles.length ? data.roles.join(", ") : "Membre vendeur"]].map(([k, v]) => <div key={k} className="flex justify-between py-2.5"><dt className="text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
          </dl>
          <h3 className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold"><CreditCard className="h-4 w-4" />Moyens de retrait</h3>
          {!methods.data?.length ? <p className="text-sm text-slate-500">Aucun moyen enregistré. Il sera proposé lors de votre premier retrait.</p> : (
            <ul className="space-y-2">{methods.data.map((m) => <li key={m.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="flex items-center gap-2"><Smartphone className="h-4 w-4" />{m.network} · {m.masked} · {m.holder}</span><button onClick={async () => { await api.deleteWithdrawalMethod(token!, m.id); methods.reload(); }} aria-label="Supprimer" className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></li>)}</ul>
          )}
        </Card>
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display font-bold"><Shield className="h-5 w-5 text-emerald-600" />Sécurité & connexions</h2><Button size="sm" variant="outline" onClick={async () => { await api.revokeOtherSessions(token!); sessions.reload(); toast("Autres sessions déconnectées"); }}>Déconnecter les autres appareils</Button></div>
        <ul className="divide-y divide-slate-100 text-sm">{sessions.data?.map((s, i) => <li key={i} className="flex items-center justify-between py-2.5"><span>{s.device} · {fmtDate(s.created_at, true)}</span><span className={cn("text-xs font-semibold", s.current ? "text-emerald-600" : s.active ? "text-slate-600" : "text-slate-400")}>{s.current ? "Cette session" : s.active ? "Active" : "Terminée"}</span></li>)}</ul>
      </Card>
      <Button variant="outline" className="w-full text-rose-600 lg:hidden" onClick={async () => { await logout(); nav("/"); }}><LogOut className="h-4 w-4" />Déconnexion</Button>
    </div>
  );
}

const N_ICON = { SALE: TrendingUp, COMMISSION: Coins, PAYMENT: CreditCard, ORDER: Package, WITHDRAWAL: ArrowDownToLine, CONVERSION: ArrowLeftRight, SECURITY: ShieldCheck };
export function NotificationsPage() {
  const { token, refreshUnread } = useApp();
  const nav = useNavigate();
  const { data, reload } = useLoad(() => api.listNotifications(token!), [token]);
  const readAll = async () => { await api.markNotification(token!, "all"); reload(); refreshUnread(); };
  return (
    <div>
      <PageHeader title="Notifications" action={<Button size="sm" variant="outline" onClick={readAll}>Tout marquer lu</Button>} />
      {!data ? <Skeleton className="h-64" /> : data.length === 0 ? <Empty icon={<Bell className="h-6 w-6" />} title="Aucune notification" /> : (
        <Card className="p-2"><ul>{data.map((n) => { const I = N_ICON[n.type]; return (
          <li key={n.id}><button onClick={async () => { await api.markNotification(token!, n.id); refreshUnread(); if (n.link) nav(n.link); else reload(); }} className={cn("flex w-full items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50", !n.read && "bg-emerald-50/50")}>
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", n.type === "COMMISSION" || n.type === "SALE" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600")}><I className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold">{n.title}{!n.read && <span className="h-2 w-2 rounded-full bg-emerald-500" />}</span><span className="block text-sm text-slate-600">{n.body}</span><span className="text-xs text-slate-400">{fmtDate(n.created_at, true)}</span></span>
          </button></li>); })}</ul></Card>
      )}
    </div>
  );
}

export function SettingsPage() {
  const { toast, logout } = useApp();
  const nav = useNavigate();
  const [prefs, setPrefs] = useState(() => { try { return JSON.parse(localStorage.getItem("alw_prefs") || "") as Record<string, boolean>; } catch { return { sale: true, commission: true, withdrawal: true, promo: false }; } });
  const toggle = (k: string) => { const n = { ...prefs, [k]: !prefs[k] }; setPrefs(n); localStorage.setItem("alw_prefs", JSON.stringify(n)); };
  return (
    <div className="space-y-5">
      <PageHeader title="Paramètres" />
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-display font-bold"><Mail className="h-5 w-5" />Notifications par e-mail</h2>
        {[["sale", "Nouvelles ventes"], ["commission", "Commissions disponibles"], ["withdrawal", "Retraits"], ["promo", "Offres et nouveautés produits"]].map(([k, l]) => (
          <label key={k} className="flex cursor-pointer items-center justify-between border-b border-slate-100 py-3 last:border-0">
            <span className="text-sm">{l}</span>
            <button role="switch" aria-checked={!!prefs[k]} onClick={() => toggle(k)} className={cn("relative h-7 w-12 rounded-full transition", prefs[k] ? "bg-emerald-500" : "bg-slate-200")}><span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition", prefs[k] ? "left-6" : "left-1")} /></button>
          </label>
        ))}
        <p className="mt-2 text-xs text-slate-400">Les e-mails de sécurité (codes, connexions) sont toujours envoyés.</p>
      </Card>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-display font-bold"><FileText className="h-5 w-5" />Documents légaux</h2>
        <div className="grid gap-2 sm:grid-cols-2">{Object.entries(LEGAL).map(([k, v]) => <Link key={k} to={`/legal/${k}`} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-medium hover:bg-slate-100">{v.title}</Link>)}</div>
      </Card>
      <Card className="border-amber-200 bg-amber-50/50">
        <h2 className="flex items-center gap-2 font-display font-bold text-amber-800"><RotateCcw className="h-5 w-5" />Sandbox de démonstration</h2>
        <p className="mt-1 text-sm text-amber-800/80">Réinitialise toutes les données simulées (comptes, commandes, portefeuilles).</p>
        <Button variant="outline" className="mt-3" onClick={async () => { await logout(); resetDb(); toast("Sandbox réinitialisée", "info"); nav("/"); }}>Réinitialiser la démo</Button>
      </Card>
    </div>
  );
}

export function FaqList({ items = FAQ, dark = false }: { items?: typeof FAQ; dark?: boolean }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="space-y-3">
      {items.map((f, i) => (
        <li key={f.q} className={cn("overflow-hidden rounded-2xl border transition", dark ? "border-white/10 bg-white/5" : "border-slate-200/70 bg-white", open === i && !dark && "shadow-md")}>
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
            <span className="font-semibold">{f.q}</span>
            <ChevronDown className={cn("h-5 w-5 shrink-0 transition duration-300", open === i && "rotate-180")} />
          </button>
          <div className={cn("grid transition-all duration-300", open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
            <div className="overflow-hidden"><p className={cn("px-5 pb-5 text-sm leading-relaxed", dark ? "text-white/70" : "text-slate-600")}>{f.a}</p></div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Aide & FAQ" subtitle="Toutes les réponses sur ALWENAS SHOP" back />
      <FaqList />
      <Card className="mt-6 text-center"><p className="font-semibold">Vous n'avez pas trouvé votre réponse ?</p><p className="mt-1 text-sm text-slate-500">support@alwenasshop.com · WhatsApp +237 6XX XX XX XX · Lun–Sam, 8 h–20 h</p></Card>
    </div>
  );
}

export function LegalPage() {
  const { slug = "cgu" } = useParams();
  const doc = LEGAL[slug];
  useEffect(() => { if (doc) document.title = `${doc.title} — ALWENAS SHOP`; }, [doc]);
  if (!doc) return <ErrorBox text="Document introuvable." />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={doc.title} subtitle="Dernière mise à jour : 2026" back />
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">{Object.entries(LEGAL).map(([k, v]) => <Link key={k} to={`/legal/${k}`} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", k === slug ? "bg-ink text-white" : "bg-white ring-1 ring-slate-200")}>{v.title.replace("Politique de ", "").replace("Conditions générales d'", "").replace("Conditions générales de ", "")}</Link>)}</div>
      <Card className="space-y-6 p-6 sm:p-8">
        {doc.sections.map(([h, t], i) => <section key={h}><h2 className="font-display text-lg font-bold">{i + 1}. {h}</h2><p className="mt-2 leading-relaxed text-slate-600">{t}</p></section>)}
        <p className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">Avant lancement commercial, le modèle, les flux financiers et ces documents doivent être validés par un professionnel compétent au regard du droit camerounais et de la réglementation CEMAC.</p>
      </Card>
    </div>
  );
}
