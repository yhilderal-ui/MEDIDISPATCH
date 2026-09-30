// Liens vers les applications de navigation. Seule l'adresse est transmise
// (jamais le nom du patient). Sans point de départ, l'application part de la
// position actuelle du téléphone.

export function urlGoogleMaps(adresse: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}&travelmode=driving`;
}

export function urlWaze(adresse: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(adresse)}&navigate=yes`;
}

export function urlPlans(adresse: string): string {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(adresse)}&dirflg=d`;
}

// Plans (Apple) n'existe que sur iPhone, iPad et Mac.
export function estAppareilApple(): boolean {
  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
}

// Google Maps accepte 9 étapes intermédiaires + la destination dans un lien :
// au-delà, la tournée est découpée en plusieurs parcours de 10 arrêts.
export const ARRETS_PAR_PARCOURS = 10;

export function urlsTourneeGoogle(adresses: string[]): { debut: number; fin: number; url: string }[] {
  const parcours = [];
  for (let i = 0; i < adresses.length; i += ARRETS_PAR_PARCOURS) {
    const lot = adresses.slice(i, i + ARRETS_PAR_PARCOURS);
    const destination = lot[lot.length - 1];
    const etapes = lot.slice(0, -1);
    const url =
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving` +
      (etapes.length ? `&waypoints=${etapes.map(encodeURIComponent).join('%7C')}` : '');
    parcours.push({ debut: i + 1, fin: i + lot.length, url });
  }
  return parcours;
}
