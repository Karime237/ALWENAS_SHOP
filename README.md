# ALWENAS SHOP

Marketplace + affiliation pour le Cameroun. Achetez, partagez vos liens, gagnez des commissions en **POOL** (1 POOL = 550 FCFA) sur des ventes réelles, retirez sur MTN MoMo / Orange Money.

## Ce que contient ce dépôt
| Élément | Emplacement |
|---|---|
| Frontend React + Vite + Tailwind (mobile-first) | `src/pages`, `src/components` |
| Landing page publique premium | `src/pages/Landing.tsx` → `/#/decouvrir` |
| Implémentation de référence du backend (logique métier complète) | `src/server/api.ts` |
| Miroir du schéma relationnel | `src/server/db.ts` |
| Schéma PostgreSQL de production | `docs/schema.sql` |
| Documentation API | `docs/API.md` |
| Arithmétique financière entière (centimes / centièmes de POOL) | `src/lib/money.ts` |

> ⚠️ **Mode sandbox.** Pour une démo de bout en bout sans infrastructure, `src/server/*` tourne dans le navigateur avec une persistance locale, un **simulateur de boîte mail** (codes OTP) et un **simulateur PSP** (webhooks signés HMAC). En production, ce code est déplacé tel quel dans un service Node.js (NestJS/Express) derrière HTTPS, branché sur PostgreSQL + Redis. Le navigateur ne doit alors plus que l'appeler par HTTP : il ne peut jamais modifier un solde, une commission ou un statut.

## Création de compte + abonnement (1 500 FCFA)
1. Première page `/` → **CRÉER UN COMPTE MAINTENANT** ; les membres existants se connectent par e-mail et mot de passe.
2. `/inscription` (étape 1/3) : **code d'un membre actif obligatoire** (ou lien `/?parrain=CODE`), prénom, nom, e-mail, téléphone, mot de passe (8 caractères minimum, lettres + chiffres), montant **1 500 FCFA fixé par le serveur**, CGU. Même e-mail = inscription refusée.
3. `/verification` (étape 2/3) : code OTP reçu par e-mail → compte **provisoire**, inaccessible hors paiement.
4. `/abonnement` (étape 3/3) : paiement MTN MoMo / Orange Money → webhook PSP signé → finalisation et accès vendeur **à vie**, sans renouvellement. Le paiement ne peut plus être remis à plus tard pour accéder au compte.
- Compte existant sans mot de passe (ancien parcours OTP) ou mot de passe oublié : `/mot-de-passe` → code par e-mail → nouveau mot de passe, révocation des autres sessions.
- Avant paiement confirmé : seul l'écran de finalisation du compte est accessible (les visiteurs sans compte peuvent toujours acheter librement).
- L'abonnement est un revenu plateforme : **aucune commission ni bonus** n'est versé à un parrain.
- La relation d'invitation est `PENDING` avant paiement, puis `ACTIVE` seulement après confirmation PSP ; les auto-parrainages suspects sont bloqués et signalés.
- Les administrateurs sont exemptés.
- Sandbox : pour démarrer sans membre payant, le code d'invitation `ADMIN1` appartient au compte admin préprovisionné. En production, attribuer les premiers codes par un processus administratif contrôlé.

## Parcours de démonstration (critère de réussite)
1. `/` → **CRÉER UN COMPTE MAINTENANT**, saisissez le code d'un membre actif (`ADMIN1` dans la sandbox), confirmez l'e-mail via la « Boîte mail (démo) » et payez 1 500 FCFA dans le simulateur PSP. Les membres déjà inscrits utilisent e-mail + mot de passe ou la récupération.
2. Dashboard : **deux soldes distincts**, initialement à zéro : POOL des commissions de ventes disponibles et FCFA déjà convertis, disponibles au retrait. Le FCFA exact des commissions non converties est conservé séparément. Aucun POOL n'est crédité à l'inscription.
3. Boutique → produit → **GÉNÉRER MON LIEN** → copiez-le.
4. Déconnectez-vous, collez le lien dans la barre d'adresse (même navigateur : la base sandbox est locale) → visiteur non inscrit → ajouter au panier → checkout avec **un autre e-mail** → choix livraison à domicile ou retrait boutique → simulateur PSP « Paiement réussi ».
5. Retour sur le compte vendeur : notification « Nouvelle vente », commission **en attente**.
6. Admin de sandbox préprovisionné : définissez d'abord son mot de passe via `/mot-de-passe?email=admin@alwenasshop.com` (puis 2FA). L'inscription publique ne peut jamais accorder un rôle admin. Dans Commandes : préparer → prête en boutique.
7. Si livraison : le vendeur est notifié, collecte l'article depuis « Mes ventes », puis le client confirme sa réception depuis sa commande avec un code e-mail à usage unique. Si retrait boutique : l'admin valide la remise au client. Le vendeur ne peut pas valider lui-même la livraison.
8. Admin → Commissions : « Libérer (délai écoulé) » simule les 7 jours de retour ; sinon la libération se fait une fois le délai réellement passé.
9. Vendeur : Portefeuille → **CONVERTIR** → **RETIRER** (MTN 67XXXXXXX / Orange 69XXXXXXX).
10. Admin → Retraits : Traiter → PSP ✓ Succès (ou ✗ Échec ⇒ recrédit automatique). Historique et audit conservent les opérations.

