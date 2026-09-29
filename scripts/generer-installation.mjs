// Regroupe toutes les migrations (supabase/migrations/*.sql, dans l'ordre)
// en un seul fichier à coller dans le SQL Editor d'une base NEUVE
// (par exemple la base de test). Usage : npm run sql:installation
import fs from 'node:fs';
import path from 'node:path';

const dossier = 'supabase/migrations';
const sortie = 'supabase/installation_complete.sql';
const fichiers = fs.readdirSync(dossier).filter(f => f.endsWith('.sql')).sort();

const entete = `-- =============================================================================
-- MEDIDISPATCH — Installation complète d'une base NEUVE (${fichiers.length} migrations).
--
-- ⚠️ FICHIER GÉNÉRÉ AUTOMATIQUEMENT à partir de supabase/migrations/.
--    Ne pas le modifier à la main : lancer « npm run sql:installation ».
--
-- Usage : nouveau projet Supabase → SQL Editor → + New query → coller → Run.
-- Ne JAMAIS lancer sur une base déjà installée (la production) : les tables
-- existent déjà et le script s'arrêterait en erreur.
-- =============================================================================
`;

const corps = fichiers
  .map(f => `\n\n-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n-- ${f}\n-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n\n` + fs.readFileSync(path.join(dossier, f), 'utf8').trim())
  .join('\n');

fs.writeFileSync(sortie, entete + corps + '\n');
console.log(`${sortie} : ${fichiers.length} migrations regroupées (${fichiers.join(', ')})`);
