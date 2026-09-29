import type { Demande, EtatVu } from '../types';
import BadgeVu from './BadgeVu';
import { CRITICITE_CONFIG, STATUT_CONFIG } from '../data';
import { formatJour } from '../lib/dates';

interface Props {
  demande: Demande;
  onOpen: (demande: Demande) => void;
  etatVu?: EtatVu;
}

// Carte compacte du tableau dispatcheur : ticket, patient, criticité, statut.
export default function DeliveryCardComponent({ demande, onOpen, etatVu = null }: Props) {
  const criticite = CRITICITE_CONFIG[demande.criticite];
  const statut = STATUT_CONFIG[demande.statut];
  const annulee = demande.statut === 'annulee';

  return (
    <button
      type="button"
      onClick={() => onOpen(demande)}
      className={`card-new w-full text-left bg-white rounded-2xl border overflow-hidden select-none transition-shadow hover:shadow-md ${
        annulee ? 'opacity-60 border-red-100' : 'border-black/5 shadow-sm'
      } ${etatVu ? 'ring-2 ring-violet-400/60' : ''}`}
    >
      <div className="h-1" style={{ background: annulee ? statut.color : criticite.color }} />

      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[11px] text-gray-400 tracking-widest">{demande.numero_ticket}</span>
            <BadgeVu etat={etatVu} />
          </div>
          <span className="text-[11px] text-gray-500 font-500 shrink-0">{formatJour(demande.jour_livraison)}</span>
        </div>

        <p className="font-600 text-gray-900 text-sm mb-0.5 leading-tight">{demande.patient_nom}</p>
        <div className="flex items-start gap-2 mb-3">
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          <p className="text-xs text-gray-500 leading-snug truncate">{demande.patient_adresse}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-600 truncate" style={{ color: criticite.color }}>
            {criticite.emoji} {criticite.label}
          </span>
          <span
            className="text-[10px] font-600 uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
            style={{ color: statut.color, background: statut.color + '18' }}
          >
            {statut.court}
          </span>
        </div>
      </div>
    </button>
  );
}
