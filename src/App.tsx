import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { AppProvider } from "./lib/store";
import { AppShell, RequireAuth } from "./components/Layout";
import { AccessPage, OtpPage, SignupPage, ResetPasswordPage } from "./pages/Auth";
import { SubscriptionPage, SubscriptionGate } from "./pages/Subscription";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import { ShopPage, CategoriesPage, ProductPage, ReferralRedirect } from "./pages/Shop";
import { CartPage, CheckoutPage, PaymentPage, OrdersPage, OrderDetailPage } from "./pages/Cart";
import { WalletPage, ConvertPage, WithdrawPage, HistoryPage } from "./pages/Wallet";
import { SalesPage, CommissionsPage, LinksPage, ReferralPage } from "./pages/Affiliate";
import { ProfilePage, NotificationsPage, SettingsPage, HelpPage, LegalPage } from "./pages/Account";
import AdminPage from "./pages/Admin";
import RankingPage from "./pages/Ranking";

/**
 * Routage :
 *  - "/"             → écran d'accès (e-mail + mot de passe)
 *  - "/verification" → saisie du code OTP
 *  - "/decouvrir"    → landing page publique (séparée du parcours d'authentification)
 *  - pages publiques : boutique, produit, panier, checkout, paiement, aide, légal, /r/:code
 *  - pages privées   : dashboard, portefeuille, ventes, liens, parrainage, profil, admin…
 * HashRouter est utilisé car le build est servi comme un fichier statique unique ;
 * en production (Next.js/serveur), les mêmes chemins sont servis en URLs propres.
 */
const Pub = ({ children }: { children: ReactNode }) => <AppShell>{children}</AppShell>;
const Priv = ({ children }: { children: ReactNode }) => <RequireAuth><AppShell>{children}</AppShell></RequireAuth>;
/** Pages vendeur : compte + abonnement actif (1 500 FCFA) requis */
const Seller = ({ children, feature }: { children: ReactNode; feature: string }) => <Priv><SubscriptionGate feature={feature}>{children}</SubscriptionGate></Priv>;

function TitleReset() {
  const loc = useLocation();
  useEffect(() => { if (!loc.pathname.startsWith("/produit") && loc.pathname !== "/boutique" && !loc.pathname.startsWith("/legal") && loc.pathname !== "/decouvrir") document.title = "ALWENAS SHOP — Achetez, partagez, gagnez au Cameroun"; }, [loc.pathname]);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <TitleReset />
        <Routes>
          <Route path="/" element={<AccessPage />} />
          <Route path="/inscription" element={<SignupPage />} />
          <Route path="/mot-de-passe" element={<ResetPasswordPage />} />
          <Route path="/verification" element={<OtpPage />} />
          <Route path="/abonnement" element={<Priv><SubscriptionPage /></Priv>} />
          <Route path="/decouvrir" element={<Landing />} />
          <Route path="/r/:code" element={<Pub><ReferralRedirect /></Pub>} />

          <Route path="/boutique" element={<Pub><ShopPage /></Pub>} />
          <Route path="/categories" element={<Pub><CategoriesPage /></Pub>} />
          <Route path="/produit/:slug" element={<Pub><ProductPage /></Pub>} />
          <Route path="/panier" element={<Pub><CartPage /></Pub>} />
          <Route path="/checkout" element={<Pub><CheckoutPage /></Pub>} />
          <Route path="/paiement/:id" element={<Pub><PaymentPage /></Pub>} />
          <Route path="/commandes/:id" element={<Pub><OrderDetailPage /></Pub>} />
          <Route path="/aide" element={<Pub><HelpPage /></Pub>} />
          <Route path="/legal/:slug" element={<Pub><LegalPage /></Pub>} />

          <Route path="/app" element={<Priv><Dashboard /></Priv>} />
          <Route path="/commandes" element={<Priv><OrdersPage /></Priv>} />
          <Route path="/portefeuille" element={<Priv><WalletPage /></Priv>} />
          <Route path="/classement" element={<Priv><RankingPage /></Priv>} />
          <Route path="/convertir" element={<Seller feature="La conversion de POOL"><ConvertPage /></Seller>} />
          <Route path="/retrait" element={<Seller feature="Le retrait des gains"><WithdrawPage /></Seller>} />
          <Route path="/historique" element={<Priv><HistoryPage /></Priv>} />
          <Route path="/ventes" element={<Seller feature="Le suivi des ventes"><SalesPage /></Seller>} />
          <Route path="/commissions" element={<Seller feature="Le suivi des commissions"><CommissionsPage /></Seller>} />
          <Route path="/liens" element={<Seller feature="La création de liens de vente"><LinksPage /></Seller>} />
          <Route path="/parrainage" element={<Seller feature="Le parrainage"><ReferralPage /></Seller>} />
          <Route path="/profil" element={<Priv><ProfilePage /></Priv>} />
          <Route path="/notifications" element={<Priv><NotificationsPage /></Priv>} />
          <Route path="/parametres" element={<Priv><SettingsPage /></Priv>} />
          <Route path="/admin" element={<Priv><AdminPage /></Priv>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </HashRouter>
  );
}
