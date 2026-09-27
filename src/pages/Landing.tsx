import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, Coins, Link2, Lock, Menu, MousePointerClick, Package, ShieldCheck, Smartphone, Sparkles, Star, TrendingUp, Truck, Wallet, X, Zap, Users, BarChart3, MessageCircle, Quote, BadgeCheck } from "lucide-react";
import { Logo, Reveal, FacebookIcon } from "../components/ui";
import { FaqList } from "./Account";
import { useLoad } from "../lib/store";
import * as api from "../server/api";
import { formatFCFA, formatPool, formatPoolNumber, centimesToPoolDisplay, applyBps } from "../lib/money";
import { cn } from "../utils/cn";

const NAV = [["Fonctionnalités", "#fonctionnalites"], ["Produits", "#produits"], ["Avantages", "#avantages"], ["Témoignages", "#temoignages"], ["Tarifs", "#tarifs"], ["FAQ", "#faq"]];
const CITIES = ["Douala", "Yaoundé", "Bafoussam", "Garoua", "Bamenda", "Maroua", "Ngaoundéré", "Bertoua", "Ebolowa", "Limbé", "Kribi", "Buea", "Dschang", "Kumba"];

function useCountUp(target: number, run: boolean, ms = 1600) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return; let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / ms); setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [run, target, ms]);
  return v;
}
function Counter({ to, suffix = "", label }: { to: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null); const [go, setGo] = useState(false);
  useEffect(() => { const io = new IntersectionObserver(([e]) => e.isIntersecting && (setGo(true), io.disconnect()), { threshold: 0.4 }); if (ref.current) io.observe(ref.current); return () => io.disconnect(); }, []);
  const v = useCountUp(to, go);
  return <div ref={ref} className="text-center"><p className="font-display text-3xl font-extrabold tabular sm:text-4xl">{v.toLocaleString("fr-FR")}{suffix}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>;
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false); const [open, setOpen] = useState(false);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 12); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  const go = (href: string) => { setOpen(false); document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }); };
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-500", scrolled ? "py-2" : "py-4")}>
      <div className={cn("mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 transition-all duration-500 sm:px-5", scrolled ? "glass mx-3 h-14 shadow-lg shadow-slate-900/5 sm:mx-auto" : "h-14")}>
        <Link to="/decouvrir" aria-label="ALWENAS SHOP"><Logo size="sm" /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
          {NAV.map(([l, h]) => <button key={h} onClick={() => go(h)} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/70 hover:text-ink">{l}</button>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:text-ink sm:block">Se connecter</Link>
          <Link to="/inscription" className="group inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800">Créer un compte<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
          <button onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-xl lg:hidden">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      <div className={cn("glass mx-3 mt-2 overflow-hidden rounded-2xl transition-all duration-300 lg:hidden", open ? "max-h-96 opacity-100" : "max-h-0 border-0 opacity-0")}>
        <nav className="flex flex-col p-2">{NAV.map(([l, h]) => <button key={h} onClick={() => go(h)} className="rounded-xl px-4 py-3 text-left text-sm font-semibold">{l}</button>)}<Link to="/" className="rounded-xl px-4 py-3 text-sm font-semibold text-emerald-700">Se connecter</Link></nav>
      </div>
    </header>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div aria-hidden className="absolute -inset-10 rounded-full bg-gradient-to-tr from-emerald-400/30 via-teal-300/20 to-amber-300/30 blur-3xl" />
      <div className="animate-floaty relative rounded-[44px] border border-slate-900/10 bg-ink p-2.5 shadow-[0_50px_100px_-30px_rgba(10,16,32,0.55)]">
        <div className="overflow-hidden rounded-[36px] bg-[#f7f8fa]">
          <div className="flex items-center justify-between px-6 pb-2 pt-3 text-[10px] font-semibold"><span>9:41</span><span className="h-5 w-20 rounded-full bg-ink" /><span>5G</span></div>
          <div className="px-4 pb-5">
            <div className="flex items-center justify-between py-2"><Logo size="sm" className="scale-90 origin-left" /><span className="relative grid h-8 w-8 place-items-center rounded-lg bg-white shadow-sm">🔔<span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" /></span></div>
            <p className="mt-1 text-[11px] text-slate-500">Bonjour Mboucheko 👋</p>
            <div className="wallet-card mt-2 rounded-3xl p-4 text-white">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">Mon solde</p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular"><span className="pool-text">25,75</span> <span className="text-sm text-amber-300">POOL</span></p>
              <p className="text-[11px] text-white/70 tabular">≈ 14 162,50 FCFA</p>
              <div className="mt-3 grid grid-cols-2 gap-2"><span className="rounded-xl pool-gradient py-2 text-center text-[10px] font-bold text-ink">CONVERTIR</span><span className="rounded-xl bg-white/10 py-2 text-center text-[10px] font-bold ring-1 ring-white/15">RETIRER</span></div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[["Ventes", "18"], ["Clics", "342"], ["Liens", "6"]].map(([l, v]) => <div key={l} className="rounded-2xl bg-white p-2.5 text-center shadow-sm"><p className="font-display text-sm font-bold">{v}</p><p className="text-[9px] text-slate-500">{l}</p></div>)}
            </div>
            <div className="mt-3 space-y-2">
              {[["Montre connectée", "+9,82 POOL", "⌚"], ["Sac en cuir", "+8,29 POOL", "👜"], ["Écouteurs Pro", "+6,36 POOL", "🎧"]].map(([n, p, e]) => (
                <div key={n} className="flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow-sm"><span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-sm">{e}</span><span className="flex-1 text-[11px] font-semibold">{n}</span><span className="text-[11px] font-bold text-pool-600">{p}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="glass animate-floaty absolute -left-6 top-24 hidden rounded-2xl px-4 py-3 shadow-xl sm:block" style={{ animationDelay: "-2s" }}>
        <p className="flex items-center gap-2 text-xs font-bold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500 text-white"><TrendingUp className="h-4 w-4" /></span>Nouvelle vente !</p>
        <p className="mt-1 text-[11px] text-slate-600">+2,50 POOL · Commande #ALW18291</p>
      </div>
      <div className="glass animate-floaty absolute -right-8 bottom-24 hidden rounded-2xl px-4 py-3 shadow-xl sm:block" style={{ animationDelay: "-4s" }}>
        <p className="flex items-center gap-2 text-xs font-bold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#ffcc00] text-[9px] font-extrabold">MTN</span>Retrait effectué</p>
        <p className="mt-1 text-[11px] text-slate-600">10 000 FCFA envoyés ✓</p>
      </div>
    </div>
  );
}

function Simulator() {
  const [sales, setSales] = useState(10); const [price, setPrice] = useState(20000);
  const perSale = applyBps(price * 100, 1000);
  const monthly = perSale * sales * 4;
  return (
    <div className="glass-dark rounded-[28px] p-6 text-white sm:p-8">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-300"><BarChart3 className="h-4 w-4" />Simulateur de gains</p>
      <div className="mt-6 space-y-6">
        <label className="block"><span className="flex justify-between text-sm"><span className="text-white/70">Ventes par semaine</span><strong className="tabular">{sales}</strong></span><input type="range" min={1} max={50} value={sales} onChange={(e) => setSales(+e.target.value)} className="mt-3 w-full accent-amber-400" aria-label="Ventes par semaine" /></label>
        <label className="block"><span className="flex justify-between text-sm"><span className="text-white/70">Prix moyen du produit</span><strong className="tabular">{formatFCFA(price * 100)}</strong></span><input type="range" min={5000} max={60000} step={500} value={price} onChange={(e) => setPrice(+e.target.value)} className="mt-3 w-full accent-amber-400" aria-label="Prix moyen" /></label>
      </div>
      <div className="mt-7 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
        <p className="text-xs text-white/60">Estimation mensuelle (commission 10 %)</p>
        <p className="mt-1 font-display text-4xl font-extrabold tabular"><span className="pool-text">{formatPoolNumber(centimesToPoolDisplay(monthly))}</span> <span className="text-lg text-amber-300">POOL</span></p>
        <p className="text-sm text-white/70 tabular">≈ {formatFCFA(monthly)} · {formatPool(centimesToPoolDisplay(perSale))} par vente</p>
      </div>
      <p className="mt-3 text-[11px] text-white/40">Simulation indicative, sans garantie de revenus. Les gains dépendent uniquement de vos ventes réelles.</p>
    </div>
  );
}

const TESTIMONIALS = [
  { name: "Mireille N.", role: "Vendeuse · Douala, Bonapriso", img: "https://images.pexels.com/photos/14538746/pexels-photo-14538746.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop", text: "Je partage mes liens dans mes statuts WhatsApp. Mes clientes paient par MoMo, sont livrées en 24 h, et je vois mes POOL monter en temps réel. Enfin une plateforme sérieuse." },
  { name: "Serge K.", role: "Étudiant · Yaoundé, Ngoa-Ekellé", img: "https://images.pexels.com/photos/8199227/pexels-photo-8199227.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop", text: "Aucun pack à acheter, c'est ce qui m'a convaincu. J'ai fait mon premier retrait Orange Money après 3 semaines. Le suivi des clics m'aide à savoir quoi publier." },
  { name: "Aïcha B.", role: "Cliente · Garoua", img: "https://images.pexels.com/photos/3756985/pexels-photo-3756985.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop", text: "J'ai commandé un blender via le lien d'une amie, sans créer de compte. Paiement Orange Money, livraison propre. Je recommande !" },
  { name: "Patrick E.", role: "Commerçant · Bafoussam", img: "https://images.pexels.com/photos/33836443/pexels-photo-33836443.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop", text: "Je vends sans stock ni local. ALWENAS gère la livraison et le SAV, moi je me concentre sur ma clientèle. Les commissions sont claires, tout est traçable." },
  { name: "Grâce T.", role: "Vendeuse · Buea", img: "https://images.pexels.com/photos/7428582/pexels-photo-7428582.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop", text: "La connexion par code e-mail est hyper simple et rassurante. Le portefeuille est limpide : je convertis, je retire, c'est fait." },
  { name: "Junior M.", role: "Créateur TikTok · Kribi", img: "https://images.pexels.com/photos/4526407/pexels-photo-4526407.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop", text: "Mes vidéos de déballage + mon lien en bio = des ventes chaque semaine. Le power bank part comme des beignets pendant les coupures !" },
];

export default function Landing() {
  const products = useLoad(() => api.listProducts({ filter: "popular", pageSize: 4 }), []);
  useEffect(() => { document.title = "ALWENAS SHOP — Achetez, partagez, gagnez au Cameroun"; }, []);

  return (
    <div className="overflow-x-clip bg-white">
      <Navbar />

      {/* HERO */}
      <section className="hero-mesh relative pt-28 sm:pt-36" aria-labelledby="hero-title">
        <div aria-hidden className="grid-fade absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 lg:grid-cols-2 lg:pb-28">
          <div>
            <Reveal><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-emerald-700 backdrop-blur"><span className="h-2 w-2 animate-pulse-ring rounded-full bg-emerald-500" />🇨🇲 La marketplace qui récompense chaque vente</span></Reveal>
            <Reveal delay={80}><h1 id="hero-title" className="mt-6 font-display text-[40px] font-extrabold leading-[1.05] sm:text-6xl lg:text-[68px]">Achetez malin.<br />Partagez.<br /><span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 bg-clip-text text-transparent">Gagnez en POOL.</span></h1></Reveal>
            <Reveal delay={160}><p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">Des produits de qualité livrés partout au Cameroun, et un lien unique pour chaque produit. Quand quelqu'un achète grâce à vous, vous touchez une commission — retirable sur <strong className="text-ink">MTN MoMo</strong> ou <strong className="text-ink">Orange Money</strong>.</p></Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/inscription" className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl brand-gradient px-7 font-semibold text-white shadow-xl shadow-emerald-600/30 transition hover:shadow-emerald-600/50 hover:brightness-110">Créer un compte maintenant<ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></Link>
                <Link to="/boutique" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-7 font-semibold backdrop-blur transition hover:border-slate-300 hover:bg-white">Voir la boutique</Link>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                {["Accès vendeur à vie : 1 500 FCFA", "Connexion sécurisée", "Livraison ou retrait boutique"].map((t) => <li key={t} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />{t}</li>)}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={200}><PhoneMockup /></Reveal>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="border-y border-slate-100 bg-white py-14" aria-label="Ils nous font confiance">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <Counter to={12500} suffix="+" label="membres vendeurs" />
            <Counter to={48000} suffix="+" label="commandes livrées" />
            <Counter to={10} label="régions desservies" />
            <div className="text-center"><p className="flex items-center justify-center gap-1 font-display text-3xl font-extrabold sm:text-4xl">4,8<Star className="h-6 w-6 fill-amber-400 text-amber-400" /></p><p className="mt-1 text-sm text-slate-500">note moyenne clients</p></div>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm font-bold">
            <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Paiements :</span>
            <span className="rounded-xl bg-[#ffcc00] px-3 py-1.5 text-ink">MTN MoMo</span><span className="rounded-xl bg-[#ff7900] px-3 py-1.5 text-white">Orange Money</span><span className="rounded-xl bg-slate-100 px-3 py-1.5 text-[#1a1f71]">VISA</span><span className="rounded-xl bg-slate-100 px-3 py-1.5">Mastercard</span>
          </div>
        </div>
        <div className="relative mt-10 overflow-hidden" aria-hidden>
          <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white" /><div className="absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white" />
          <div className="animate-marquee flex w-max gap-3">{[...CITIES, ...CITIES].map((c, i) => <span key={i} className="whitespace-nowrap rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">📍 {c}</span>)}</div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="fonctionnalites" className="scroll-mt-20 py-24 sm:py-32" aria-labelledby="f-title">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Fonctionnalités</p><h2 id="f-title" className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Tout pour vendre depuis votre téléphone.</h2><p className="mt-4 text-lg text-slate-600">Pas de stock, pas de local, pas de livraison à gérer. Vous partagez, on s'occupe du reste.</p></Reveal>
          <div className="mt-16 grid gap-4 md:grid-cols-3 md:grid-rows-2">
            <Reveal className="md:col-span-2 md:row-span-1"><div className="group relative h-full overflow-hidden rounded-[28px] bg-ink p-8 text-white">
              <div aria-hidden className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/30 blur-3xl transition duration-700 group-hover:bg-emerald-400/40" />
              <Link2 className="relative h-10 w-10 text-emerald-400" /><h3 className="relative mt-5 font-display text-2xl font-bold">Un lien unique par produit</h3><p className="relative mt-2 max-w-md text-white/70">Générez en un geste votre lien alwenasshop.com/r/XXXXXX et partagez-le sur WhatsApp, Facebook, TikTok ou Instagram. Chaque vente vous est attribuée pendant 30 jours.</p>
              <div className="relative mt-6 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 font-mono text-sm ring-1 ring-white/15">alwenasshop.com/r/8K72LP <span className="rounded-lg bg-emerald-500 px-2 py-0.5 text-[10px] font-bold">COPIÉ ✓</span></div>
            </div></Reveal>
            <Reveal delay={80}><div className="h-full rounded-[28px] bg-gradient-to-br from-amber-50 to-orange-50 p-8 ring-1 ring-amber-100"><span className="grid h-12 w-12 place-items-center rounded-2xl pool-gradient"><Coins className="h-6 w-6" /></span><h3 className="mt-5 font-display text-xl font-bold">Portefeuille POOL</h3><p className="mt-2 text-sm text-slate-600">1 POOL = 550 FCFA. Solde lisible au centime, en attente et disponible clairement séparés.</p></div></Reveal>
            {[
              { i: MousePointerClick, t: "Suivi en temps réel", d: "Clics, commandes, montant vendu et commission par lien.", c: "from-sky-50 to-indigo-50 ring-sky-100", ic: "bg-sky-500" },
              { i: Smartphone, t: "Retraits MoMo & Orange", d: "Convertissez, retirez, recevez sous 24 h ouvrées.", c: "from-emerald-50 to-teal-50 ring-emerald-100", ic: "bg-emerald-500" },
              { i: Lock, t: "Connexion sécurisée", d: "E-mail et mot de passe ; vérification e-mail à l'inscription.", c: "from-slate-50 to-slate-100 ring-slate-200", ic: "bg-ink" },
            ].map((f, i) => (
              <Reveal key={f.t} delay={120 + i * 80}><div className={cn("group h-full rounded-[28px] bg-gradient-to-br p-8 ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-xl", f.c)}><span className={cn("grid h-12 w-12 place-items-center rounded-2xl text-white transition group-hover:scale-110", f.ic)}><f.i className="h-6 w-6" /></span><h3 className="mt-5 font-display text-xl font-bold">{f.t}</h3><p className="mt-2 text-sm text-slate-600">{f.d}</p></div></Reveal>
            ))}
          </div>

          <div className="mt-24 grid gap-6 md:grid-cols-4">
            {[{ i: Package, t: "Choisissez", d: "un produit dans la boutique" }, { i: Link2, t: "Générez", d: "votre lien personnalisé" }, { i: MessageCircle, t: "Partagez", d: "à vos contacts et réseaux" }, { i: Wallet, t: "Encaissez", d: "après livraison au client" }].map((s, i) => (
              <Reveal key={s.t} delay={i * 90}><div className="relative text-center">
                {i < 3 && <div aria-hidden className="absolute left-[60%] top-8 hidden h-px w-[80%] bg-gradient-to-r from-emerald-300 to-transparent md:block" />}
                <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-lg ring-1 ring-slate-100"><s.i className="h-7 w-7 text-emerald-600" /><span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{i + 1}</span></span>
                <p className="mt-4 font-display text-lg font-bold">{s.t}</p><p className="text-sm text-slate-500">{s.d}</p>
              </div></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="produits" className="scroll-mt-20 bg-[#f7f8fa] py-24 sm:py-32" aria-labelledby="p-title">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Produits</p><h2 id="p-title" className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Des best-sellers<br className="hidden sm:block" /> faciles à recommander.</h2></div>
            <Link to="/boutique" className="group inline-flex items-center gap-1 font-semibold text-emerald-700">Toute la boutique<ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" /></Link>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {(products.data?.items ?? Array.from({ length: 4 }).map(() => null)).map((p, i) => (
              <Reveal key={p?.id ?? i} delay={i * 80}>{p ? (
                <Link to={`/produit/${p.slug}`} className="group block overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70 transition duration-500 hover:-translate-y-1.5 hover:shadow-2xl">
                  <div className="relative aspect-square overflow-hidden bg-slate-100"><img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" /><span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-amber-200 backdrop-blur"><Coins className="h-3 w-3" />+{formatPool(centimesToPoolDisplay(p.commission_preview))}</span></div>
                  <div className="p-4"><p className="line-clamp-1 text-sm font-semibold">{p.name}</p><p className="mt-1 font-display font-bold tabular">{formatFCFA(p.final_price)}</p></div>
                </Link>
              ) : <div className="skeleton aspect-[3/4] rounded-3xl" />}</Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ADVANTAGES */}
      <section id="avantages" className="scroll-mt-20 py-24 sm:py-32" aria-labelledby="a-title">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Avantages</p><h2 id="a-title" className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Gagnant pour tout le monde.</h2></Reveal>
          <div className="mt-16 grid gap-6 lg:grid-cols-2">
            <Reveal><div className="h-full rounded-[28px] border border-slate-200/70 p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">🛍️ Pour les acheteurs</span>
              <ul className="mt-6 space-y-4">{[["Produits vérifiés", "Sélection rigoureuse, avis clients authentiques."], ["Paiement mobile sécurisé", "MoMo, Orange Money ou carte. Confirmation par le prestataire."], ["Livraison rapide", "24–72 h à Douala et Yaoundé, partout au Cameroun."], ["Retour sous 7 jours", "Produit non conforme ? Remboursement garanti."]].map(([t, d]) => <li key={t} className="flex gap-3"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="font-semibold">{t}</p><p className="text-sm text-slate-500">{d}</p></div></li>)}</ul>
            </div></Reveal>
            <Reveal delay={100}><div className="relative h-full overflow-hidden rounded-[28px] brand-gradient p-8 text-white">
              <div aria-hidden className="animate-drift absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-300/30 blur-3xl" />
              <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">💼 Pour les vendeurs</span>
              <ul className="relative mt-6 space-y-4">{[["Mise de départ minime", "Pas de stock : accès vendeur à vie pour 1 500 FCFA une seule fois."], ["5 à 12 % de commission", "Taux affiché sur chaque produit, calculé au centime."], ["Transparence totale", "Chaque opération est horodatée dans votre historique."], ["Réseau d'entraide", "Parrainez vos proches et progressez ensemble."]].map(([t, d]) => <li key={t} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><p className="font-semibold">{t}</p><p className="text-sm text-white/70">{d}</p></div></li>)}</ul>
            </div></Reveal>
          </div>
          <div className="mt-6 grid items-center gap-6 overflow-hidden rounded-[32px] bg-ink p-6 sm:p-10 lg:grid-cols-2">
            <Reveal><div className="text-white">
              <h3 className="font-display text-3xl font-extrabold">Combien pouvez-vous gagner ?</h3>
              <p className="mt-3 text-white/70">Vos revenus dépendent uniquement des ventes réelles réalisées grâce à vos liens. Pas d'argent issu des inscriptions : un modèle sain, durable et transparent.</p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">{[["1 POOL", "= 550 FCFA"], ["30 j", "de classement"], ["À vie", "accès vendeur"]].map(([a, b]) => <div key={a} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10"><p className="font-display text-lg font-bold text-amber-300">{a}</p><p className="text-[11px] text-white/60">{b}</p></div>)}</div>
            </div></Reveal>
            <Reveal delay={120}><Simulator /></Reveal>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="temoignages" className="scroll-mt-20 bg-[#f7f8fa] py-24 sm:py-32" aria-labelledby="t-title">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Témoignages</p><h2 id="t-title" className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Ils vendent déjà partout au Cameroun.</h2></Reveal>
          <div className="mt-16 columns-1 gap-5 sm:columns-2 lg:columns-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={(i % 3) * 90} className="mb-5 break-inside-avoid"><figure className="rounded-[28px] bg-white p-7 ring-1 ring-slate-200/70 transition duration-300 hover:shadow-xl">
                <Quote className="h-7 w-7 text-emerald-200" /><div className="mt-2 flex text-amber-400">{Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}</div>
                <blockquote className="mt-3 leading-relaxed text-slate-700">« {t.text} »</blockquote>
                <figcaption className="mt-5 flex items-center gap-3"><img src={t.img} alt="" loading="lazy" className="h-11 w-11 rounded-full object-cover" /><div><p className="text-sm font-bold">{t.name}</p><p className="text-xs text-slate-500">{t.role}</p></div></figcaption>
              </figure></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" className="scroll-mt-20 py-24 sm:py-32" aria-labelledby="pr-title">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Tarifs</p><h2 id="pr-title" className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">1 500 FCFA pour vendre.<br />Gratuit pour acheter.</h2><p className="mt-4 text-lg text-slate-600">Un seul abonnement transparent, sans pack ni frais cachés. L'abonnement ne rémunère personne : seules les ventes réelles rapportent.</p></Reveal>
          <div className="mt-16 grid gap-5 lg:grid-cols-3">
            {[
              { n: "Client", p: "Gratuit", d: "Pour acheter en toute confiance.", f: ["Commande sans compte", "Paiement MoMo / Orange / carte", "Suivi de commande", "Retour sous 7 jours"], cta: "Visiter la boutique", to: "/boutique", hi: false },
              { n: "Vendeur", p: "1 500 FCFA", per: "une seule fois", d: "Accès à vie pour gagner sur chaque vente réelle.", f: ["Liens illimités par produit", "Commission 5 à 12 %", "Portefeuille POOL + historique", "Retraits MTN & Orange (frais 1 %)", "Parrainage & réseau"], cta: "Créer un compte maintenant", to: "/inscription", hi: true },
              { n: "Vendeur Pro", p: "Inclus", d: "Débloqué dès 20 ventes livrées / mois, sans surcoût.", f: ["Tout le plan Vendeur", "Retraits prioritaires", "Kit visuels marketing", "Formation & communauté privée", "Conseiller dédié"], cta: "Commencer maintenant", to: "/inscription", hi: false },
            ].map((t, i) => (
              <Reveal key={t.n} delay={i * 100}><div className={cn("relative flex h-full flex-col rounded-[28px] p-8 transition duration-300 hover:-translate-y-1", t.hi ? "bg-ink text-white shadow-2xl shadow-slate-900/30 lg:-my-4 lg:py-12" : "bg-white ring-1 ring-slate-200/70")}>
                {t.hi && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full pool-gradient px-3 py-1 text-xs font-bold text-ink">⭐ Le plus choisi</span>}
                <p className={cn("text-sm font-bold", t.hi ? "text-amber-300" : "text-emerald-600")}>{t.n}</p>
                <p className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">{t.p}{"per" in t && t.per && <span className={cn("ml-1 text-base font-semibold", t.hi ? "text-white/60" : "text-slate-400")}>{t.per}</span>}</p>
                <p className={cn("mt-2 text-sm", t.hi ? "text-white/70" : "text-slate-500")}>{t.d}</p>
                <ul className="mt-7 flex-1 space-y-3 text-sm">{t.f.map((x) => <li key={x} className="flex gap-2.5"><Check className={cn("h-5 w-5 shrink-0", t.hi ? "text-amber-300" : "text-emerald-600")} />{x}</li>)}</ul>
                <Link to={t.to} className={cn("mt-8 inline-flex h-12 items-center justify-center rounded-2xl font-semibold transition", t.hi ? "pool-gradient text-ink hover:brightness-105" : "bg-slate-100 hover:bg-slate-200")}>{t.cta}</Link>
              </div></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-[#f7f8fa] py-24 sm:py-32" aria-labelledby="faq-title">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-5">
          <Reveal className="lg:col-span-2"><p className="text-sm font-bold uppercase tracking-widest text-emerald-600">FAQ</p><h2 id="faq-title" className="mt-3 font-display text-4xl font-extrabold">Questions fréquentes</h2><p className="mt-4 text-slate-600">Une autre question ? Écrivez-nous sur WhatsApp ou à support@alwenasshop.com.</p><Link to="/aide" className="mt-6 inline-flex items-center gap-1 font-semibold text-emerald-700">Centre d'aide <ChevronRight className="h-4 w-4" /></Link></Reveal>
          <Reveal delay={100} className="lg:col-span-3"><FaqList /></Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-24" aria-labelledby="cta-title">
        <Reveal><div className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-ink px-6 py-16 text-center text-white sm:px-16 sm:py-24">
          <div aria-hidden className="animate-drift absolute -left-20 -top-20 h-80 w-80 rounded-full bg-emerald-500/30 blur-3xl" />
          <div aria-hidden className="animate-drift absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-amber-400/25 blur-3xl" style={{ animationDelay: "-8s" }} />
          <Sparkles className="relative mx-auto h-10 w-10 text-amber-300" />
          <h2 id="cta-title" className="relative mt-5 font-display text-4xl font-extrabold sm:text-6xl">Votre téléphone est<br />votre boutique.</h2>
          <p className="relative mx-auto mt-5 max-w-xl text-lg text-white/70">Rejoignez les milliers de Camerounais qui achètent malin et gagnent sur chaque vente. Créez votre compte, puis activez votre accès vendeur à vie pour 1 500 FCFA.</p>
          <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/inscription" className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl pool-gradient px-8 font-bold text-ink shadow-xl shadow-amber-500/30 transition hover:brightness-105">Créer un compte maintenant<ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></Link>
            <Link to="/boutique" className="inline-flex h-14 items-center justify-center rounded-2xl bg-white/10 px-8 font-semibold ring-1 ring-white/20 transition hover:bg-white/15">Explorer la boutique</Link>
          </div>
          <div className="relative mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/60">{[[ShieldCheck, "Paiements sécurisés"], [Truck, "Livraison nationale"], [Zap, "Retraits < 24 h"], [Users, "Support local"]].map(([I, t]) => { const Ic = I as typeof ShieldCheck; return <span key={t as string} className="flex items-center gap-1.5"><Ic className="h-4 w-4" />{t as string}</span>; })}</div>
        </div></Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-slate-500">La marketplace camerounaise qui récompense chaque vente réelle. Achetez, partagez, gagnez.</p>
            <div className="mt-5 flex gap-2">
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 transition hover:bg-emerald-50 hover:text-emerald-700"><MessageCircle className="h-5 w-5" /></a>
              <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 transition hover:bg-blue-50 hover:text-blue-700"><FacebookIcon className="h-5 w-5" /></a>
            </div>
          </div>
          {[
            ["Plateforme", [["Boutique", "/boutique"], ["Catégories", "/categories"], ["Se connecter", "/"], ["Découvrir", "/decouvrir"]]],
            ["Vendre", [["Créer un compte", "/"], ["Politique d'affiliation", "/legal/affiliation"], ["Commissions", "/legal/commissions"], ["Retraits", "/legal/retrait"]]],
            ["Aide", [["FAQ", "/aide"], ["Livraison", "/legal/livraison"], ["Remboursement", "/legal/remboursement"], ["Conditions de vente", "/legal/vente"]]],
            ["Légal", [["CGU", "/legal/cgu"], ["Confidentialité", "/legal/confidentialite"], ["Cookies", "/legal/cookies"]]],
          ].map(([h, links]) => (
            <div key={h as string}><p className="text-sm font-bold">{h as string}</p><ul className="mt-4 space-y-2.5 text-sm text-slate-500">{(links as string[][]).map(([l, to]) => <li key={l}><Link to={to} className="transition hover:text-ink">{l}</Link></li>)}</ul></div>
          ))}
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-slate-400 sm:flex-row">
            <p>© {new Date().getFullYear()} ALWENAS SHOP · Douala, Cameroun · support@alwenasshop.com</p>
            <p className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Connexion chiffrée · Paiements via prestataires agréés</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
