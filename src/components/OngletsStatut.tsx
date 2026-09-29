import type { Demande, EtatVu, Statut } from '../types';
import { STATUT_CONFIG } from '../data';

interface Props {
  demandes: Demande[];
  etats: Record<string, EtatVu>;
  actif: Statut;
  onChange: (s: Statut) => void;
}

const ONGLETS: Statut[] = ['nouvelle', 'en_cours', 'livree', 'annulee'];

// Sur téléphone, les colonnes du tableau deviennent des onglets (une colonne
// pleine largeur à la fois). Masqué à partir de la taille tablette.
export default function OngletsStatut({ demandes, etats, actif, onChange }: Props) {
  return (
    <div className="md:hidden grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-xl mb-3 shrink-0" role="tablist">
      {ONGLETS.map(s => {
        const cfg = STATUT_CONFIG[s];
        const items = demandes.filter(d => d.statut === s);
        const nonVues = items.some(d => etats[d.id]);
        const selectionne = s === actif;
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={selectionne}
            onClick={() => onChange(s)}
            className="relative flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-600 transition-all"
            style={{
              background: selectionne ? 'white' : 'transparent',
              color: selectionne ? cfg.color : '#6b7280',
              boxShadow: selectionne ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <cfg.Icone size={15} aria-hidden />
            <span>{cfg.court} · {items.length}</span>
            {nonVues && <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-violet-500 pulse-dot" aria-label="non vue" />}
          </button>
        );
      })}
    </div>
  );
}
