import { supabase } from './supabase';
import { ajouterJours, debutJourParisISO, depuisJour, versJour } from './dates';
import { DEPART_TOURNEE } from '../config/tournee';
import type { Periode } from './statistiques';

// Kilomètres estimés (décision du 03/10). Pour chaque jour, le trajet est
// reconstitué : pharmacie → adresses des passages terminés (livraisons et
// retours) dans l'ordre où ils ont été marqués « Livrée » / « Récupéré » →
// retour à la pharmacie. Distance routière par le service d'itinéraire de
// l'IGN ; s'il ne répond pas, vol d'oiseau × 1,3.
// Seules les adresses sont envoyées aux services de l'IGN, jamais les noms.
// Positions et résultats sont gardés en base (adresses_geocodees,
// kilometres_jour, migration 0014) pour ne pas refaire le calcul.

export interface Position {
  lat: number;
  lon: number;
}

export type Methode = 'route' | 'vol_oiseau';

export interface KmJour {
  jour: string;
  km: number;
  passages: number;
  methode: Methode;
}

export interface Kilometres {
  jours: KmJour[];
  total: number;
  passages: number;
  joursVolOiseau: number; // jours estimés à vol d'oiseau (service d'itinéraire indisponible)
  nonLocalises: number; // passages dont l'adresse n'a pas été reconnue (ignorés)
}

const GEOCODAGE = [
  'https://data.geopf.fr/geocodage/search?limit=1&q=',
  'https://api-adresse.data.gouv.fr/search/?limit=1&q=',
];
const ITINERAIRE = 'https://data.geopf.fr/navigation/itineraire';
const SCORE_MIN = 0.4; // en dessous, la BAN n'a pas vraiment reconnu l'adresse
const COEF_ROUTE = 1.3; // vol d'oiseau → route, en moyenne
const ARRETS_PAR_APPEL = 15; // arrêts intermédiaires par appel au service d'itinéraire
const JOURS_EN_PARALLELE = 2;
const PAR_PAGE = 1000;

export function normaliserAdresse(adresse: string): string {
  return adresse.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Distance à vol d'oiseau, en kilomètres (formule de Haversine).
export function distanceKm(a: Position, b: Position): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Interroge la Base Adresse Nationale. undefined : service injoignable
// (on réessaiera) ; null : adresse non reconnue.
async function interrogerBAN(adresse: string): Promise<Position | null | undefined> {
  for (const service of GEOCODAGE) {
    try {
      const reponse = await fetch(service + encodeURIComponent(adresse), { signal: AbortSignal.timeout(8000) });
      if (!reponse.ok) continue;
      const f = (await reponse.json())?.features?.[0];
      if (!f || (f.properties?.score ?? 0) < SCORE_MIN) return null;
      const [lon, lat] = f.geometry.coordinates;
      return { lat, lon };
    } catch {
      // service suivant
    }
  }
  return undefined;
}

// Une même adresse n'est demandée qu'une fois à la fois (changement de période
// pendant un calcul, par exemple).
const geocodagesEnCours = new Map<string, Promise<Position | null | undefined>>();
function interrogerUneFois(cle: string, adresse: string): Promise<Position | null | undefined> {
  let promesse = geocodagesEnCours.get(cle);
  if (!promesse) {
    promesse = interrogerBAN(adresse).finally(() => geocodagesEnCours.delete(cle));
    geocodagesEnCours.set(cle, promesse);
  }
  return promesse;
}

// Positions des adresses : d'abord le cache en base, puis la BAN pour les autres.
// null : adresse non reconnue ; absente du résultat : service injoignable.
async function localiserToutes(adresses: string[]): Promise<Map<string, Position | null>> {
  const resultat = new Map<string, Position | null>();
  const cles = [...new Set(adresses.map(normaliserAdresse))];
  for (let i = 0; i < cles.length; i += 200) {
    const { data } = await supabase
      .from('adresses_geocodees')
      .select('adresse, latitude, longitude, trouvee')
      .in('adresse', cles.slice(i, i + 200));
    for (const a of data ?? []) {
      resultat.set(a.adresse as string, a.trouvee ? { lat: a.latitude as number, lon: a.longitude as number } : null);
    }
  }
  const nouvelles: { adresse: string; latitude: number | null; longitude: number | null; trouvee: boolean }[] = [];
  for (const cle of cles) {
    if (resultat.has(cle)) continue;
    const original = adresses.find(a => normaliserAdresse(a) === cle) ?? cle;
    const p = await interrogerUneFois(cle, original);
    if (p === undefined) continue; // service injoignable : rien d'enregistré
    resultat.set(cle, p);
    nouvelles.push({ adresse: cle, latitude: p?.lat ?? null, longitude: p?.lon ?? null, trouvee: !!p });
  }
  if (nouvelles.length) await supabase.from('adresses_geocodees').upsert(nouvelles);
  return resultat;
}

// Distance routière d'un trajet (points dans l'ordre), ou null si le service ne répond pas.
async function distanceRoute(points: Position[]): Promise<number | null> {
  let total = 0;
  const pas = ARRETS_PAR_APPEL + 1;
  for (let i = 0; i < points.length - 1; i += pas) {
    const troncon = points.slice(i, i + pas + 1);
    const coord = (p: Position) => `${p.lon},${p.lat}`;
    const params = new URLSearchParams({
      resource: 'bdtopo-osrm',
      profile: 'car',
      optimization: 'fastest',
      start: coord(troncon[0]),
      end: coord(troncon[troncon.length - 1]),
      distanceUnit: 'kilometer',
      geometryFormat: 'geojson',
      getSteps: 'false',
      getBbox: 'false',
    });
    const milieu = troncon.slice(1, -1);
    if (milieu.length) params.set('intermediates', milieu.map(coord).join('|'));
    try {
      const reponse = await fetch(`${ITINERAIRE}?${params}`, { signal: AbortSignal.timeout(15000) });
      if (!reponse.ok) return null;
      const distance = Number((await reponse.json())?.distance);
      if (!Number.isFinite(distance)) return null;
      total += distance;
    } catch {
      return null;
    }
  }
  return total;
}

interface Passage {
  id: string;
  adresse: string;
  livree_le: string;
}

const jourParis = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(iso));

