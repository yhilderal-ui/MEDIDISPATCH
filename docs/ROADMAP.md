# MEDIDISPATCH — Feuille de route technique

Document de référence du projet, tenu à jour à chaque étape.
Source fonctionnelle : `MEDISPATCH - CAHIER DES CHARGES.pages`.

## Stack retenue

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind | C'est ce que génère Figma Make : on réutilise les maquettes au lieu de les réécrire |
| Backend / BDD | Supabase (PostgreSQL) | Base de données, authentification, stockage de fichiers et temps réel dans un seul service |
| Temps réel | Supabase Realtime | Chat, notifications in-app, indicateurs vu / non vu sans rafraîchir la page |
| Fichiers | Supabase Storage (bucket privé) | Ordonnances, bons de livraison, preuves de livraison (PDF/JPEG/PNG, 10 Mo max) |
| Hébergement | Vercel | Déploiement automatique à chaque push, HTTPS inclus, une URL de prévisualisation par branche |

> ⚠️ Données de santé : Supabase et Vercel ne sont pas certifiés HDS. Tant que la V1 est en test,
> on n'utilise **que des données fictives**. Le passage en production avec de vrais patients
> impose de trancher l'hébergement HDS et les points RGPD (section 13 du cahier des charges).

## Étapes

- [x] **0. Préparation** — comptes GitHub (ok), Supabase, Vercel ; récupération du lien Figma Make
- [x] **1a. Import du code Figma Make** dans ce dépôt (compilation vérifiée)
- [x] **1b. Premier déploiement Vercel** — production : **https://www.medi-dispatch.fr** (adresse technique : https://medidispatch.vercel.app)
- [x] **2. Modèle de données** — tables Supabase : `profiles`, `demandes`, `documents`, `notes`, `historique_statuts`, `messages`, `lectures` (vu / non vu) ; numéro de ticket auto ; règles d'accès (RLS)
- [x] **3. Authentification réelle** — 2 comptes (Dispatcheur, Pharmacie), inscription publique désactivée, badge de rôle
- [x] **4. Création de demande** — formulaire, liste de médicaments, pièces jointes, sélecteur de date (ni passé, ni dimanche ; jour même autorisé)
- [x] **5. Tableau hebdomadaire** — colonnes lundi → samedi, recherche (patient / ticket, sans tenir compte des accents), filtres (statut, criticité, date) pour les deux rôles
- [x] **6. Détail de la carte** — infos patient, criticité mise en avant, documents, fil de notes, report, annulation, **historique détaillé** (qui, quoi, quand, champs modifiés) et **modification des informations** par les deux rôles
- [x] **Bon de livraison généré** (ajout du 29/09) — PDF créé automatiquement à partir de la carte (en-tête « FLOPHARMA — par MediDispatch », voir `src/config/emetteur.ts`), aucune pièce jointe obligatoire (décision du 29/09), régénéré et **remplacé** à chaque modification ou report ; un bon joint reste possible en complément
- [x] **Pièces jointes** (ajout du 29/09) — 4 emplacements optionnels : ordonnance, carte Vitale, mutuelle, bon de livraison complémentaire
- [x] **7. Statuts et preuve de livraison** — Nouvelle → En cours → Livrée ; photo de preuve **optionnelle** en V1 (décision du 29/09, le cahier des charges la prévoyait obligatoire)
- [x] **8. Vu / non vu** sur les cartes — pastilles « Non vue » / « Mise à jour », compteur dans l'en-tête, « Vue par … » dans le détail
- [x] **9. Chat global** — messages horodatés avec auteur, compteur de non lus, « Vu ✓ », temps réel
- [x] **Suppression de cartes** (ajout du 29/09) — Dispatcheur uniquement, demande annulée uniquement, confirmation par le n° de ticket, trace dans `journal_suppressions`
- [x] **10. Notifications in-app** — bandeau cliquable, son (plus insistant pour une demande urgente, coupable avec le bouton cloche), compteur dans le titre de l'onglet qui clignote en arrière-plan, notification du navigateur optionnelle ; uniquement pour les actions de l'autre compte
- [x] **11. Archives** — une demande livrée reste dans le tableau **le jour de sa livraison** et bascule dans les Archives **à minuit** (heure de Paris), ou tout de suite avec le bouton « Archiver maintenant » (décision du 29/09, remplace le délai de 30 jours) ; vue « Archives » séparée avec recherche. la vue Archives affiche les **30 derniers jours**, les plus anciennes se retrouvent par la **recherche** (option B, décision du 29/09) ; **aucune suppression automatique** tant que la durée légale de conservation n'est pas fixée
- [x] **12a. Affichage mobile** — en-tête compact, onglets de statut, filtres repliables, vue semaine verticale, chat plein écran, alertes en bas d'écran, installation sur l'écran d'accueil ; icônes Lucide à la place des émoticônes
- [x] **12d. Base de test séparée** — prévisualisations reliées au projet Supabase `medidispatch-test` (variables Vercel « All Pre-Production Environments »), bandeau « VERSION DE TEST » : voir `docs/ENVIRONNEMENTS.md`
- [x] **12b. Recette** — déroulée avec Florence et la pharmacie ; **remise à zéro de la production le 29/09** (`supabase/scripts/nettoyer_donnees_test.sql` : 0 demande, 0 message, 2 comptes). Les essais se font désormais sur la base de test (`docs/ENVIRONNEMENTS.md`)
- [x] **12c. Nom de domaine** — `medi-dispatch.fr` acheté chez OVH ; zone DNS : `@` A `216.198.79.1` et `www` CNAME vers Vercel ; `medi-dispatch.fr` redirige vers `www.medi-dispatch.fr` ; HTTPS automatique (Vercel). Renouvellement annuel chez OVH

