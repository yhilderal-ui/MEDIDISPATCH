// Catalogue des médicaments pour l'aide à la saisie (source : BDPM, voir
// scripts/maj-medicaments.mjs). Chargé une seule fois, à la première saisie.
// S'il est absent ou injoignable, la saisie libre continue de fonctionner.

interface Entree {
  nom: string;
  cle: string; // nom normalisé, précédé d'une espace pour chercher en début de mot
}

const CLE_FREQUENTS = 'medidispatch.medicamentsFrequents';
export const MIN_CARACTERES = 2;

// « Éludril 0,5 % » → « eludril 0 5 » : sans accents ni ponctuation, pour que
// « eludr » ou « 0,5 » trouvent le médicament.
export function normaliser(texte: string) {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

let chargement: Promise<Entree[]> | null = null;

export function chargerCatalogue(): Promise<Entree[]> {
  chargement ??= fetch('/medicaments-bdpm.json')
    .then(r => (r.ok ? r.json() : { medicaments: [] }))
    .then((c: { medicaments?: string[] }) =>
      (c.medicaments ?? []).map(nom => ({ nom, cle: ' ' + normaliser(nom) })),
    )
    .catch(() => {
      chargement = null; // nouvel essai à la prochaine saisie
      return [];
    });
  return chargement;
}

// Nombre de fois où chaque médicament a été choisi sur cet appareil.
function frequents(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(CLE_FREQUENTS) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export function memoriserChoix(nom: string) {
  try {
    const f = frequents();
    f[nom] = (f[nom] ?? 0) + 1;
    localStorage.setItem(CLE_FREQUENTS, JSON.stringify(f));
  } catch {
    // stockage indisponible (navigation privée) : on se passe du classement
  }
}

// Chaque mot tapé doit commencer un mot du nom : « dol 1000 » trouve
// « DOLIPRANE 1000 mg, comprimé ». Ordre : les plus choisis, puis ceux qui
// commencent par la saisie, puis l'ordre alphabétique (10 mg avant 100 mg).
// Au-delà de `max`, seuls les premiers sont renvoyés, avec le nombre total.
const tri = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });

export function rechercher(catalogue: Entree[], saisie: string, max = 200): { noms: string[]; total: number } {
  const requete = normaliser(saisie);
  if (requete.length < MIN_CARACTERES) return { noms: [], total: 0 };
  const mots = requete.split(' ').map(m => ' ' + m);
  const debut = ' ' + requete;
  const f = frequents();

  const trouves = catalogue
    .filter(e => mots.every(m => e.cle.includes(m)))
    .map(e => ({ nom: e.nom, freq: f[e.nom] ?? 0, debut: e.cle.startsWith(debut) ? 0 : 1 }))
    .sort((a, b) => b.freq - a.freq || a.debut - b.debut || tri.compare(a.nom, b.nom));
  return { noms: trouves.slice(0, max).map(e => e.nom), total: trouves.length };
}
