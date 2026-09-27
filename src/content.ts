export const FAQ: { q: string; a: string }[] = [
  { q: "Qu'est-ce qu'ALWENAS SHOP ?", a: "ALWENAS SHOP est une marketplace camerounaise : vous y achetez des produits de qualité livrés partout au pays, et vous pouvez aussi gagner des commissions en recommandant ces produits grâce à vos liens de vente personnalisés." },
  { q: "Comment créer un compte et combien coûte l'abonnement ?", a: "Il faut le code d'un membre actif ou suivre son lien d'invitation. Choisissez un mot de passe (8 caractères minimum, lettres et chiffres), confirmez votre e-mail et réglez immédiatement 1 500 FCFA via MTN ou Orange Money pour finaliser votre inscription. Sans paiement confirmé, le compte provisoire n'a pas accès à l'espace membre. L'accès vendeur est ensuite valable à vie. Un membre déjà inscrit ne peut pas créer un second compte avec la même adresse : il se connecte ou réinitialise son mot de passe." },
  { q: "L'abonnement rapporte-t-il quelque chose à mon parrain ?", a: "Non. Les 1 500 FCFA paient l'accès aux outils vendeur (liens, suivi, portefeuille, retraits). Aucune commission n'est versée sur les abonnements ou les inscriptions : seules les ventes réelles de produits génèrent des gains." },
  { q: "Qu'est-ce qu'un POOL ?", a: "Le POOL est l'unité de récompense d'ALWENAS. 1 POOL = 550 FCFA. Votre solde est toujours affiché avec deux décimales (ex. 25,75 POOL ≈ 14 162,50 FCFA). En interne, chaque commission est enregistrée en FCFA exact : aucun centime n'est perdu à cause des arrondis." },
  { q: "Quand ma commission devient-elle disponible ?", a: "Dès que le paiement du client est confirmé, la commission apparaît « en attente ». Elle devient « disponible » 7 jours après la livraison, une fois le délai de remboursement écoulé." },
  { q: "Comment retirer mes gains ?", a: "Convertissez d'abord vos POOL en FCFA depuis votre portefeuille, puis demandez un retrait vers MTN Mobile Money ou Orange Money (min. 1 000 FCFA, frais 1 %, traitement en moins de 24 h ouvrées)." },
  { q: "Mon client doit-il créer un compte ?", a: "Non. Toute personne qui clique sur votre lien peut commander et payer sans compte. La vente vous est attribuée automatiquement pendant 30 jours après le clic." },
  { q: "Comment me connecter ?", a: "Saisissez votre adresse e-mail et votre mot de passe. Celui-ci doit comporter au moins 8 caractères, des lettres et des chiffres. Un code e-mail est utilisé à la création du compte ou pour réinitialiser un mot de passe oublié." },
  { q: "Qui livre une commande issue de mon lien ?", a: "L'acheteur choisit à la validation : retrait gratuit à la boutique physique ou livraison à domicile. Pour une livraison à domicile, vous êtes notifié lorsque l'article est prêt ; vous venez le récupérer en boutique puis le livrez. L'acheteur confirme sa réception. Votre commission reste en attente jusqu'à la fin du délai de retour de 7 jours." },
  { q: "Comment fonctionnent les niveaux POOL ?", a: "Votre niveau est calculé sur les POOL cumulés grâce aux ventes réelles validées : STARTER (0–99), SELLER (100–299), ARCHIEVER (300–899), PERMOMER (900–1 000), ELITE (au-delà). Le classement compare séparément les commissions disponibles gagnées sur les 30 derniers jours. Aucun niveau ne verse de bonus financier et le portefeuille ne se remet pas à zéro." },
  { q: "Quels moyens de paiement sont acceptés ?", a: "MTN Mobile Money, Orange Money et carte bancaire via notre prestataire de paiement agréé. Le paiement est confirmé directement par le prestataire à nos serveurs." },
  { q: "Quels sont les délais de livraison ?", a: "24 à 72 h à Douala et Yaoundé, 2 à 5 jours ouvrés pour les autres villes. Frais : 1 500 FCFA (Douala/Yaoundé), 2 500 FCFA ailleurs, offerts dès 50 000 FCFA d'achat." },
  { q: "Le parrainage rapporte-t-il de l'argent ?", a: "Non. L'invitation d'un membre actif est nécessaire pour créer un compte, mais elle ne déclenche aucun versement, même après paiement. Aucun bonus N1/N2/N3 n'est versé sur les frais d'inscription. Les revenus proviennent exclusivement des ventes réelles de produits via vos propres liens." },
];

