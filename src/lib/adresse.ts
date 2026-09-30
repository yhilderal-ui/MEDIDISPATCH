// « 12 rue X, 75013 Paris » → « 75013 Paris » (vide si pas de code postal).
export function villeDepuisAdresse(adresse: string): string {
  const m = adresse.match(/\b(\d{5})\s+([^,\n]+?)\s*$/);
  return m ? `${m[1]} ${m[2]}` : '';
}
