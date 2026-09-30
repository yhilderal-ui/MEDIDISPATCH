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
