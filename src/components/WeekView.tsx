import type { Demande, EtatVu } from '../types';
import BadgeCriticite from './BadgeCriticite';
import BadgeVu from './BadgeVu';
import { CRITICITE_CONFIG, STATUT_CONFIG } from '../data';
import { ajouterJours, aujourdhuiParis, moisCourt, versJour } from '../lib/dates';

interface Props {
  demandes: Demande[];
  weekStart: Date;
  onOpen: (demande: Demande) => void;
  onDropCard: (demandeId: string, jour: string) => void;
  etats: Record<string, EtatVu>;
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function WeekCard({ demande, onClick, etatVu }: { demande: Demande; onClick: () => void; etatVu: EtatVu }) {
  const criticite = CRITICITE_CONFIG[demande.criticite];
  const statut = STATUT_CONFIG[demande.statut];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border border-black/5 shadow-sm hover:shadow-md transition-shadow overflow-hidden ${etatVu ? 'ring-2 ring-violet-400/60' : ''}`}
    >
      <div className="h-0.5" style={{ background: criticite.color }} />
      <div className="px-2.5 py-2">
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className="font-mono text-[9px] text-gray-400 tracking-widest leading-tight">{demande.numero_ticket}</span>
          <span
            className="text-[8px] font-700 uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
            style={{ color: statut.color, background: statut.color + '18' }}
          >
            {statut.court}
          </span>
        </div>
        {etatVu && <div className="mb-1"><BadgeVu etat={etatVu} compact /></div>}
        <p className="font-600 text-gray-900 text-[11px] leading-tight truncate">{demande.patient_nom}</p>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{demande.patient_adresse}</p>
        <div className="mt-1.5 flex">
          <BadgeCriticite criticite={demande.criticite} className="text-[9px]" />
        </div>
      </div>
    </button>
  );
}

// Vue hebdomadaire : une colonne par jour, du lundi au samedi.
// Glisser une carte vers un autre jour la reporte (la base vérifie la date).
export default function WeekView({ demandes, weekStart, onOpen, onDropCard, etats }: Props) {
  const jours = Array.from({ length: 6 }, (_, i) => ajouterJours(weekStart, i));
  const aujourdhui = aujourdhuiParis();

  return (
    <div className="flex gap-3 h-full min-h-0 overflow-x-auto">
      {jours.map((jour, i) => {
        const iso = versJour(jour);
        const items = demandes.filter(d => d.jour_livraison === iso);
        const estAujourdhui = iso === aujourdhui;

        return (
          <div
            key={iso}
            className="flex flex-col min-w-[160px] flex-1"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              const id = e.dataTransfer.getData('demandeId');
              if (id) onDropCard(id, iso);
            }}
          >
            <div className={`flex items-center justify-between mb-2 px-2 py-1.5 rounded-xl ${estAujourdhui ? 'bg-gray-900' : 'bg-white border border-gray-100'}`}>
              <div>
                <p className={`text-[10px] font-700 uppercase tracking-widest ${estAujourdhui ? 'text-white/60' : 'text-gray-400'}`}>
                  {JOURS[i]}
                </p>
                <p className={`text-sm font-700 leading-tight ${estAujourdhui ? 'text-white' : 'text-gray-800'}`}>
                  {jour.getDate()} {moisCourt(jour)}
                </p>
              </div>
              {items.length > 0 && (
                <span
                  className="text-[10px] font-700 w-5 h-5 flex items-center justify-center rounded-full"
                  style={estAujourdhui ? { background: 'rgba(255,255,255,0.2)', color: 'white' } : { background: '#f3f4f6', color: '#6b7280' }}
                >
                  {items.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 rounded-xl min-h-[80px] p-1 border-2 border-dashed border-transparent hover:border-gray-200 transition-colors">
              {items.length === 0 && (
                <div className="flex items-center justify-center flex-1 min-h-[60px]">
                  <p className="text-[10px] text-gray-300 font-500">Aucune livraison</p>
                </div>
              )}
              {items.map(d => (
                <div key={d.id} draggable onDragStart={e => e.dataTransfer.setData('demandeId', d.id)}>
                  <WeekCard demande={d} onClick={() => onOpen(d)} etatVu={etats[d.id] ?? null} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
