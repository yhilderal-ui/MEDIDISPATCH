import type { Demande } from '../types';
import BadgeCriticite from './BadgeCriticite';
import { formatHorodatage, formatJour } from '../lib/dates';

interface Props {
  demandes: Demande[];
  chargement: boolean;
  onOpen: (demande: Demande) => void;
}

// Demandes livrées depuis plus de 30 jours, hors du tableau actif.
export default function ArchivesView({ demandes, chargement, onOpen }: Props) {
  if (chargement) {
    return <p className="text-xs text-gray-400 font-mono text-center py-10">Chargement des archives…</p>;
  }

  if (demandes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-2xl">
        <p className="text-xs text-gray-400">Aucune demande archivée.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-4">
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm divide-y divide-gray-100">
        {demandes.map(d => {
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onOpen(d)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors grid grid-cols-[auto_1fr] sm:grid-cols-[7rem_1fr_9rem_10rem] gap-x-4 gap-y-0.5 items-center"
            >
              <span className="font-mono text-[11px] text-gray-400 tracking-widest">{d.numero_ticket}</span>
              <span className="min-w-0">
                <span className="block text-sm font-600 text-gray-900 truncate">{d.patient_nom}</span>
                <span className="block text-[11px] text-gray-400 truncate">{d.patient_adresse}</span>
              </span>
              <span className="col-start-2 sm:col-start-auto">
                <BadgeCriticite criticite={d.criticite} />
              </span>
              <span className="text-[11px] text-gray-500 col-start-2 sm:col-start-auto">
                Prévue {formatJour(d.jour_livraison)}
                {d.livree_le && <span className="block text-emerald-600">Livrée {formatHorodatage(d.livree_le)}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
