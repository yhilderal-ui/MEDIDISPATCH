# MEDIDISPATCH — Environnements de production et de test

Deux bases Supabase distinctes, le même code.

| | Production | Test |
|---|---|---|
| Adresse | https://www.medi-dispatch.fr | https://medidispatch-git-claude-busy-noether-naiyom-yy-66ed.vercel.app (dernière version de la branche de travail) |
| Branche | `main` | toutes les autres branches |
| Base Supabase | projet **medidispatch** | projet **medidispatch-test** |
| Données | vraies demandes | données **fictives** uniquement |
| Repère visuel | aucun | bandeau jaune « VERSION DE TEST » |

Le choix de la base se fait dans **Vercel → Settings → Environment Variables** :
`VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ont une valeur pour
**Production** (base de production) et une autre pour **Preview** et **Development**
(base de test).

## Règle d'or pour les modifications de base (migrations)

Chaque nouveau script `supabase/migrations/00XX_….sql` se lance **sur les deux bases** :

1. d'abord sur la base de **test** → on vérifie sur la prévisualisation ;
2. puis sur la base de **production**, **juste avant** de fusionner la Pull Request.

Puis régénérer le fichier d'installation complète : `npm run sql:installation`.

## Recréer une base de test de zéro

1. Supabase → **New project** (région Europe) → attendre qu'il soit prêt.
2. **SQL Editor** → coller `supabase/installation_complete.sql` → **Run**.
3. **Authentication → Sign In / Providers** : désactiver « Allow new users to sign up ».
4. **Authentication → Users → Add user** (×3, cocher « Auto Confirm User »).
5. **SQL Editor** → `supabase/scripts/rattacher_profils.sql` avec les trois e-mails (Florence, Pharmacie, Livreurs).
6. Reporter l'URL et la clé publishable dans les variables **Preview / Development** de Vercel.
