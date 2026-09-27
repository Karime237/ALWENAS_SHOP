import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Search, Star, Truck, ShieldCheck, Minus, Plus, ShoppingCart, Link2, Copy, Check, Share2, MessageCircle, Package, Coins, RotateCcw, Tag, Flame, Sparkles, LayoutGrid } from "lucide-react";
import { FacebookIcon as Facebook } from "../components/ui";
import { useApp, useLoad, deviceId } from "../lib/store";
import * as api from "../server/api";
import type { ProductDTO } from "../server/api";
import { Button, Card, Empty, ErrorBox, Modal, PageHeader, Skeleton, copyText, shareLinks, shareUrl, Select } from "../components/ui";
import { formatFCFA, formatPool, centimesToPoolDisplay } from "../lib/money";
import { cn } from "../utils/cn";

export function ProductCard({ p, onBuy }: { p: ProductDTO; onBuy?: (p: ProductDTO) => void }) {
  const off = p.promo_price ? Math.round((1 - p.promo_price / p.price) * 100) : 0;
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(10,16,32,0.25)]">
      <Link to={`/produit/${p.slug}`} className="relative block aspect-square overflow-hidden bg-slate-100">
        <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {off > 0 && <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white">-{off}%</span>}
          {p.is_new && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink backdrop-blur">Nouveau</span>}
        </div>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-amber-200 backdrop-blur"><Coins className="h-3 w-3" />+{formatPool(centimesToPoolDisplay(p.commission_preview))}</span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{p.category}</p>
        <Link to={`/produit/${p.slug}`} className="mt-1 line-clamp-2 text-sm font-semibold leading-snug hover:text-emerald-700 sm:text-[15px]">{p.name}</Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-base font-bold tabular sm:text-lg">{formatFCFA(p.final_price)}</span>
          {p.promo_price && <span className="text-xs text-slate-400 line-through tabular">{formatFCFA(p.price)}</span>}
        </div>
        <p className={cn("mt-1 text-xs font-medium", p.stock === 0 ? "text-rose-600" : p.stock < 5 ? "text-amber-600" : "text-emerald-600")}>{p.stock === 0 ? "Rupture de stock" : p.stock < 5 ? `Plus que ${p.stock} en stock` : "En stock"}</p>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <Link to={`/produit/${p.slug}`} className="flex h-10 items-center justify-center rounded-xl border border-slate-200 text-xs font-semibold transition hover:bg-slate-50 sm:text-sm">Voir le produit</Link>
          <button disabled={!p.in_stock} onClick={() => onBuy?.(p)} className="flex h-10 items-center justify-center rounded-xl bg-ink text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40 sm:text-sm">Acheter</button>
        </div>
      </div>
    </article>
  );
}

export function useBuy() {
  const { refreshCart, toast } = useApp(); const nav = useNavigate();
  return async (p: ProductDTO, qty = 1, go = true) => {
    try { await api.addToCart(deviceId(), p.id, qty); refreshCart(); toast(`${p.name} ajouté au panier`); if (go) nav("/panier"); }
    catch (e) { toast((e as Error).message, "error"); }
  };
}