export const LEGAL: Record<string, { title: string; sections: [string, string][] }> = {
  cgu: { title: "Conditions générales d'utilisation", sections: [
    ["Objet", "Les présentes conditions régissent l'accès et l'utilisation de la plateforme ALWENAS SHOP, marketplace et programme d'affiliation opérant au Cameroun."],
    ["Compte", "L'inscription exige un code d'invitation d'un membre actif, une vérification par code e-mail et la confirmation d'un paiement unique de 1 500 FCFA. Avant ce paiement, le compte est provisoire et n'accède pas à l'espace membre. L'accès se fait par e-mail et mot de passe (8 caractères minimum, lettres et chiffres). Un compte par adresse e-mail ; un code e-mail permet la réinitialisation du mot de passe."],
    ["Comportements interdits", "Auto-achat via son propre lien, comptes multiples, spam, fausses promesses de gains, manipulation des paiements ou tentative d'accès non autorisé. Ces comportements peuvent entraîner l'annulation des commissions et la suspension du compte après vérification."],
    ["Responsabilité", "ALWENAS SHOP met tout en œuvre pour assurer la disponibilité du service mais ne saurait être tenue responsable des interruptions dues aux opérateurs tiers (réseaux mobiles, prestataires de paiement)."],
    ["Droit applicable", "Les présentes sont soumises au droit camerounais et aux réglementations CEMAC applicables."],
  ] },
  vente: { title: "Conditions générales de vente", sections: [
    ["Prix", "Les prix sont indiqués en FCFA TTC. Seul le prix enregistré dans notre catalogue au moment de la commande fait foi ; il est recalculé par nos serveurs."],
    ["Commande", "La commande est ferme après confirmation du paiement par le prestataire. Un e-mail de confirmation est envoyé."],
    ["Paiement", "MTN Mobile Money, Orange Money, carte bancaire via prestataire agréé. ALWENAS SHOP ne stocke aucune donnée de carte."],
  ] },
  confidentialite: { title: "Politique de confidentialité", sections: [
    ["Données collectées", "E-mail, nom, téléphone, adresse de livraison, historique de commandes, adresse IP et informations techniques de sécurité (anti-fraude, limitation des abus)."],
    ["Finalités", "Exécution des commandes, attribution des ventes, calcul et versement des commissions, sécurité du compte, prévention de la fraude, obligations légales."],
    ["Conservation", "Les données financières sont conservées pendant la durée légale. Les codes OTP sont stockés uniquement sous forme hachée et expirent après 5 minutes."],
    ["Vos droits", "Accès, rectification, suppression (sous réserve des obligations légales) : support@alwenasshop.com."],
  ] },
  cookies: { title: "Politique de cookies", sections: [
    ["Cookies essentiels", "Cookie de session sécurisé (HttpOnly, Secure, SameSite) et cookie d'attribution d'affiliation (30 jours)."],
    ["Mesure d'audience", "Statistiques anonymisées pour améliorer le service, uniquement avec votre consentement."],
  ] },
  remboursement: { title: "Politique de remboursement", sections: [
    ["Délai", "Vous disposez de 7 jours après livraison pour signaler un produit défectueux ou non conforme."],
    ["Procédure", "Contactez le support avec votre numéro de commande. Après vérification, le remboursement est effectué sur le moyen de paiement d'origine sous 5 jours ouvrés."],
    ["Effet sur les commissions", "Si une commande est remboursée pendant le délai de 7 jours, la commission associée (encore en attente) est annulée."],
  ] },
  livraison: { title: "Politique de livraison", sections: [
    ["Choix du client", "Au paiement, le client choisit la livraison à domicile ou le retrait gratuit à la boutique physique. Pour la livraison, le vendeur affilié est notifié quand l'article est prêt : il le collecte en boutique puis le livre. L'acheteur confirme la réception ; le vendeur ne peut pas la confirmer à sa place."],
    ["Zones", "Livraison dans les 10 régions du Cameroun."],
    ["Délais", "24–72 h à Douala et Yaoundé ; 2 à 5 jours ouvrés ailleurs."],
    ["Frais", "1 500 FCFA à Douala/Yaoundé, 2 500 FCFA pour les autres villes, offerts dès 50 000 FCFA."],
  ] },
  affiliation: { title: "Politique d'affiliation", sections: [
    ["Principe", "Chaque utilisateur peut générer un lien unique par produit (ex. alwenasshop.com/r/8K72LP). Le lien ne contient aucune donnée personnelle."],
    ["Attribution", "Règle du dernier clic : la vente est attribuée au dernier lien affilié cliqué par l'acheteur dans les 30 jours précédant l'achat. Un achat direct sans clic préalable n'est attribué à personne."],
    ["Panier multi-produits", "Si la commande contient plusieurs produits, l'affilié attribué perçoit la commission de chaque produit selon son propre taux, calculée sur le montant réellement payé (après réduction, hors livraison)."],
    ["Exclusions", "Aucune commission n'est attribuée en cas d'achat via son propre lien, de paiement non confirmé, d'annulation ou de remboursement."],
    ["Séparation des concepts", "Parrainage = relation entre utilisateurs, sans rémunération. Affiliation = attribution d'une vente à un utilisateur. Commission = récompense financière issue d'une transaction commerciale réelle."],
  ] },
  commissions: { title: "Politique de commissions", sections: [
    ["Taux", "Chaque produit possède son taux, affiché sur sa fiche (5 % à 12 % actuellement)."],
    ["Cycle de vie", "EN ATTENTE à la confirmation du paiement → DISPONIBLE 7 jours après livraison → convertible en FCFA. ANNULÉE si la commande est annulée ou remboursée avant disponibilité."],
    ["Unité POOL", "1 POOL = 550 FCFA. Le solde POOL est affiché avec exactement 2 décimales (arrondi au centième le plus proche). Le registre conserve le montant FCFA exact ; le maximum convertible est arrondi au centième inférieur afin de ne jamais convertir plus que le montant détenu."],
    ["Exemple", "Produit à 20 000 FCFA, commission 10 % = 2 000 FCFA, soit 3,64 POOL affichés. Le registre conserve 2 000 FCFA."],
    ["Aucune rémunération à l'inscription", "Aucune commission n'est versée pour l'inscription d'un utilisateur. Le modèle est fondé exclusivement sur la vente de produits réels."],
  ] },
  abonnement: { title: "Politique d'abonnement", sections: [
    ["Création de compte", "« Créer un compte maintenant » nécessite le code d'un membre actif ou son lien d'invitation. Après saisie du profil et vérification de l'e-mail, le paiement unique de 1 500 FCFA est demandé. L'espace membre n'est accessible qu'une fois le paiement confirmé. Un compte déjà existant se connecte ou utilise « Mot de passe oublié »."],
    ["Prix et durée", "L'accès vendeur coûte 1 500 FCFA TTC, paiement unique pour un accès à vie (aucun renouvellement). Le montant est fixé par la plateforme et ne peut pas être modifié depuis le navigateur."],
    ["Paiement", "Par MTN Mobile Money ou Orange Money. L'abonnement n'est activé qu'après confirmation du paiement par le prestataire, jamais sur simple déclaration de l'application."],
    ["Fonctionnalités incluses", "Génération de liens de vente, suivi des ventes et commissions, parrainage, conversion des POOL et retraits. Sans accès vendeur, l'achat de produits reste possible."],
    ["Absence de rémunération sur les abonnements", "Aucune commission, aucun bonus ni aucune récompense n'est versé à quiconque au titre d'un abonnement ou d'une inscription. Les revenus des utilisateurs proviennent exclusivement de ventes réelles de produits."],
    ["Remboursement", "L'abonnement peut être remboursé sur demande dans les 48 h suivant le paiement si aucune fonctionnalité vendeur n'a été utilisée."],
  ] },
  retrait: { title: "Politique de retrait", sections: [
    ["Flux", "POOL → conversion → solde FCFA disponible → demande de retrait → MTN Mobile Money / Orange Money → confirmation du prestataire."],
    ["Limites", "Minimum 1 000 FCFA, maximum 500 000 FCFA par retrait, 3 demandes par 24 h."],
    ["Frais", "1 % du montant, minimum 100 FCFA, affichés avant confirmation."],
    ["Sécurité", "Le montant est réservé immédiatement (pas de double retrait). En cas d'échec, il est intégralement recrédité. Un numéro utilisé par plusieurs comptes déclenche une vérification manuelle."],
  ] },
};
