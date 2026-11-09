import { MapPin, Split } from 'lucide-react';
import { NATURE_CONFIG } from '../data';
import type { Demande } from '../types';
import { SECTEURS } from '../lib/livreurs';
import { nomLivreur, useLivreurs } from '../lib/livreursContexte';

// Petites étiquettes « Retour » et « Reliquat » sur les cartes (décisions du
// 03/10), et secteur · livreur une fois la carte répartie (décision du 08/11).
// Une livraison ordinaire non répartie n'affiche rien, pour ne pas surcharger.
export default function BadgeNature({ demande }: { demande: Pick<Demande, 'nature' | 'reliquat_de'> & Partial<Pick<Demande, 'secteur' | 'livreur_id'>> }) {
  const retour = demande.nature === 'retour' ? NATURE_CONFIG.retour : null;
  const livreurs = useLivreurs();
  const secteur = demande.secteur ? SECTEURS[demande.secteur] : null;
  const livreur = nomLivreur(livreurs, demande.livreur_id ?? null);
  return (
    <>
      {(secteur || livreur) && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-700 px-1.5 py-0.5 rounded-full"
          style={secteur ? { color: secteur.color, background: secteur.bg } : { color: '#374151', background: '#f3f4f6' }}
        >
          <MapPin size={11} aria-hidden />
          {[secteur?.label, livreur].filter(Boolean).join(' · ')}
        </span>
      )}
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
