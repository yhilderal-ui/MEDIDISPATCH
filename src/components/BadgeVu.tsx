import type { EtatVu } from '../types';

// Pastille « vu / non vu » : le cœur du cahier des charges (section 4),
// pour qu'aucune demande ou mise à jour ne passe inaperçue.
export default function BadgeVu({ etat, compact }: { etat: EtatVu; compact?: boolean }) {
  if (!etat) return null;
  const libelle = etat === 'nouvelle' ? 'Non vue' : 'Mise à jour';
  return (
    <span
      className={`inline-flex items-center gap-1 font-700 uppercase tracking-widest text-violet-700 bg-violet-100 rounded-full shrink-0 ${
        compact ? 'text-[7px] px-1 py-0.5' : 'text-[9px] px-1.5 py-0.5'
      }`}
      title={etat === 'nouvelle' ? 'Pas encore consultée' : "Modifiée par l'autre compte depuis votre dernière consultation"}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 pulse-dot" aria-hidden />
      {libelle}
    </span>
  );
}
