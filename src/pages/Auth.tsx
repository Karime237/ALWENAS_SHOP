import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Lock, Mail, Phone, ShieldCheck, Sparkles, User, UserPlus } from "lucide-react";
import { Button, ErrorBox, Logo } from "../components/ui";
import { DevMailbox } from "../components/DevMailbox";
import { useApp, deviceId, pendingOtp } from "../lib/store";
import * as api from "../server/api";
import { cn } from "../utils/cn";

const EMAIL_RE = /^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/;

function AuthFrame({ children, email }: { children: React.ReactNode; email?: string }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-drift absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="animate-drift absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-amber-200/30 blur-3xl" style={{ animationDelay: "-6s" }} />
        <div className="grid-fade absolute inset-0" />
      </div>
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-12">
        <div className="page-in w-full max-w-[400px]">{children}</div>
      </main>
      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 pb-6 text-xs text-slate-400">
        <span>© {new Date().getFullYear()} ALWENAS SHOP · Cameroun</span>
        <Link to="/legal/cgu" className="hover:text-slate-600">CGU</Link>
        <Link to="/legal/confidentialite" className="hover:text-slate-600">Confidentialité</Link>
        <Link to="/aide" className="hover:text-slate-600">Aide</Link>
      </footer>
      <DevMailbox email={email} />
    </div>
  );
}

