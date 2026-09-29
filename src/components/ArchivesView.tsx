import type { Demande } from '../types';
import BadgeCriticite from './BadgeCriticite';
import { formatHorodatage, formatJour } from '../lib/dates';
import { JOURS_ARCHIVES_AFFICHES } from '../lib/demandes';

interface Props {
  demandes: Demande[];
  chargement: boolean;
  onOpen: (demande: Demande) => void;
  recherche: string;
}

// Demandes livrées avant aujourd'hui ou archivées à la main, hors du tableau actif.
export default function ArchivesView({ demandes, chargement, onOpen, recherche }: Props) {
  const bandeau = (
    <p className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded-xl px-3 py-2 mb-3">
      {recherche
        ? `Recherche dans toutes les archives, quelle que soit leur ancienneté (200 résultats au plus).`
        : `Affichage des ${JOURS_ARCHIVES_AFFICHES} derniers jours. Pour une demande plus ancienne, tapez le nom du patient ou le n° de ticket dans la recherche.`}
    </p>
  );

  if (chargement) {
    return (
      <div>
        {bandeau}
        <p className="text-xs text-gray-400 font-mono text-center py-10">Chargement des archives…</p>
      </div>
    );
  }

  if (demandes.length === 0) {
    return (
      <div>
        {bandeau}
        <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-xs text-gray-400">{recherche ? 'Aucune demande archivée ne correspond.' : 'Aucune demande archivée ces 30 derniers jours.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-24 md:pb-4">
      {bandeau}
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
