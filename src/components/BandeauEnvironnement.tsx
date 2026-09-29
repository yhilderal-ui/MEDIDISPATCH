import { FlaskConical } from 'lucide-react';

// Adresses de PRODUCTION (reliées à la vraie base). Toute autre adresse —
// prévisualisation Vercel, ordinateur de développement — utilise la base de
// TEST : un bandeau le rappelle pour ne jamais confondre les deux.
const ADRESSES_PRODUCTION = ['www.medi-dispatch.fr', 'medi-dispatch.fr', 'medidispatch.vercel.app'];

export const estProduction = ADRESSES_PRODUCTION.includes(window.location.hostname);

export default function BandeauEnvironnement() {
  if (estProduction) return null;
  return (
    <div
      role="note"
      className="shrink-0 flex items-center justify-center gap-2 bg-amber-400 text-amber-950 text-[11px] font-700 uppercase tracking-widest px-3 py-1"
    >
      <FlaskConical size={13} aria-hidden />
      Version de test — données fictives, sans lien avec la production
    </div>
  );
}
