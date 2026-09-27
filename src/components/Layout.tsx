import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Bell, Home, LayoutGrid, Link2, Wallet, User, ShoppingBag, Package, TrendingUp, Coins, Users, Settings, HelpCircle, LogOut, ArrowDownToLine, History, Shield, ReceiptText, Menu, X, Crown } from "lucide-react";
import { Logo } from "./ui";
import { useApp } from "../lib/store";
import { cn } from "../utils/cn";

const SIDE = [
  { to: "/app", label: "Accueil", icon: Home },
  { to: "/boutique", label: "Boutique", icon: LayoutGrid },
  { to: "/liens", label: "Mes liens", icon: Link2 },
  { to: "/ventes", label: "Mes ventes", icon: TrendingUp },
  { to: "/commissions", label: "Commissions", icon: Coins },
  { to: "/portefeuille", label: "Portefeuille", icon: Wallet },
  { to: "/retrait", label: "Retraits", icon: ArrowDownToLine },
  { to: "/historique", label: "Historique", icon: History },
  { to: "/commandes", label: "Mes commandes", icon: Package },
  { to: "/parrainage", label: "Parrainage", icon: Users },
  { to: "/abonnement", label: "Abonnement", icon: Crown },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profil", label: "Profil", icon: User },
  { to: "/parametres", label: "Paramètres", icon: Settings },
  { to: "/aide", label: "Aide & FAQ", icon: HelpCircle },
];
const BOTTOM = [
  { to: "/app", label: "Accueil", icon: Home },
  { to: "/boutique", label: "Boutique", icon: LayoutGrid },
  { to: "/liens", label: "Vendre", icon: Link2, center: true },
  { to: "/portefeuille", label: "Portefeuille", icon: Wallet },
  { to: "/profil", label: "Profil", icon: User },
];

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token, ready, me } = useApp();
  const loc = useLocation();
  if (!token) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  if (!ready || !me) return <div className="grid min-h-screen place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" /></div>;
  // Compte provisoire : aucun espace membre avant confirmation du paiement d'inscription.
  if (!me.subscription.active && loc.pathname !== "/abonnement") return <Navigate to="/abonnement" replace />;
  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { me, unread, cartCount, logout } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); window.scrollTo({ top: 0 }); }, [loc.pathname]);
  const doLogout = async () => { await logout(); nav("/"); };

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-40 border-x-0 border-t-0 border-b border-slate-200/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to={me ? "/app" : "/boutique"} aria-label="ALWENAS SHOP — accueil"><Logo size="sm" /></Link>
          <div className="flex items-center gap-1.5">
            <Link to="/panier" aria-label={`Panier (${cartCount})`} className="relative grid h-10 w-10 place-items-center rounded-xl transition hover:bg-slate-100">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">{cartCount}</span>}
            </Link>
            {me ? (
              <>
                <Link to="/notifications" aria-label={`Notifications (${unread} non lues)`} className="relative grid h-10 w-10 place-items-center rounded-xl transition hover:bg-slate-100">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
                </Link>
                <button onClick={() => setMenu(true)} aria-label="Ouvrir le menu" className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button>
                <Link to="/profil" className="ml-1 hidden h-10 items-center gap-2 rounded-xl pl-1 pr-3 transition hover:bg-slate-100 lg:flex">
                  <span className="grid h-8 w-8 place-items-center rounded-lg brand-gradient text-sm font-bold text-white">{me.name.charAt(0).toUpperCase()}</span>
                  <span className="max-w-[120px] truncate text-sm font-semibold">{me.name}</span>
                </Link>
              </>
            ) : (
              <Link to="/" className="ml-1 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">Se connecter</Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 sm:px-6">
        {me && (
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto py-6 no-scrollbar lg:block">
            <nav className="space-y-0.5" aria-label="Navigation principale">
              {SIDE.map((i) => (
                <NavLink key={i.to} to={i.to} end className={({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", isActive ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/70" : "text-slate-600 hover:bg-white/70 hover:text-ink")}>
                  <i.icon className="h-[18px] w-[18px]" />{i.label}
                </NavLink>
              ))}
              {me.roles.length > 0 && <NavLink to="/admin" className="mt-3 flex items-center gap-3 rounded-xl bg-ink px-3 py-2.5 text-sm font-semibold text-white"><Shield className="h-[18px] w-[18px]" />Administration</NavLink>}
              <button onClick={doLogout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut className="h-[18px] w-[18px]" />Déconnexion</button>
            </nav>
          </aside>
        )}
        <main className={cn("page-in min-w-0 flex-1 py-6", me ? "pb-28 lg:pb-10" : "pb-16")} key={loc.pathname}>{children}</main>
      </div>

      {me && (
        <nav className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 border-t border-slate-200/60 lg:hidden" aria-label="Navigation mobile">
          <div className="mx-auto grid h-[68px] max-w-md grid-cols-5 items-center px-2">
            {BOTTOM.map((i) => (
              <NavLink key={i.to} to={i.to} end className={({ isActive }) => cn("flex flex-col items-center gap-1 text-[11px] font-semibold transition", isActive ? "text-emerald-700" : "text-slate-500")}>
                {i.center ? (
                  <span className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl brand-gradient text-white shadow-xl shadow-emerald-600/30 ring-4 ring-[#f7f8fa]"><i.icon className="h-6 w-6" /></span>
                ) : <i.icon className="h-[22px] w-[22px]" />}
                {i.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {menu && me && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setMenu(false)}>
          <div className="page-in absolute right-0 top-0 h-full w-[82%] max-w-xs overflow-y-auto bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between"><Logo size="sm" /><button onClick={() => setMenu(false)} aria-label="Fermer le menu" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <nav className="space-y-0.5">
              {SIDE.map((i) => <NavLink key={i.to} to={i.to} end className={({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium", isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-700")}><i.icon className="h-5 w-5" />{i.label}</NavLink>)}
              <NavLink to="/legal/cgu" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700"><ReceiptText className="h-5 w-5" />Mentions & politiques</NavLink>
              {me.roles.length > 0 && <NavLink to="/admin" className="flex items-center gap-3 rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white"><Shield className="h-5 w-5" />Administration</NavLink>}
              <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-rose-600"><LogOut className="h-5 w-5" />Déconnexion</button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