const FILTERS = [
  { v: "", label: "Tous", icon: LayoutGrid }, { v: "promo", label: "Promotions", icon: Tag },
  { v: "popular", label: "Populaires", icon: Flame }, { v: "new", label: "Nouveautés", icon: Sparkles },
] as const;

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const buy = useBuy();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const category = params.get("categorie") ?? "";
  const filter = (params.get("filtre") ?? "") as "" | "promo" | "popular" | "new";
  const sort = (params.get("tri") ?? "recent") as "recent";
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ProductDTO[]>([]);
  const cats = useLoad(() => api.listCategories(), []);
  const { data, loading, error } = useLoad(() => api.listProducts({ search: params.get("q") ?? "", category, filter: filter || undefined, sort, page, pageSize: 8 }), [params.toString(), page]);
  useEffect(() => { setPage(1); }, [params]);
  useEffect(() => { if (data) setItems((prev) => (data.page === 1 ? data.items : [...prev, ...data.items.filter((x) => !prev.some((p) => p.id === x.id))])); }, [data]);
  useEffect(() => { document.title = "Boutique — ALWENAS SHOP"; }, []);
  useEffect(() => { const t = setTimeout(() => { const n = new URLSearchParams(params); if (search) n.set("q", search); else n.delete("q"); if (n.toString() !== params.toString()) setParams(n, { replace: true }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line
  const setP = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n); };

  return (
    <div>
      <PageHeader title="Boutique" subtitle="Produits sélectionnés, livrés partout au Cameroun" />
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit…" aria-label="Rechercher un produit" className="h-13 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-[15px] shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15" />
      </div>
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <button onClick={() => setP("categorie", "")} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition", !category ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300")}>Toutes</button>
        {cats.data?.map((c) => (
          <button key={c.id} onClick={() => setP("categorie", c.slug)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition", category === c.slug ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300")}>{c.emoji} {c.name}</button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => <button key={f.v} onClick={() => setP("filtre", f.v)} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition", filter === f.v ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "text-slate-500 hover:bg-white")}><f.icon className="h-3.5 w-3.5" />{f.label}</button>)}
        </div>
        <Select value={sort} onChange={(e) => setP("tri", e.target.value === "recent" ? "" : e.target.value)} aria-label="Trier" className="h-9 w-auto shrink-0 rounded-xl px-3 text-xs font-semibold">
          <option value="recent">Plus récents</option><option value="price_asc">Prix croissant</option><option value="price_desc">Prix décroissant</option><option value="commission">Meilleure commission</option>
        </Select>
      </div>
      {error && <div className="mt-4"><ErrorBox text={error} /></div>}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} p={p} onBuy={(x) => buy(x)} />)}
        {loading && page === 1 && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4.4]" />)}
      </div>
      {!loading && items.length === 0 && <Empty icon={<Search className="h-6 w-6" />} title="Aucun produit trouvé" text="Essayez un autre mot-clé ou une autre catégorie." />}
      {data && data.page < data.pages && <div className="mt-8 flex justify-center"><Button variant="outline" loading={loading} onClick={() => setPage((p) => p + 1)}>Charger plus de produits</Button></div>}
      {data && <p className="mt-4 text-center text-xs text-slate-400">{items.length} sur {data.total} produit(s)</p>}
    </div>
  );
}

