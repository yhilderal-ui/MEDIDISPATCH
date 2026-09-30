// Met à jour le catalogue des médicaments utilisé pour l'aide à la saisie.
//
// Source : Base de données publique des médicaments (BDPM, ANSM / ministère de la Santé),
// fichier CIS_bdpm.txt (une ligne par médicament, colonnes séparées par des tabulations).
// Résultat : public/medicaments-bdpm.json (noms des médicaments commercialisés).
//
// Lancé chaque mois par GitHub (.github/workflows/maj-medicaments.yml).
// À la main : `npm run medicaments:maj`, ou `node scripts/maj-medicaments.mjs CIS_bdpm.txt`
// pour partir d'un fichier déjà téléchargé.

import { readFile, writeFile } from 'node:fs/promises';

const SOURCES = [
  'https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_bdpm.txt',
  'https://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_bdpm.txt',
];
const SORTIE = new URL('../public/medicaments-bdpm.json', import.meta.url);

// Garde-fous : un fichier tronqué ou un changement de format ne doit pas vider le catalogue.
const MINIMUM = 5000;
const BAISSE_MAX = 0.2;

// Colonnes de CIS_bdpm.txt (documentation BDPM).
const COL_DENOMINATION = 1;
const COL_COMMERCIALISATION = 6;

// Le fichier a longtemps été publié en Windows-1252 ; on accepte aussi l'UTF-8.
function decoder(octets) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(octets);
  } catch {
    return new TextDecoder('windows-1252').decode(octets);
  }
}

async function telecharger() {
  for (const url of SOURCES) {
    try {
      const reponse = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
      const texte = decoder(new Uint8Array(await reponse.arrayBuffer()));
      if (!texte.includes('\t')) throw new Error("ce n'est pas le fichier attendu");
      console.log(`Téléchargé : ${url}`);
      return texte;
    } catch (e) {
      console.warn(`Échec ${url} : ${e.message}`);
    }
  }
  throw new Error('BDPM injoignable');
}

function extraireNoms(texte) {
  const noms = new Set();
  for (const ligne of texte.split(/\r?\n/)) {
    const colonnes = ligne.split('\t');
    if (colonnes.length <= COL_COMMERCIALISATION) continue;
    if (colonnes[COL_COMMERCIALISATION].trim() !== 'Commercialisée') continue;
    const nom = colonnes[COL_DENOMINATION].replace(/\s+/g, ' ').trim();
    if (nom) noms.add(nom);
  }
  return [...noms].sort((a, b) => a.localeCompare(b, 'fr'));
}

async function precedent() {
  try {
    return JSON.parse(await readFile(SORTIE, 'utf8')).medicaments ?? [];
  } catch {
    return [];
  }
}

const fichierLocal = process.argv[2];
const texte = fichierLocal ? decoder(await readFile(fichierLocal)) : await telecharger();
const noms = extraireNoms(texte);
const anciens = await precedent();

if (noms.length < MINIMUM || noms.length < anciens.length * (1 - BAISSE_MAX)) {
  console.error(`Catalogue suspect : ${noms.length} médicaments (avant : ${anciens.length}). Rien n'est modifié.`);
  process.exit(1);
}

if (JSON.stringify(noms) === JSON.stringify(anciens)) {
  console.log(`Aucun changement (${noms.length} médicaments).`);
} else {
  const catalogue = {
    source: 'Base de données publique des médicaments — base-donnees-publique.medicaments.gouv.fr',
    maj: new Date().toISOString().slice(0, 10),
    medicaments: noms,
  };
  await writeFile(SORTIE, JSON.stringify(catalogue) + '\n');
  console.log(`Catalogue mis à jour : ${noms.length} médicaments (avant : ${anciens.length}).`);
}
