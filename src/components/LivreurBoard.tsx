import { useState } from 'react';
import { CalendarDays, FileText, LayoutGrid, Pill, Route, TriangleAlert } from 'lucide-react';
import BadgeCriticite from './BadgeCriticite';
import type { Demande, EtatVu, Statut } from '../types';
import BadgeVu from './BadgeVu';
import OngletsStatut from './OngletsStatut';
import { CRITICITE_CONFIG, CRITICITE_ORDRE, STATUT_CONFIG } from '../data';
import WeekView from './WeekView';
import TourneeDuJour from './TourneeDuJour';
import { ajouterJours, formatJour, lundiDeLaSemaine, moisCourt } from '../lib/dates';

type Tri = 'date' | 'criticite';
type Vue = 'kanban' | 'week' | 'tournee';

interface Props {
  demandes: Demande[];
  onOpen: (demande: Demande) => void;
  onDropCard: (demandeId: string, jour: string) => void;
  etats: Record<string, EtatVu>;
  // Écran d'arrivée : la Tournée pour le compte Livreurs, le tableau sinon.
  vueInitiale?: Vue;
}

function MedicalCard({ demande, onClick, etatVu }: { demande: Demande; onClick: () => void; etatVu: EtatVu }) {
  const criticite = CRITICITE_CONFIG[demande.criticite];
  const annulee = demande.statut === 'annulee';
  const nbMedicaments = demande.medicaments.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-new w-full shrink-0 text-left bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow group ${
        annulee ? 'border-red-200 opacity-60' : 'border-black/5'
      } ${etatVu ? 'ring-2 ring-violet-400/60' : ''}`}
    >
      <div className="h-1" style={{ background: annulee ? '#ef4444' : criticite.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[11px] text-gray-400 tracking-widest">{demande.numero_ticket}</span>
            <BadgeVu etat={etatVu} />
          </div>
          <span className="text-[11px] text-gray-500 font-500 shrink-0">{formatJour(demande.jour_livraison)}</span>
        </div>
        <p className="font-700 text-gray-900 text-[15px] leading-tight mb-2">{demande.patient_nom}</p>
        <div className="flex items-start gap-2 mb-3">
          <span className="mt-1 w-2 h-2 rounded-full bg-red-400 shrink-0" />
          <p className="text-xs text-gray-500 leading-snug">{demande.patient_adresse}</p>
        </div>
        {demande.notes_initiales && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-3 flex items-start gap-1.5">
            <TriangleAlert size={13} className="text-amber-600 shrink-0 mt-px" aria-hidden />
            <p className="text-[11px] text-amber-700 leading-snug">{demande.notes_initiales}</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <BadgeCriticite criticite={demande.criticite} />
          <div className="flex items-center gap-2 text-[11px] text-gray-400 group-hover:text-gray-600 transition-colors shrink-0">
            <span className="inline-flex items-center gap-1" title="Médicaments"><Pill size={12} aria-hidden /> {nbMedicaments}</span>
            {demande.documents.length > 0 && (
              <span className="inline-flex items-center gap-1" title="Documents"><FileText size={12} aria-hidden /> {demande.documents.length}</span>
            )}
            <span className="font-500">Voir →</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function TriBouton({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg transition-all"
      style={{ background: actif ? '#111' : '#f3f4f6', color: actif ? '#fff' : '#6b7280' }}
    >
      {children}
    </button>
  );
}

function Colonne({ statut, items, onOpen, etats, visibleMobile }: {
  statut: Statut; items: Demande[]; onOpen: (d: Demande) => void; etats: Record<string, EtatVu>; visibleMobile: boolean;
}) {
  const cfg = STATUT_CONFIG[statut];
  return (
    <div className={`${visibleMobile ? 'flex' : 'hidden'} md:flex flex-col w-full md:min-w-[280px] md:w-[280px] shrink-0 min-h-0`}>
      <div className="hidden md:flex items-center justify-between mb-3 px-3 py-2 rounded-xl" style={{ background: cfg.color + '12' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
          <span className="text-xs font-700 uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
        <span className="text-[10px] font-700 px-2 py-0.5 rounded-full text-white" style={{ background: cfg.color }}>{items.length}</span>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
        {items.length === 0 && (
          <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-2xl" style={{ borderColor: cfg.color + '40' }}>
            <span className="text-xs font-500" style={{ color: cfg.color + '99' }}>Aucune demande</span>
          </div>
        )}
        {items.map(d => (
          <MedicalCard key={d.id} demande={d} onClick={() => onOpen(d)} etatVu={etats[d.id] ?? null} />
        ))}
      </div>
    </div>
  );
}

export default function LivreurBoard({ demandes, onOpen, onDropCard, etats, vueInitiale = 'kanban' }: Props) {
  const [tri, setTri] = useState<Tri>('date');
  const [vue, setVue] = useState<Vue>(vueInitiale);
  const [onglet, setOnglet] = useState<Statut>('nouvelle');
  const [debutSemaine, setDebutSemaine] = useState<Date>(() => lundiDeLaSemaine(new Date()));

  const trier = (items: Demande[]) =>
    [...items].sort((a, b) =>
      tri === 'date'
        ? a.jour_livraison.localeCompare(b.jour_livraison) || CRITICITE_ORDRE[a.criticite] - CRITICITE_ORDRE[b.criticite]
        : CRITICITE_ORDRE[a.criticite] - CRITICITE_ORDRE[b.criticite] || a.jour_livraison.localeCompare(b.jour_livraison),
    );

  const parStatut = (s: Statut) => trier(demandes.filter(d => d.statut === s));
  const annulees = parStatut('annulee');
  const finSemaine = ajouterJours(debutSemaine, 5);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 mb-4 flex-wrap shrink-0">
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {vue === 'kanban' && (
            <>
              <span className="text-[10px] font-700 uppercase tracking-widest text-gray-400">Trier</span>
              <TriBouton actif={tri === 'date'} onClick={() => setTri('date')}>
                <CalendarDays size={13} aria-hidden /> Date
              </TriBouton>
              <TriBouton actif={tri === 'criticite'} onClick={() => setTri('criticite')}>
                <TriangleAlert size={13} aria-hidden /> Criticité
              </TriBouton>
            </>
          )}

          {vue === 'week' && (
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Semaine précédente" onClick={() => setDebutSemaine(d => ajouterJours(d, -7))} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">‹</button>
              <span className="text-xs font-600 text-gray-600 font-mono whitespace-nowrap">
                {debutSemaine.getDate()} — {finSemaine.getDate()} {moisCourt(finSemaine)}
              </span>
              <button type="button" aria-label="Semaine suivante" onClick={() => setDebutSemaine(d => ajouterJours(d, 7))} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">›</button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
            {([['kanban', LayoutGrid, 'Vue par statut'], ['week', CalendarDays, 'Vue semaine'], ['tournee', Route, 'Tournée du jour']] as [Vue, typeof LayoutGrid, string][]).map(([v, Icone, titre]) => (
              <button
                key={v}
                type="button"
                title={titre}
                aria-label={titre}
                onClick={() => setVue(v)}
                className="text-xs px-2.5 py-1 rounded-md transition-all font-600"
                style={{
                  background: vue === v ? 'white' : 'transparent',
                  color: vue === v ? '#111' : '#9ca3af',
                  boxShadow: vue === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icone size={14} aria-hidden />
                  {v === 'tournee' && 'Tournée'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {vue === 'kanban' ? (
        <div className="flex flex-col flex-1 min-h-0">
          <OngletsStatut demandes={demandes} etats={etats} actif={onglet} onChange={setOnglet} />
          <div className="flex gap-5 flex-1 min-h-0 md:overflow-x-auto pb-24 md:pb-4">
            <Colonne statut="nouvelle" items={parStatut('nouvelle')} onOpen={onOpen} etats={etats} visibleMobile={onglet === 'nouvelle'} />
            <Colonne statut="en_cours" items={parStatut('en_cours')} onOpen={onOpen} etats={etats} visibleMobile={onglet === 'en_cours'} />
            <Colonne statut="livree" items={parStatut('livree')} onOpen={onOpen} etats={etats} visibleMobile={onglet === 'livree'} />
            {(annulees.length > 0 || onglet === 'annulee') && (
              <Colonne statut="annulee" items={annulees} onOpen={onOpen} etats={etats} visibleMobile={onglet === 'annulee'} />
            )}
          </div>
        </div>
      ) : vue === 'tournee' ? (
        <div className="flex-1 min-h-0">
          <TourneeDuJour demandes={demandes} onOpen={onOpen} etats={etats} />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <WeekView
            demandes={demandes.filter(d => d.statut !== 'annulee')}
            weekStart={debutSemaine}
            onOpen={onOpen}
            onDropCard={onDropCard}
            etats={etats}
          />
        </div>
      )}
    </div>
  );
}
