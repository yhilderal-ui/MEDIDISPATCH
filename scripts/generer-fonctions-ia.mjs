// Recopie le guide d'utilisation (docs/GUIDE_UTILISATION.md) dans la fonction
// « assistant », pour qu'elle tienne en un seul fichier à coller dans Supabase.
// Usage : npm run ia:fonctions (après chaque modification du guide).
import fs from 'node:fs';

const guide = fs.readFileSync('docs/GUIDE_UTILISATION.md', 'utf8').trim();
const fichier = 'supabase/functions/assistant/index.ts';
const source = fs.readFileSync(fichier, 'utf8');

const debut = source.indexOf('// <<GUIDE');
const fin = source.indexOf('// GUIDE>>');
if (debut < 0 || fin < debut) throw new Error(`Balises <<GUIDE / GUIDE>> introuvables dans ${fichier}`);

// Gabarit JavaScript : on protège \, ` et ${.
const litteral = guide.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const ligneDebut = source.slice(debut, source.indexOf('\n', debut) + 1);
const nouveau = source.slice(0, debut) + ligneDebut + 'const GUIDE = `' + litteral + '`;\n' + source.slice(fin);

fs.writeFileSync(fichier, nouveau);
console.log(`${fichier} : guide recopié (${guide.length} caractères).`);
