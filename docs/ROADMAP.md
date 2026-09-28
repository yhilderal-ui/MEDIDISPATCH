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

- [ ] **0. Préparation** — comptes GitHub (ok), Supabase, Vercel ; récupération du lien Figma Make
- [ ] **1. Import du code Figma Make** dans ce dépôt, lancement en local, premier déploiement Vercel (maquette en ligne, encore sans données réelles)
- [ ] **2. Modèle de données** — tables Supabase : `profiles`, `demandes`, `documents`, `notes`, `historique_statuts`, `messages`, `lectures` (vu / non vu) ; numéro de ticket auto ; règles d'accès (RLS)
- [ ] **3. Authentification réelle** — 2 comptes (Dispatcheur, Société de livraison), inscription publique désactivée, badge de rôle
- [ ] **4. Création de demande** — formulaire, pièces jointes, sélecteur de date (ni passé, ni jour même, ni dimanche)
- [ ] **5. Tableau hebdomadaire** — colonnes lundi → samedi, recherche (patient / ticket), filtres (statut, criticité, date)
- [ ] **6. Détail de la carte** — infos patient, criticité mise en avant, documents, fil de notes, historique, modification / report / annulation
- [ ] **7. Statuts et preuve de livraison** — Nouvelle → En cours → Livrée, photo obligatoire au passage à « Livrée »
- [ ] **8. Vu / non vu** sur les cartes
- [ ] **9. Chat global** — messages horodatés avec auteur, vu / non vu, temps réel
- [ ] **10. Notifications in-app** — nouvelles demandes, nouveaux messages
- [ ] **11. Archives** — demandes livrées sorties du tableau actif après un délai, accès séparé
- [ ] **12. Mise en ligne** — nom de domaine, variables d'environnement, recette complète sur mobile et ordinateur

## Méthode de travail

Pour chaque étape : j'explique le **pourquoi**, j'écris le code sur la branche de travail,
tu testes sur l'URL de prévisualisation Vercel, puis on valide avant de passer à la suivante.
Les actions qui demandent ton identité (créer un compte, payer, saisir une clé secrète)
restent de ton côté ; je te guide pas à pas.
