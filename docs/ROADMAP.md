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
- [ ] **1b. Premier déploiement Vercel** (maquette en ligne, encore sans données réelles)
- [x] **2. Modèle de données** — tables Supabase : `profiles`, `demandes`, `documents`, `notes`, `historique_statuts`, `messages`, `lectures` (vu / non vu) ; numéro de ticket auto ; règles d'accès (RLS)
- [ ] **3. Authentification réelle** — 2 comptes (Dispatcheur, Société de livraison), inscription publique désactivée, badge de rôle
- [ ] **4. Création de demande** — formulaire, pièces jointes, sélecteur de date (ni passé, ni dimanche ; jour même autorisé)
- [ ] **5. Tableau hebdomadaire** — colonnes lundi → samedi, recherche (patient / ticket), filtres (statut, criticité, date)
- [ ] **6. Détail de la carte** — infos patient, criticité mise en avant, documents, fil de notes, historique, modification / report / annulation
- [ ] **7. Statuts et preuve de livraison** — Nouvelle → En cours → Livrée, photo obligatoire au passage à « Livrée »
- [ ] **8. Vu / non vu** sur les cartes
- [ ] **9. Chat global** — messages horodatés avec auteur, vu / non vu, temps réel
- [ ] **10. Notifications in-app** — nouvelles demandes, nouveaux messages
- [ ] **11. Archives** — demandes livrées sorties du tableau actif après un délai, accès séparé
- [ ] **12. Mise en ligne** — nom de domaine, variables d'environnement, recette complète sur mobile et ordinateur

## Écarts entre la maquette et le cahier des charges

La maquette Figma Make est une bonne base visuelle, mais c'est un prototype : toutes les données
vivent dans la mémoire du navigateur et disparaissent au rechargement. Voici ce qui diffère du
cahier des charges, et à quelle étape on le corrige.

| Sujet | Maquette actuelle | Cahier des charges | Étape |
|---|---|---|---|
| Connexion | Nom tapé, sans mot de passe | Vrai compte sécurisé, 2 comptes | 3 |
| Persistance | Perdue au rechargement | Base de données, rien ne se perd | 2 |
| Statuts | 6 statuts + un 2ᵉ statut « pharmacie » (nouveau / validé / archivé…) | 3 statuts : Nouvelle → En cours → Livrée (+ Annulée) | 2 et 7 |
| Criticité | Urgent / Standard / Faible | 🔴 Urgent / 🟠 Standard prioritaire / 🟢 Standard | 4 |
| Formulaire | Adresse de collecte, client, poids, produits | Patient, adresse, téléphone, médicaments, ordonnance, bon de livraison | 4 |
| Date de livraison | Accepte les jours passés et le dimanche | Aujourd'hui ou plus tard, jamais le dimanche (jour même autorisé : décision du 28/09, remplace « jamais le jour même » du cahier des charges) | 4 |
| Pièces jointes | Noms de fichiers seulement (non envoyés), Word accepté, 20 Mo | Fichiers réellement stockés, PDF/JPEG/PNG, 10 Mo | 4 |
| Vue semaine | Jours calculés en heure UTC : une carte peut tomber dans la colonne de la veille en France | Colonne = jour prévu en heure française | 5 |
| Recherche / filtres | Recherche côté pharmacie uniquement, pas de filtres | Recherche + filtres statut / criticité / date pour les deux rôles | 5 |
| Notes | Auteur saisi librement | Auteur = compte connecté, horodaté | 6 |
| Historique | Absent | Historique des statuts et des reports | 6 |
| Preuve de livraison | Absente | Photo obligatoire au passage à « Livrée » | 7 |
| Vu / non vu | Uniquement un compteur local sur le chat | Sur chaque carte et chaque message, partagé entre les deux rôles | 8 et 9 |
| Chat | Local au navigateur, invisible pour l'autre rôle | Partagé en temps réel | 9 |

## Méthode de travail

Pour chaque étape : j'explique le **pourquoi**, j'écris le code sur la branche de travail,
tu testes sur l'URL de prévisualisation Vercel, puis on valide avant de passer à la suivante.
Les actions qui demandent ton identité (créer un compte, payer, saisir une clé secrète)
restent de ton côté ; je te guide pas à pas.