## Règles financières
- FCFA stockés en **centimes entiers**, POOL en **centièmes entiers** — aucun flottant.
- Le ledger conserve le FCFA exact (2 000 FCFA reste 2 000 FCFA, affiché 3,64 POOL).
- Affichage POOL : toujours 2 décimales, virgule, arrondi demi-supérieur ; maximum convertible arrondi à l'inférieur.
- Commission : `PENDING` au paiement confirmé → `AVAILABLE` 7 jours après livraison → `CANCELLED` si annulation/remboursement avant.
- Retrait : POOL → conversion → FCFA → demande → PSP → SUCCESS/FAILED. Réservation atomique + clé d'idempotence.
- Classement glissant 30 jours : commissions de ventes libérées uniquement. Le niveau, lui, repose sur les POOL **cumulés** au fil des ventes : STARTER (0–99), SELLER (100–299), ARCHIEVER (300–899), PERMOMER (900–1 000), ELITE (>1 000). Les niveaux sont honorifiques, **sans bonus financier**. Le portefeuille ne se remet pas à zéro.

## Attribution (déterministe)
Dernier clic valide, fenêtre de 30 jours, par appareil/visiteur. Un nouveau clic remplace l'ancien. Achat direct = aucun affilié. Panier multi-produits : commission par ligne au taux du produit, sur le montant payé après réduction, hors livraison. Auto-achat (même e-mail/compte) ⇒ pas de commission + `fraud_events`.

## Parrainage ≠ Affiliation ≠ Commission
Parrainage = invitation obligatoire par un membre actif et relation entre utilisateurs (**aucun gain d'inscription N1/N2/N3, même après paiement**). Affiliation = attribution d'une vente. Commission = récompense issue d'une transaction commerciale réelle. Le solde FCFA du portefeuille provient de la conversion des POOL issus de ventes, non des frais d'inscription.

## Installation (frontend)
```bash
npm install
npm run dev     # développement
npm run build   # build de production (dist/index.html)
```

## Déploiement production (recommandé)
- Environnements : `development`, `staging` (PSP sandbox), `production`.
- Variables serveur uniquement : `DATABASE_URL`, `REDIS_URL`, `EMAIL_API_KEY`, `PAYMENT_API_KEY`, `PAYMENT_SECRET`, `SESSION_SECRET`, `OTP_PEPPER`, `STORAGE_KEY`, `PHONE_ENCRYPTION_KEY`.
- Sécurité : HTTPS/HSTS, cookies HttpOnly+Secure+SameSite, CSRF, CSP, rate limiting Redis, requêtes paramétrées (anti-injection SQL), échappement React (anti-XSS), 2FA admin, rotation des clés, secrets dans un coffre.
- Sauvegardes : dump PostgreSQL quotidien + PITR, rétention 30 j, **test de restauration mensuel**.
- Avant lancement : faire valider le modèle, les flux financiers et les obligations Cameroun/CEMAC par un professionnel compétent.

## Tests recommandés
OTP (expiration, renvoi, brute force), panier (prix falsifié ignoré), double paiement (webhook idempotent), attribution, commissions, conversion (0,00 · 0,01 · 1,00 · 1,01 · 1,99 · 10,50 · 999 999,99 POOL), double retrait, échec retrait, permissions admin.
