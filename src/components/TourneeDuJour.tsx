import { CircleCheck, Navigation, Phone, TriangleAlert } from 'lucide-react';
import type { Demande, EtatVu } from '../types';
import BadgeCriticite from './BadgeCriticite';
import BadgeVu from './BadgeVu';
import { CRITICITE_ORDRE, statutAffiche } from '../data';
import BadgeNature from './BadgeNature';
import { aujourdhuiParis, formatJour } from '../lib/dates';
import { urlWaze } from '../lib/itineraire';

interface Props {
  demandes: Demande[];
  onOpen: (demande: Demande) => void;
  etats: Record<string, EtatVu>;
}

// Livraisons du jour à faire, pour le livreur. Il organise sa tournée comme il
// l'entend (décision du 30/09) : la liste met simplement les urgences en tête,
// et chaque carte ouvre l'adresse dans Waze.
export default function TourneeDuJour({ demandes, onOpen, etats }: Props) {
  const jour = aujourdhuiParis();
  const duJour = demandes.filter(d => d.jour_livraison === jour && d.statut !== 'annulee');
  const aLivrer = duJour
    .filter(d => d.statut === 'nouvelle' || d.statut === 'en_cours')
    .sort((a, b) => CRITICITE_ORDRE[a.criticite] - CRITICITE_ORDRE[b.criticite] || a.numero_ticket.localeCompare(b.numero_ticket));
  const livrees = duJour
    .filter(d => d.statut === 'livree')
    .sort((a, b) => (a.livree_le ?? '').localeCompare(b.livree_le ?? ''));

  return (
    <div className="h-full overflow-y-auto pb-24 md:pb-6">
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="bg-white rounded-2xl border border-black/5 p-4">
          <h3 className="text-sm font-700 text-gray-900">Tournée du {formatJour(jour)}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {(() => {
              const nbRetours = aLivrer.filter(d => d.nature === 'retour').length;
              const nbLivraisons = aLivrer.length - nbRetours;
              return (
                <>
                  <span className="font-600 text-gray-800">{nbLivraisons}</span> à livrer
                  {nbRetours > 0 && <> · <span className="font-600 text-amber-700">{nbRetours}</span> à récupérer</>}
                </>
              );
            })()}
            {livrees.length > 0 && <> · <span className="font-600 text-emerald-700">{livrees.length}</span> terminée{livrees.length > 1 ? 's' : ''}</>}
          </p>
        </div>

        {aLivrer.length === 0 && (
          <div className="flex items-center justify-center h-28 border-2 border-dashed border-gray-200 rounded-2xl">
            <span className="text-xs text-gray-400">{livrees.length ? 'Tout est livré pour aujourd’hui.' : 'Aucune livraison prévue aujourd’hui.'}</span>
          </div>
        )}

        <ul className="space-y-3">
          {aLivrer.map(d => {
            const statut = statutAffiche(d);
            return (
              <li key={d.id} className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[11px] text-gray-400 tracking-widest">{d.numero_ticket}</span>
                  <BadgeVu etat={etats[d.id] ?? null} />
                  <BadgeNature demande={d} />
                  <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ color: statut.color, background: statut.color + '14' }}>
                    {statut.label}
                  </span>
                  <span className="ml-auto"><BadgeCriticite criticite={d.criticite} /></span>
                </div>
                <p className="font-700 text-gray-900 text-[15px] leading-tight">{d.patient_nom}</p>
                <p className="text-xs text-gray-600 leading-snug">{d.patient_adresse}</p>
                {d.nature === 'retour' && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-2.5 py-1.5 leading-snug">
                    <span className="font-600">À récupérer :</span>{' '}
                    {d.medicaments.map(m => (m.quantite ? `${m.nom} (${m.quantite})` : m.nom)).join(', ')}
                  </p>
                )}
                <a href={`tel:${d.patient_telephone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-xs text-gray-600 underline decoration-gray-300">
                  <Phone size={12} className="text-gray-400" aria-hidden /> {d.patient_telephone}
                </a>
                {d.notes_initiales && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                    <TriangleAlert size={13} className="text-amber-600 shrink-0 mt-px" aria-hidden />
                    <p className="text-[11px] text-amber-700 leading-snug">{d.notes_initiales}</p>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <a
                    href={urlWaze(d.patient_adresse)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-600 px-4 py-2.5 rounded-xl text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800"
                  >
                    <Navigation size={15} aria-hidden /> Ouvrir dans Waze
                  </a>
                  <button type="button" onClick={() => onOpen(d)} className="text-xs font-600 text-violet-700 hover:text-violet-900 px-1 py-1.5">
                    Ouvrir la demande →
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {livrees.length > 0 && (
          <details className="bg-white rounded-2xl border border-black/5 p-4">
            <summary className="text-xs font-600 text-gray-600 cursor-pointer select-none inline-flex items-center gap-1.5">
              <CircleCheck size={14} className="text-emerald-600" aria-hidden /> Terminées aujourd’hui ({livrees.length})
            </summary>
            <ul className="mt-3 divide-y divide-gray-100">
              {livrees.map(d => (
                <li key={d.id}>
                  <button type="button" onClick={() => onOpen(d)} className="w-full text-left py-2 flex items-center gap-3 text-xs hover:bg-gray-50">
                    <span className="font-mono text-[11px] text-gray-400">{d.numero_ticket}</span>
                    <span className="flex-1 min-w-0 truncate text-gray-700">{d.patient_nom}</span>
                    {d.livree_le && (
                      <span className="text-gray-400 shrink-0">
                        {new Date(d.livree_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
