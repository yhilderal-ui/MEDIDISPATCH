// Les dates de livraison sont des « jours » (AAAA-MM-JJ) en heure de Paris.
// On évite toISOString(), qui convertit en UTC et peut décaler d'un jour.

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

export function aujourdhuiParis(): string {
  // Le format canadien « en-CA » donne directement AAAA-MM-JJ.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

export function versJour(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

export function depuisJour(jour: string): Date {
  const [a, m, j] = jour.split('-').map(Number);
  return new Date(a, m - 1, j);
}

export function ajouterJours(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function lundiDeLaSemaine(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const jour = r.getDay();
  return ajouterJours(r, jour === 0 ? -6 : 1 - jour);
}

// Même règle que la base : aujourd'hui ou plus tard, jamais le dimanche.
export function erreurJourLivraison(jour: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return 'Choisissez une date de livraison.';
  if (jour < aujourdhuiParis()) return 'La date de livraison ne peut pas être dans le passé.';
  if (depuisJour(jour).getDay() === 0) return 'Pas de livraison le dimanche : choisissez un autre jour.';
  return null;
}

export function formatJour(jour: string): string {
  const d = depuisJour(jour);
  return `${JOURS_COURTS[d.getDay()]} ${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

export function formatHorodatage(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });
}

export function moisCourt(d: Date): string {
  return MOIS_COURTS[d.getMonth()];
}