export function AccessPage() {
  const { token, login } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastSubmit = useRef(0);

  useEffect(() => { const p = params.get("parrain"); if (p) api.registerReferralIntent(p, deviceId()); }, [params]);
  if (token) return <Navigate to="/app" replace />;

  const normalized = email.replace(/\s+/g, "").toLowerCase();
  const emailOk = EMAIL_RE.test(normalized);
  const passwordOk = password.length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setTouched(true); setErr(null);
    if (!emailOk || !passwordOk || loading) return;
    if (Date.now() - lastSubmit.current < 2500) return; // anti double-clic (le serveur applique aussi un rate limiting)
    lastSubmit.current = Date.now();
    setLoading(true);
    try {
      const r = await api.loginPassword(normalized, password, deviceId(), navigator.userAgent);
      await login(r.token);
      nav(r.needsSubscription ? "/abonnement" : (loc.state as { from?: string } | null)?.from ?? "/app", { replace: true });
    } catch (e) {
      const ae = e as api.ApiError;
      setErr(ae.message);
      lastSubmit.current = 0;
    } finally { setLoading(false); }
  };

  return (
    <AuthFrame email={emailOk ? normalized : undefined}>
      <div className="text-center">
        <Logo size="lg" className="justify-center" />
        <p className="mt-6 text-[15px] text-slate-500">Connectez-vous à votre espace vendeur</p>
      </div>
      <form onSubmit={submit} noValidate className="mt-9 space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Adresse e-mail</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden />
            <input id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="votre@email.com" value={email}
              onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))} onBlur={() => setTouched(true)} aria-invalid={touched && !emailOk}
              className={cn("h-14 w-full rounded-2xl border bg-white/80 pl-11 pr-4 text-base shadow-sm transition focus:outline-none focus:ring-4", touched && !emailOk ? "border-rose-300 focus:ring-rose-500/15" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/15")} />
          </div>
          {touched && !emailOk && <p className="text-xs font-medium text-rose-600" role="alert">Saisissez une adresse e-mail valide (ex. nom@gmail.com).</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Mot de passe</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input id="password" type="password" autoComplete="current-password" placeholder="Votre mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={touched && !passwordOk}
              className={cn("h-14 w-full rounded-2xl border bg-white/80 pl-11 pr-4 text-base shadow-sm transition focus:outline-none focus:ring-4", touched && !passwordOk ? "border-rose-300 focus:ring-rose-500/15" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/15")} />
          </div>
          {touched && !passwordOk && <p className="text-xs font-medium text-rose-600">Saisissez votre mot de passe.</p>}
        </div>
        {err && <ErrorBox text={err} />}
        <Button type="submit" size="lg" loading={loading} className="w-full tracking-wide">SE CONNECTER <ArrowRight className="h-4 w-4" /></Button>
        <p className="text-center text-xs text-slate-500"><Link to={emailOk ? `/mot-de-passe?email=${encodeURIComponent(normalized)}` : "/mot-de-passe"} className="font-semibold text-emerald-700">Mot de passe oublié ou ancien compte OTP ?</Link></p>
      </form>

      <div className="mt-8">
        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-slate-400"><span className="h-px flex-1 bg-slate-200" />Pas encore abonné ?<span className="h-px flex-1 bg-slate-200" /></div>
        <Link to={`/inscription?${new URLSearchParams({ ...(emailOk ? { email: normalized } : {}), ...(params.get("parrain") ? { parrain: params.get("parrain")! } : {}) })}`} className="group mt-4 flex items-center gap-4 rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-r from-emerald-50 to-amber-50/60 p-4 transition hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-600/10">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl brand-gradient text-white shadow-lg shadow-emerald-600/25"><UserPlus className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold tracking-wide text-ink">CRÉER UN COMPTE MAINTENANT</span>
            <span className="block text-xs text-slate-500">Code de parrain requis · <strong className="text-emerald-700">1 500 FCFA</strong> pour activer le compte</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-emerald-700 transition group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 text-sm">
        <Link to="/decouvrir" className="group inline-flex items-center gap-1.5 font-semibold text-emerald-700">
          <Sparkles className="h-4 w-4" />Découvrir ALWENAS SHOP<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
        <Link to="/boutique" className="text-slate-500 hover:text-ink">Visiter la boutique sans compte</Link>
      </div>
    </AuthFrame>
  );
}

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const items = ["Compte", "Vérification", "Abonnement"];
  return (
    <ol className="mx-auto flex max-w-xs items-center justify-between" aria-label="Étapes de l'inscription">
      {items.map((l, i) => {
        const n = (i + 1) as 1 | 2 | 3; const done = n < current; const on = n === current;
        return (
          <li key={l} className="flex flex-1 items-center last:flex-none">
            <span className="flex flex-col items-center gap-1">
              <span className={cn("grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition", done ? "bg-emerald-600 text-white" : on ? "brand-gradient text-white shadow-lg shadow-emerald-600/30" : "bg-slate-100 text-slate-400")} aria-current={on ? "step" : undefined}>{done ? <Check className="h-4 w-4" /> : n}</span>
              <span className={cn("text-[10px] font-semibold", on ? "text-emerald-700" : "text-slate-400")}>{l}</span>
            </span>
            {i < 2 && <span className={cn("mx-1 mb-4 h-0.5 flex-1 rounded", done ? "bg-emerald-500" : "bg-slate-200")} />}
          </li>
        );
      })}
    </ol>
  );
}

export function SignupPage() {
  const { token } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [f, setF] = useState({ first_name: "", last_name: "", email: params.get("email") ?? "", phone: "", password: "", confirmation: "", referral_code: params.get("parrain")?.trim().toUpperCase() ?? "" });
  const [accept, setAccept] = useState(false);
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => { const p = params.get("parrain"); if (p) api.registerReferralIntent(p, deviceId()); }, [params]);
  if (token) return <Navigate to="/app" replace />;

  const email = f.email.replace(/\s+/g, "").toLowerCase();
  const v = { first_name: f.first_name.trim().length >= 2, last_name: f.last_name.trim().length >= 2, email: EMAIL_RE.test(email), phone: /^6\d{8}$/.test(f.phone), password: api.passwordValid(f.password), confirmation: !!f.confirmation && f.confirmation === f.password, referral_code: /^[A-Z0-9]{6,12}$/.test(f.referral_code) };
  const ok = Object.values(v).every(Boolean) && accept;
  const cls = (bad: boolean) => cn("h-13 w-full rounded-2xl border bg-white/80 pl-11 pr-4 text-[15px] shadow-sm transition focus:outline-none focus:ring-4", touched && bad ? "border-rose-300 focus:ring-rose-500/15" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/15");

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setTouched(true); setErr(null); setExists(false);
    if (!ok || loading) return;
    setLoading(true);
    try {
      const r = await api.requestOtp({ email, mode: "signup", signup: { first_name: f.first_name, last_name: f.last_name, phone: f.phone, password: f.password, referral_code: f.referral_code, accept } }, deviceId());
      pendingOtp.set({ ...r, email });
      nav("/verification");
    } catch (e) {
      const ae = e as api.ApiError;
      if (ae.code === "ACCOUNT_EXISTS") setExists(true); else setErr(ae.message);
    } finally { setLoading(false); }
  };

  return (
    <AuthFrame email={v.email ? email : undefined}>
      <div className="text-center">
        <Link to="/" aria-label="Retour à l'accueil"><Logo size="lg" className="justify-center" /></Link>
        <h1 className="mt-6 font-display text-xl font-bold">Créer un compte maintenant</h1>
        <p className="mt-1 text-sm text-slate-500">Devenez vendeur ALWENAS en 3 étapes</p>
        <div className="mt-6"><Steps current={1} /></div>
      </div>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="su-fn" className="block text-sm font-semibold text-slate-700">Prénom</label>
            <div className="relative"><User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" /><input id="su-fn" autoComplete="given-name" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} className={cls(!v.first_name)} aria-invalid={touched && !v.first_name} /></div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="su-ln" className="block text-sm font-semibold text-slate-700">Nom</label>
            <input id="su-ln" autoComplete="family-name" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} className={cn(cls(!v.last_name), "pl-4")} aria-invalid={touched && !v.last_name} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="su-em" className="block text-sm font-semibold text-slate-700">Adresse e-mail</label>
          <div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" /><input id="su-em" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="votre@email.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value.replace(/\s/g, "") })} className={cls(!v.email)} aria-invalid={touched && !v.email} /></div>
          {touched && !v.email && <p className="text-xs font-medium text-rose-600">Adresse e-mail invalide.</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="su-ph" className="block text-sm font-semibold text-slate-700">Téléphone (MTN ou Orange)</label>
          <div className="relative"><Phone className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" /><span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-[15px] text-slate-400">+237</span><input id="su-ph" inputMode="tel" autoComplete="tel-national" placeholder="6XXXXXXXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 9) })} className={cn(cls(!v.phone), "pl-[88px] tabular")} aria-invalid={touched && !v.phone} /></div>
          {touched && !v.phone && <p className="text-xs font-medium text-rose-600">9 chiffres commençant par 6.</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="su-ref" className="block text-sm font-semibold text-slate-700">Code de parrainage <span className="text-rose-600">*</span></label>
          <input id="su-ref" autoComplete="off" value={f.referral_code} onChange={(e) => setF({ ...f, referral_code: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12) })} placeholder="Code du membre qui vous invite" className={cn(cls(!v.referral_code), "pl-4 font-mono uppercase tracking-widest")} aria-invalid={touched && !v.referral_code} required />
          <p className="text-xs text-slate-500">Vous devez être invité par un membre actif. Le code est prérempli si vous avez suivi son lien.</p>
          <p className="text-xs text-amber-700">Sandbox uniquement : le compte administrateur préinscrit peut inviter avec le code <strong className="font-mono">ADMIN1</strong>.</p>
          {touched && !v.referral_code && <p className="text-xs text-rose-600">Un code valide est obligatoire pour poursuivre.</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="su-pw" className="block text-sm font-semibold text-slate-700">Mot de passe</label>
          <input id="su-pw" type="password" autoComplete="new-password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className={cn(cls(!v.password), "pl-4")} aria-invalid={touched && !v.password} placeholder="8 caractères, lettres et chiffres" />
          {touched && !v.password && <p className="text-xs text-rose-600">Au moins 8 caractères, avec des lettres et des chiffres.</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="su-confirm" className="block text-sm font-semibold text-slate-700">Confirmer le mot de passe</label>
          <input id="su-confirm" type="password" autoComplete="new-password" value={f.confirmation} onChange={(e) => setF({ ...f, confirmation: e.target.value })} className={cn(cls(!v.confirmation), "pl-4")} aria-invalid={touched && !v.confirmation} />
          {touched && !v.confirmation && <p className="text-xs text-rose-600">Les mots de passe doivent correspondre.</p>}
        </div>
        <div className="space-y-1.5">
          <span className="block text-sm font-semibold text-slate-700">Montant</span>
          <div className="flex h-14 items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4">
            <span className="text-sm text-slate-600">Accès vendeur à vie · paiement unique</span>
            <span className="font-display text-lg font-extrabold text-emerald-700 tabular">1 500 FCFA</span>
          </div>
          <p className="text-xs text-slate-400">À payer pendant la création du compte, avant l'accès à votre espace vendeur. Aucun gain n'est versé sur les inscriptions.</p>
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" />
          <span>J'accepte les <Link to="/legal/cgu" className="font-semibold text-emerald-700 underline-offset-2 hover:underline">conditions générales</Link> et la <Link to="/legal/abonnement" className="font-semibold text-emerald-700 underline-offset-2 hover:underline">politique d'abonnement</Link>.</span>
        </label>
        {touched && !accept && <p className="-mt-2 text-xs font-medium text-rose-600">Veuillez accepter les conditions pour continuer.</p>}
        {err && <ErrorBox text={err} />}
        {exists && (
          <div role="alert" className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            Un compte existe déjà avec cette adresse. <Link to="/" className="font-bold text-emerald-700">Se connecter →</Link>
          </div>
        )}
        <Button type="submit" size="lg" loading={loading} className="w-full tracking-wide">VÉRIFIER MON E-MAIL ET PAYER <ArrowRight className="h-4 w-4" /></Button>
        <p className="text-center text-sm text-slate-500">Déjà un compte ? <Link to="/" className="font-semibold text-emerald-700">Se connecter</Link></p>
      </form>
    </AuthFrame>
  );
}

/** Récupération sécurisée des comptes OTP existants et mots de passe oubliés. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!api.passwordValid(password) || password !== confirmation) { setErr("Le mot de passe doit contenir au moins 8 caractères, des lettres et des chiffres, et les deux saisies doivent correspondre."); return; }
    setLoading(true);
    try {
      const normalized = api.normalizeEmail(email);
      const r = await api.requestOtp({ email: normalized, mode: "reset", signup: { first_name: "", last_name: "", phone: "", password, accept: true } }, deviceId());
      pendingOtp.set({ ...r, email: normalized }); nav("/verification");
    } catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  };
  return <AuthFrame email={email}>
    <Logo size="lg" className="justify-center w-full" />
    <h1 className="mt-8 text-center font-display text-xl font-bold">Définir un mot de passe</h1>
    <p className="mt-2 text-center text-sm text-slate-500">Un code e-mail confirmera votre identité avant de remplacer l'ancien mot de passe. Les autres sessions seront déconnectées.</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-semibold">Adresse e-mail<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4" /></label>
      <label className="block text-sm font-semibold">Nouveau mot de passe<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères, lettres et chiffres" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4" /></label>
      <label className="block text-sm font-semibold">Confirmer le mot de passe<input type="password" required autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4" /></label>
      {err && <ErrorBox text={err} />}
      <Button type="submit" loading={loading} className="w-full">Envoyer le code de confirmation</Button>
      <Link to="/" className="block text-center text-sm text-emerald-700">Retour à la connexion</Link>
    </form>
  </AuthFrame>;
}

const fmtClock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

export function OtpPage() {
  const { login, token } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [pending, setPending] = useState(pendingOtp.get);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(i); }, []);
  useEffect(() => { refs.current[0]?.focus(); }, [pending?.requestId]);
  if (token) return <Navigate to="/app" replace />;
  if (!pending) return <Navigate to="/" replace />;

  const remaining = pending.expiresAt - now;
  const resendIn = pending.resendAt - now;

  const verify = async (code: string) => {
    if (loading || code.length !== 6) return;
    setLoading(true); setErr(null);
    try {
      const r = await api.verifyOtp(pending.requestId, code, deviceId(), navigator.userAgent);
      pendingOtp.clear();
      await login(r.token);
      const from = (loc.state as { from?: string } | null)?.from;
      if (r.needsSubscription) nav("/abonnement", { replace: true });
      else nav(from && from !== "/" ? from : "/app", { replace: true });
    } catch (e) {
      setErr((e as Error).message); setShake(true); setTimeout(() => setShake(false), 500);
      setDigits(Array(6).fill("")); refs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const setAt = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) return paste(clean, i);
    const next = [...digits]; next[i] = clean; setDigits(next); setErr(null);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) verify(next.join(""));
  };
  const paste = (text: string, start = 0) => {
    const d = text.replace(/\D/g, "").slice(0, 6 - start).split("");
    const next = [...digits]; d.forEach((c, k) => (next[start + k] = c)); setDigits(next);
    refs.current[Math.min(start + d.length, 5)]?.focus();
    if (next.every(Boolean)) verify(next.join(""));
  };
  const resend = async () => {
    if (resendIn > 0 || resending) return;
    setResending(true); setErr(null);
    try {
      const r = await api.resendOtp(pending.requestId, deviceId());
      const p = { ...r, email: pending.email }; pendingOtp.set(p); setPending(p); setDigits(Array(6).fill(""));
    } catch (e) { setErr((e as Error).message); } finally { setResending(false); }
  };

  return (
    <AuthFrame email={pending.email}>
      <div className="text-center">
        <Logo size="lg" className="justify-center" />
        {pending.mode === "signup" && <div className="mt-6"><Steps current={2} /></div>}
        <div className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-7 w-7" /></div>
        <h1 className="mt-4 font-display text-xl font-bold">Vérification de votre e-mail</h1>
        <p className="mt-2 text-sm text-slate-500">Un code à usage unique a été envoyé à :</p>
        <p className="mt-1 font-semibold">{pending.maskedEmail}</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); verify(digits.join("")); }} className="mt-8">
        <fieldset className={cn("flex justify-center gap-2 sm:gap-3", shake && "animate-shake")}>
          <legend className="sr-only">Code à 6 chiffres</legend>
          {digits.map((d, i) => (
            <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={6} aria-label={`Chiffre ${i + 1}`}
              onChange={(e) => setAt(i, e.target.value)} onPaste={(e) => { e.preventDefault(); paste(e.clipboardData.getData("text"), i); }}
              onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) { refs.current[i - 1]?.focus(); const n = [...digits]; n[i - 1] = ""; setDigits(n); } if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus(); if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus(); }}
              className={cn("tabular h-14 w-11 rounded-2xl border bg-white text-center font-display text-2xl font-bold shadow-sm transition focus:outline-none focus:ring-4 sm:h-16 sm:w-13", err ? "border-rose-300 focus:ring-rose-500/15" : d ? "border-emerald-400 focus:ring-emerald-500/15" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/15")} />
          ))}
        </fieldset>
        {err && <div className="mt-5"><ErrorBox text={err} /></div>}
        <Button type="submit" size="lg" loading={loading} disabled={digits.some((d) => !d)} className="mt-6 w-full tracking-wide">VÉRIFIER</Button>
      </form>
      <div className="mt-6 space-y-2 text-center text-sm">
        <button onClick={resend} disabled={resendIn > 0 || resending} className="font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:text-slate-400">
          {resending ? "Envoi…" : resendIn > 0 ? `Renvoyer le code (${fmtClock(resendIn)})` : "Renvoyer le code"}
        </button>
        <p className={cn("tabular", remaining <= 0 ? "font-semibold text-rose-600" : "text-slate-500")}>{remaining > 0 ? <>Code valable pendant <strong className="text-ink">{fmtClock(remaining)}</strong></> : "Ce code a expiré. Demandez un nouveau code."}</p>
        <Link to={pending.mode === "signup" ? `/inscription?email=${encodeURIComponent(pending.email)}` : pending.mode === "reset" ? `/mot-de-passe?email=${encodeURIComponent(pending.email)}` : "/"} onClick={() => pendingOtp.clear()} className="inline-block pt-2 text-slate-400 hover:text-ink">Modifier l'adresse e-mail</Link>
      </div>
    </AuthFrame>
  );
}
