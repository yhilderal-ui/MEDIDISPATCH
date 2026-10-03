import { Split } from 'lucide-react';
import { NATURE_CONFIG } from '../data';
import type { Demande } from '../types';

// Petites étiquettes « Retour » et « Reliquat » sur les cartes (décisions du
// 03/10). Une livraison ordinaire n'affiche rien, pour ne pas surcharger.
export default function BadgeNature({ demande }: { demande: Pick<Demande, 'nature' | 'reliquat_de'> }) {
  const retour = demande.nature === 'retour' ? NATURE_CONFIG.retour : null;
  return (
    <>
      {retour && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-700 uppercase tracking-wide px-1.5 py-0.5 rounded-full"
          style={{ color: retour.color, background: retour.bg }}
        >
          <retour.Icone size={11} aria-hidden /> Retour
        </span>
      )}
      {demande.reliquat_de && (
        <span className="inline-flex items-center gap-1 text-[10px] font-700 uppercase tracking-wide px-1.5 py-0.5 rounded-full text-sky-700 bg-sky-50">
          <Split size={11} aria-hidden /> Reliquat
        </span>
      )}
    </>
  );
}
