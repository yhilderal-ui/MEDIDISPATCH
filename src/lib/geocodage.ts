// Position (latitude, longitude) d'une adresse, par la Base Adresse Nationale
// (service public et gratuit, sans clé, désormais servi par la Géoplateforme de
// l'IGN). Seule l'adresse est envoyée. Les résultats sont gardés en mémoire le
// temps de la session, jamais enregistrés sur l'appareil.

export interface Position {
  lat: number;
  lon: number;
}

const SERVICES = [
  'https://data.geopf.fr/geocodage/search?limit=1&q=',
  'https://api-adresse.data.gouv.fr/search/?limit=1&q=',
];

// En dessous de ce score (0 à 1), la BAN n'a pas vraiment reconnu l'adresse.
const SCORE_MIN = 0.4;

const cache = new Map<string, Promise<Position | null>>();

async function interroger(adresse: string): Promise<Position | null> {
  for (const service of SERVICES) {
    try {
      const reponse = await fetch(service + encodeURIComponent(adresse), { signal: AbortSignal.timeout(8000) });
      if (!reponse.ok) continue;
      const json = await reponse.json();
      const f = json?.features?.[0];
      if (!f) return null;
      if ((f.properties?.score ?? 0) < SCORE_MIN) return null;
      const [lon, lat] = f.geometry.coordinates;
      return { lat, lon };
    } catch {
      // service suivant
    }
  }
  return null;
}

export function localiser(adresse: string): Promise<Position | null> {
  const cle = adresse.trim().toLowerCase();
  let resultat = cache.get(cle);
  if (!resultat) {
    resultat = interroger(adresse).then(p => {
      if (!p) cache.delete(cle); // nouvel essai la prochaine fois
      return p;
    });
    cache.set(cle, resultat);
  }
  return resultat;
}

// Distance à vol d'oiseau, en kilomètres.
export function distanceKm(a: Position, b: Position): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Ordre de passage : on part de `depart`, on enchaîne à chaque fois l'arrêt le
// plus proche, puis on supprime les croisements (« 2-opt ») tant que ça raccourcit.
// Avec `retour`, le trajet de retour (vers la pharmacie) compte dans le calcul.
export function ordonner<T>(depart: Position, arrets: { item: T; position: Position }[], retour?: Position): T[] {
  const reste = [...arrets];
  const chemin: typeof arrets = [];
  let courant = depart;
  while (reste.length) {
    let meilleur = 0;
    for (let i = 1; i < reste.length; i++) {
      if (distanceKm(courant, reste[i].position) < distanceKm(courant, reste[meilleur].position)) meilleur = i;
    }
    const [suivant] = reste.splice(meilleur, 1);
    chemin.push(suivant);
    courant = suivant.position;
  }

  const point = (i: number) => (i < 0 ? depart : chemin[i].position);
  // Liaison entre la fin d'un tronçon et le point qui suit (rien en bout de trajet sans retour).
  const lien = (a: Position, j: number) =>
    j < chemin.length ? distanceKm(a, point(j)) : retour ? distanceKm(a, retour) : 0;
  let ameliore = true;
  while (ameliore) {
    ameliore = false;
    for (let i = 0; i < chemin.length - 1; i++) {
      for (let k = i + 1; k < chemin.length; k++) {
        // Inverser chemin[i..k] : on compare les deux liaisons modifiées.
        const avant = distanceKm(point(i - 1), point(i)) + lien(point(k), k + 1);
        const apres = distanceKm(point(i - 1), point(k)) + lien(point(i), k + 1);
        if (apres + 1e-9 < avant) {
          chemin.splice(i, k - i + 1, ...chemin.slice(i, k + 1).reverse());
          ameliore = true;
        }
      }
    }
  }
  return chemin.map(a => a.item);
}
