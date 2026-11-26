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

## Fonctions serveur (IA) — sur chaque base

L'assistant d'aide (et, plus tard, le bilan hebdomadaire) passe par des **Edge Functions**
Supabase, qui détiennent la clé de l'IA : elle n'est **jamais** dans Vercel ni dans le code.

1. **Clé de l'IA** (une seule fois par base) : console.anthropic.com → **API keys** → créer une clé
   **par base** (« medidispatch-test », « medidispatch-prod ») ; régler un **plafond de dépense**
   (Billing → Limits). Supabase → **Edge Functions → Secrets** → **Add new secret** :
   nom `ANTHROPIC_API_KEY`, valeur = la clé. Ne jamais l'envoyer par message, ni à Claude.
2. **Migration** `supabase/migrations/0021_ia.sql` dans le SQL Editor (comme les autres).
3. **Déployer la fonction** : Supabase → **Edge Functions → Deploy a new function → Via Editor** →
   nom **`assistant`** → remplacer tout le contenu par `supabase/functions/assistant/index.ts` →
   **Deploy function**. Pour une mise à jour : ouvrir la fonction → **Code** → coller → **Deploy**.
4. Si l'assistant répond « Invalid JWT » : fonction → **Settings** → désactiver
   « Verify JWT with legacy secret » (la fonction vérifie elle-même la personne connectée).

Ordre habituel : base de **test**, vérification sur la prévisualisation, puis **production** juste
avant de fusionner la Pull Request.