async function chargerPassages(p: Periode): Promise<Passage[]> {
  const de = debutJourParisISO(p.debut);
  const a = debutJourParisISO(versJour(ajouterJours(depuisJour(p.fin), 1)));
  const tous: Passage[] = [];
  for (let debut = 0; ; debut += PAR_PAGE) {
    const { data, error } = await supabase
      .from('demandes')
      .select('id, patient_adresse, livree_le')
      .eq('statut', 'livree')
      .gte('livree_le', de)
      .lt('livree_le', a)
      .order('livree_le')
      .range(debut, debut + PAR_PAGE - 1);
    if (error) throw new Error(error.message);
    for (const d of data ?? []) tous.push({ id: d.id as string, adresse: d.patient_adresse as string, livree_le: d.livree_le as string });
    if (!data || data.length < PAR_PAGE) return tous;
  }
}

// `provisoire` : une adresse n'a pas pu être localisée faute de service ;
// le résultat est affiché mais pas gardé, pour réessayer au prochain affichage.
async function calculerJour(passages: Passage[], depart: Position): Promise<{ km: number; methode: Methode; nonLocalises: number; provisoire: boolean }> {
  const positions = await localiserToutes(passages.map(p => p.adresse));
  const arrets: Position[] = [];
  let nonLocalises = 0;
  let provisoire = false;
  for (const p of passages) {
    const cle = normaliserAdresse(p.adresse);
    const pos = positions.get(cle);
    if (pos) arrets.push(pos);
    else nonLocalises++;
    if (!positions.has(cle)) provisoire = true;
  }
  if (!arrets.length) return { km: 0, methode: 'route', nonLocalises, provisoire };
  const trajet = [depart, ...arrets, depart];
  const route = await distanceRoute(trajet);
  if (route !== null) return { km: route, methode: 'route', nonLocalises, provisoire };
  let volOiseau = 0;
  for (let i = 0; i < trajet.length - 1; i++) volOiseau += distanceKm(trajet[i], trajet[i + 1]);
  return { km: volOiseau * COEF_ROUTE, methode: 'vol_oiseau', nonLocalises, provisoire };
}

// La signature change dès qu'un passage du jour est ajouté, retiré ou réordonné ;
// elle garde aussi le nombre d'adresses non localisées, pour le signaler.
function signature(passages: Passage[], nonLocalises: number): string {
  return `${passages.map(p => p.id).join(',')}#${nonLocalises}`;
}