export function CategoriesPage() {
  const { data } = useLoad(() => api.listCategories(), []);
  return (
    <div>
      <PageHeader title="Catégories" subtitle="Explorez notre sélection par univers" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data?.map((c) => (
          <Link key={c.id} to={`/boutique?categorie=${c.slug}`} className="group rounded-3xl border border-slate-200/70 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <span className="text-3xl">{c.emoji}</span><p className="mt-3 font-semibold group-hover:text-emerald-700">{c.name}</p><p className="text-xs text-slate-500">{c.count} produit(s)</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ProductPage() {
  const { slug = "" } = useParams();
  const { token, me, toast } = useApp();
  const buy = useBuy();
  const { data, error, loading } = useLoad(() => api.getProduct(slug), [slug]);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [link, setLink] = useState<string | null>(null);
  const [genLoading, setGen] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setImg(0); setQty(1); }, [slug]);
  useEffect(() => { if (data) document.title = `${data.product.name} — ${formatFCFA(data.product.final_price)} | ALWENAS SHOP`; }, [data]);
  if (error) return <ErrorBox text={error} />;
  if (loading || !data) return <div className="grid gap-8 lg:grid-cols-2"><Skeleton className="aspect-square" /><div className="space-y-3"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-32" /></div></div>;
  const p = data.product;
  const commission = p.commission_preview * qty;

  const generate = async () => {
    if (!token) return;
    setGen(true);
    try { const r = await api.createAffiliateLink(token, p.id); setLink(shareUrl(`/r/${r.code}`)); } catch (e) { toast((e as Error).message, "error"); } finally { setGen(false); }
  };
  const share = link ? shareLinks(link, `🔥 ${p.name} à ${formatFCFA(p.final_price)} sur ALWENAS SHOP. Livraison rapide + paiement MoMo/Orange Money 👉`) : null;

  return (
    <div>
      <nav aria-label="Fil d'Ariane" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <Link to="/boutique" className="hover:text-ink">Boutique</Link><span>/</span><span>{p.category}</span><span>/</span><span className="truncate font-medium text-ink">{p.name}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-slate-100">
            <img src={p.images[img]} alt={p.name} className="h-full w-full object-cover" />
            {p.promo_price && <span className="absolute left-4 top-4 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">-{Math.round((1 - p.promo_price / p.price) * 100)}%</span>}
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {p.images.map((src, i) => <button key={src} onClick={() => setImg(i)} aria-label={`Image ${i + 1}`} className={cn("h-16 w-16 overflow-hidden rounded-2xl ring-2 transition sm:h-20 sm:w-20", i === img ? "ring-emerald-500" : "ring-transparent opacity-70 hover:opacity-100")}><img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /></button>)}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{p.category}</p>
          <h1 className="mt-2 font-display text-2xl font-bold uppercase leading-tight sm:text-3xl">{p.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm"><span className="flex text-amber-400">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-4 w-4", i < Math.round(p.rating) ? "fill-current" : "")} />)}</span><span className="font-semibold">{p.rating}</span><span className="text-slate-400">({p.reviews_count} avis)</span></div>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-3xl font-extrabold tabular">{formatFCFA(p.final_price)}</span>
            {p.promo_price && <span className="text-lg text-slate-400 line-through tabular">{formatFCFA(p.price)}</span>}
          </div>
          <p className={cn("mt-2 text-sm font-semibold", p.stock === 0 ? "text-rose-600" : p.stock < 5 ? "text-amber-600" : "text-emerald-600")}>{p.stock === 0 ? "Rupture de stock" : p.stock < 5 ? `Plus que ${p.stock} en stock — commandez vite` : `En stock · ${p.stock} disponibles`}</p>
          <p className="mt-5 leading-relaxed text-slate-600">{p.description}</p>
          <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {p.features.map((f) => <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{f}</li>)}
          </ul>

          <div className="mt-7 flex items-center gap-4">
            <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-white" role="group" aria-label="Quantité">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-12 place-items-center rounded-l-2xl hover:bg-slate-50" aria-label="Diminuer"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center font-bold tabular" aria-live="polite">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(10, p.stock, q + 1))} className="grid h-12 w-12 place-items-center rounded-r-2xl hover:bg-slate-50" aria-label="Augmenter"><Plus className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-slate-500">Total : <strong className="text-ink tabular">{formatFCFA(p.final_price * qty)}</strong></p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button variant="outline" size="lg" disabled={!p.in_stock} onClick={() => buy(p, qty, false)}><ShoppingCart className="h-5 w-5" />AJOUTER AU PANIER</Button>
            <Button variant="dark" size="lg" disabled={!p.in_stock} onClick={() => buy(p, qty)}>ACHETER MAINTENANT</Button>
          </div>

          {me ? (
            <Card className="mt-5 border-amber-200/70 bg-gradient-to-br from-amber-50 to-white">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl pool-gradient text-ink"><Coins className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Vendez ce produit et gagnez <span className="text-pool-600">{formatPool(centimesToPoolDisplay(commission))}</span></p>
                  <p className="text-xs text-slate-500">Commission {p.commission_bps / 100} % · {formatFCFA(commission)} par vente de {qty} unité(s). Votre client achète sans abonnement via ce lien. Il choisit livraison à domicile ou retrait en boutique ; la commission est libérée après remise validée et délai de retour.</p>
                </div>
              </div>
              {me.subscription.active ? (
                <Button variant="pool" className="mt-4 w-full" loading={genLoading} onClick={generate}><Link2 className="h-4 w-4" />GÉNÉRER MON LIEN</Button>
              ) : (
                <Link to="/abonnement" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"><Link2 className="h-4 w-4 shrink-0" />Activer l'accès à vie (1 500 FCFA) pour générer mon lien</Link>
              )}
            </Card>
          ) : (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">💡 Vous voulez gagner de l'argent en partageant ce produit ? <Link to="/inscription" className="font-semibold text-emerald-700">Créez votre compte vendeur maintenant</Link> (abonnement 1 500 FCFA).</p>
          )}

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70"><Truck className="h-5 w-5 text-emerald-600" /><span>Livraison {p.delivery_days}</span></div>
            <div className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70"><ShieldCheck className="h-5 w-5 text-emerald-600" /><span>Paiement sécurisé</span></div>
            <div className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70"><RotateCcw className="h-5 w-5 text-emerald-600" /><span>Retour 7 jours</span></div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Douala & Yaoundé : 1 500 FCFA · Autres villes : 2 500 FCFA · Offerte dès 50 000 FCFA · SKU {p.sku}</p>
        </div>
      </div>

      <section className="mt-12" aria-labelledby="avis">
        <h2 id="avis" className="font-display text-xl font-bold">Avis clients</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {data.reviews.map((r) => (
            <Card key={r.id}>
              <div className="flex text-amber-400">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-4 w-4", i < r.rating ? "fill-current" : "")} />)}</div>
              <p className="mt-2 text-sm text-slate-700">« {r.text} »</p>
              <p className="mt-3 text-xs font-semibold">{r.author} <span className="font-normal text-slate-400">· {r.city}</span></p>
            </Card>
          ))}
        </div>
      </section>
      {data.related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold">Vous aimerez aussi</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">{data.related.map((r) => <ProductCard key={r.id} p={r} onBuy={(x) => buy(x)} />)}</div>
        </section>
      )}

      <Modal open={!!link} onClose={() => { setLink(null); setCopied(false); }} title="Votre lien de vente">
        <p className="text-sm text-slate-500">Partagez ce lien. Chaque achat effectué dans les 30 jours suivant le clic vous rapporte une commission.</p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-2 pl-4 ring-1 ring-slate-200">
          <span className="min-w-0 flex-1 truncate font-mono text-sm">{link}</span>
          <Button size="sm" variant={copied ? "primary" : "dark"} onClick={async () => { if (link && (await copyText(link))) { setCopied(true); toast("Lien copié !"); } }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copié" : "Copier"}</Button>
        </div>
        {share && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <a href={share.whatsapp} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-2xl bg-[#25D366]/10 p-3 text-xs font-semibold text-[#128C7E]"><MessageCircle className="h-5 w-5" />WhatsApp</a>
            <a href={share.facebook} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-2xl bg-[#1877F2]/10 p-3 text-xs font-semibold text-[#1877F2]"><Facebook className="h-5 w-5" />Facebook</a>
            <button onClick={() => navigator.share ? navigator.share({ title: p.name, url: link! }).catch(() => {}) : copyText(link!).then(() => toast("Lien copié !"))} className="flex flex-col items-center gap-1 rounded-2xl bg-slate-100 p-3 text-xs font-semibold"><Share2 className="h-5 w-5" />Partager</button>
          </div>
        )}
        <Link to="/liens" className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700"><Package className="h-4 w-4" />Voir tous mes liens</Link>
      </Modal>
    </div>
  );
}

export function ReferralRedirect() {
  const { code = "" } = useParams();
  const { token } = useApp();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.resolveAffiliateLink(code, deviceId(), token).then((r) => nav(`/produit/${r.slug}`, { replace: true })).catch((e) => setErr(e.message));
  }, [code]); // eslint-disable-line
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      {err ? <div><ErrorBox text={err} /><Link to="/boutique" className="mt-4 inline-block font-semibold text-emerald-700">Aller à la boutique</Link></div> : <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />}
    </div>
  );
}