## V2 — évolutions

- [x] **Aide à la saisie des médicaments** (idée du 30/09, en service le 30/09) — suggestions dès 2 lettres, sans accents, « dol 1000 » trouve « DOLIPRANE 1000 mg, comprimé » ; les médicaments déjà choisis sur l'appareil remontent en tête ; saisie libre toujours possible. Catalogue : noms des médicaments **commercialisés** de la Base de données publique des médicaments (BDPM), dans `public/medicaments-bdpm.json`, mis à jour **le 3 de chaque mois** par GitHub (`.github/workflows/maj-medicaments.yml`, script `scripts/maj-medicaments.mjs`, garde-fous contre un fichier tronqué). Aucune donnée patient
- [x] **Statistiques** (décision du 30/09, en service le 30/09) — page visible par les deux comptes : chiffres clés (créées, livrées, reportées, annulées, comparées à la période précédente), livraisons par jour / semaine / mois, activité selon le jour de la semaine, top 10 des médicaments livrés. Calculs faits par la base (`supabase/migrations/0010_statistiques.sql`) ; données fictives pour la base de test : `supabase/scripts/donnees_demo_statistiques.sql`
- [x] **Export Excel des statistiques** (décision du 30/09, en service le 30/09) — bouton « Exporter (Excel) » sur la page Statistiques : fichier .xlsx de 4 onglets (synthèse avec la période précédente, livraisons par jour / semaine / mois, médicaments, détail des demandes créées ou livrées sur la période). Par discrétion, le détail ne contient **ni nom, ni téléphone, ni adresse** du patient, seulement le code postal et la ville
- [ ] **Itinéraire et tournée du jour** (décision du 30/09) — bouton « Itinéraire » (Google Maps, Waze, Plans sur iPhone) dans le détail d'une demande à livrer ; vue « Tournée » dans le tableau Pharmacie : livraisons du jour à faire (urgences d'abord, puis par ville, ordre modifiable et mémorisé sur l'appareil), « Prochain arrêt » dans Google Maps, Waze ou Plans, et toute la tournée dans Google Maps (10 arrêts par parcours, Waze n’acceptant qu’une destination), livrées du jour repliées. Seule l'adresse est transmise à l'application de navigation

## Écarts entre la maquette et le cahier des charges

La maquette Figma Make est une bonne base visuelle, mais c'est un prototype : toutes les données
vivent dans la mémoire du navigateur et disparaissent au rechargement. Voici ce qui diffère du
cahier des charges, et à quelle étape on le corrige.

| Sujet | Maquette actuelle | Cahier des charges | Étape |
|---|---|---|---|
| Connexion | Nom tapé, sans mot de passe | Vrai compte sécurisé, 2 comptes | 3 |
| Persistance | Perdue au rechargement | Base de données, rien ne se perd | 2 |
| Statuts | 6 statuts + un 2ᵉ statut « pharmacie » (nouveau / validé / archivé…) | 3 statuts : Nouvelle → En cours → Livrée (+ Annulée) | 2 et 7 |
| Criticité | Urgent / Standard / Faible | Urgent / Standard prioritaire / Standard (pastilles rouge, orange, vert) | 4 |
| Formulaire | Adresse de collecte, client, poids, produits | Patient, adresse, téléphone, médicaments, ordonnance, bon de livraison | 4 |
| Date de livraison | Accepte les jours passés et le dimanche | Aujourd'hui ou plus tard, jamais le dimanche (jour même autorisé : décision du 28/09, remplace « jamais le jour même » du cahier des charges) | 4 |
| Pièces jointes | Noms de fichiers seulement (non envoyés), Word accepté, 20 Mo | Fichiers réellement stockés, PDF/JPEG/PNG, 10 Mo | 4 |
| Vue semaine | Jours calculés en heure UTC : une carte peut tomber dans la colonne de la veille en France | Colonne = jour prévu en heure française | 5 |
| Recherche / filtres | Recherche côté pharmacie uniquement, pas de filtres | Recherche + filtres statut / criticité / date pour les deux rôles | 5 |
| Notes | Auteur saisi librement | Auteur = compte connecté, horodaté | 6 |
| Historique | Absent | Historique des statuts et des reports | 6 |
| Preuve de livraison | Absente | Photo optionnelle en V1 (décision du 29/09 ; obligatoire dans le cahier des charges) | 7 |
| Vu / non vu | Uniquement un compteur local sur le chat | Sur chaque carte et chaque message, partagé entre les deux rôles | 8 et 9 |
| Chat | Local au navigateur, invisible pour l'autre rôle | Partagé en temps réel | 9 |

## Méthode de travail

Pour chaque étape : j'explique le **pourquoi**, j'écris le code sur la branche de travail,
tu testes sur l'URL de prévisualisation Vercel, puis on valide avant de passer à la suivante.
Les actions qui demandent ton identité (créer un compte, payer, saisir une clé secrète)
restent de ton côté ; je te guide pas à pas.