// Calcule un jour et l'enregistre ; si ce même jour est déjà en cours de calcul
// (deux périodes qui se recouvrent), on attend ce calcul au lieu de le refaire.
const joursEnCours = new Map<string, Promise<KmJour & { nonLocalises: number }>>();
function calculerEtGarder(jour: string, passages: Passage[], depart: Position): Promise<KmJour & { nonLocalises: number }> {
  const cle = `${jour}|${passages.map(p => p.id).join(',')}`;
  let promesse = joursEnCours.get(cle);
  if (!promesse) {
    promesse = (async () => {
      const r = await calculerJour(passages, depart);
      const km = Math.round(r.km * 10) / 10;
      if (!r.provisoire) await supabase.from('kilometres_jour').upsert({
        jour,
        km,
        nb_passages: passages.length,
        methode: r.methode,
        signature: signature(passages, r.nonLocalises),
        calcule_le: new Date().toISOString(),
      });
      return { jour, km, passages: passages.length, methode: r.methode, nonLocalises: r.nonLocalises };
    })().finally(() => joursEnCours.delete(cle));
    joursEnCours.set(cle, promesse);
  }
  return promesse;
}

export async function kilometresPeriode(p: Periode, onProgression?: (fait: number, total: number) => void): Promise<Kilometres> {
  const passages = await chargerPassages(p);
  const parJour = new Map<string, Passage[]>();
  for (const passage of passages) {
    const jour = jourParis(passage.livree_le);
    parJour.set(jour, [...(parJour.get(jour) ?? []), passage]);
  }
  const jours = [...parJour.keys()].sort();

  const enCache = new Map<string, { km: number; nb_passages: number; methode: Methode; signature: string }>();
  for (let debut = 0; jours.length; debut += PAR_PAGE) {
    const { data } = await supabase
      .from('kilometres_jour')
      .select('jour, km, nb_passages, methode, signature')
      .gte('jour', p.debut)
      .lte('jour', p.fin)
      .order('jour')
      .range(debut, debut + PAR_PAGE - 1);
    for (const k of data ?? []) enCache.set(k.jour as string, { km: Number(k.km), nb_passages: k.nb_passages as number, methode: k.methode as Methode, signature: k.signature as string });
    if (!data || data.length < PAR_PAGE) break;
  }

  const resultats = new Map<string, KmJour & { nonLocalises: number }>();
  const aCalculer: string[] = [];
  for (const jour of jours) {
    const c = enCache.get(jour);
    const ids = parJour.get(jour)!.map(x => x.id).join(',');
    const [idsCache, nonLocalises] = (c?.signature ?? '').split('#');
    // Un jour estimé à vol d'oiseau est recalculé : le service a peut-être repris.
    if (c && idsCache === ids && c.methode === 'route') {
      resultats.set(jour, { jour, km: c.km, passages: c.nb_passages, methode: c.methode, nonLocalises: Number(nonLocalises) || 0 });
    } else {
      aCalculer.push(jour);
    }
  }

  let fait = jours.length - aCalculer.length;
  onProgression?.(fait, jours.length);
  if (aCalculer.length) {
    const depart = (await localiserToutes([DEPART_TOURNEE])).get(normaliserAdresse(DEPART_TOURNEE)) ?? null;
    if (!depart) throw new Error('adresse de la pharmacie introuvable (service de localisation indisponible ?)');
    const file = [...aCalculer];
    const travailleur = async () => {
      for (let jour = file.shift(); jour; jour = file.shift()) {
        const duJour = parJour.get(jour)!;
        resultats.set(jour, await calculerEtGarder(jour, duJour, depart));
        onProgression?.(++fait, jours.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(JOURS_EN_PARALLELE, aCalculer.length) }, travailleur));
  }

  const liste = jours.map(j => resultats.get(j)).filter((x): x is KmJour & { nonLocalises: number } => !!x);
  return {
    jours: liste.map(({ jour, km, passages: n, methode }) => ({ jour, km, passages: n, methode })),
    total: Math.round(liste.reduce((t, j) => t + j.km, 0) * 10) / 10,
    passages: liste.reduce((t, j) => t + j.passages, 0),
    joursVolOiseau: liste.filter(j => j.methode === 'vol_oiseau').length,
    nonLocalises: liste.reduce((t, j) => t + j.nonLocalises, 0),
  };
}
