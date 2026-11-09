import { useEffect, useState } from 'react';
import { CalendarDays, Clock, FileText, LayoutGrid, Pill, Route, TriangleAlert } from 'lucide-react';
import BadgeCriticite from './BadgeCriticite';
import type { Demande, EtatVu, Statut } from '../types';
import BadgeVu from './BadgeVu';
import BadgeNature from './BadgeNature';
import OngletsStatut from './OngletsStatut';
import { CRITICITE_CONFIG, CRITICITE_ORDRE, plusRecenteEnTete, STATUT_CONFIG } from '../data';
import WeekView from './WeekView';
import TourneeDuJour from './TourneeDuJour';
import { ajouterJours, formatJour, lundiDeLaSemaine, moisCourt } from '../lib/dates';
import { useGlisserStatut } from '../lib/useGlisserStatut';
import type { Selection } from '../lib/selection';
import { CaseCarte, CaseGroupe } from './Selection';
import { useLivreurs } from '../lib/livreursContexte';
import { lireTourneeDe, memoriserTourneeDe } from '../lib/livreurs';
import { MEDICAMENTS_ACTIFS } from '../config/fonctionnalites';

// « Récentes » (par défaut) : la dernière carte créée en tête (décision du 07/11).
type Tri = 'recentes' | 'date' | 'criticite';
type Vue = 'kanban' | 'week' | 'tournee';

interface Props {
  demandes: Demande[];
  onOpen: (demande: Demande) => void;
  onDropCard: (demandeId: string, jour: string) => void;
  onDeposerStatut?: (demande: Demande, statut: Statut) => void;
  etats: Record<string, EtatVu>;
  selection: Selection;
  boutonSelection?: React.ReactNode; // à gauche de la barre d'outils, au-dessus des cartes
  // Écran d'arrivée : la Tournée pour le compte Livreurs, le tableau sinon.
  vueInitiale?: Vue;
  // Logisticien (qui livre aussi) : nom de son compte, pour proposer d'abord
  // sa propre tournée dans le sélecteur « Tournée de ».
  tourneeLogisticien?: { nomCompte: string };
}

function MedicalCard({ demande, onClick, etatVu, selectionnee }: { demande: Demande; onClick: () => void; etatVu: EtatVu; selectionnee?: boolean }) {
  const criticite = CRITICITE_CONFIG[demande.criticite];
  const annulee = demande.statut === 'annulee';
  const nbMedicaments = demande.medicaments.length;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selectionnee}
      className={`card-new w-full shrink-0 text-left bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow group ${
        annulee ? 'border-red-200 opacity-60' : 'border-black/5'
      } ${selectionnee ? 'ring-2 ring-sky-500' : etatVu ? 'ring-2 ring-violet-400/60' : ''}`}
    >
      <div className="h-1" style={{ background: annulee ? '#ef4444' : criticite.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className={`flex items-center gap-1.5 flex-wrap ${selectionnee !== undefined ? 'pl-6' : ''}`}>
            <span className="font-mono text-[11px] text-gray-400 tracking-widest">{demande.numero_ticket}</span>
            <BadgeVu etat={etatVu} />
            <BadgeNature demande={demande} />
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
            {MEDICAMENTS_ACTIFS && (
              <span className="inline-flex items-center gap-1" title="Médicaments"><Pill size={12} aria-hidden /> {nbMedicaments}</span>
            )}
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

function Colonne({ statut, items, onOpen, etats, visibleMobile, glisser, selection }: {
  statut: Statut; items: Demande[]; onOpen: (d: Demande) => void; etats: Record<string, EtatVu>; visibleMobile: boolean;
  glisser: ReturnType<typeof useGlisserStatut>; selection: Selection;
}) {
  const cfg = STATUT_CONFIG[statut];
  const depot = glisser.colonne(statut);
  return (
    <div {...depot.props} className={`${visibleMobile ? 'flex' : 'hidden'} md:flex flex-col w-full md:min-w-[280px] md:w-[280px] shrink-0 md:min-h-0`}>
      <div className="hidden md:flex items-center justify-between mb-3 px-3 py-2 rounded-xl" style={{ background: cfg.color + '12' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
          <span className="text-xs font-700 uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
        <span className="text-[10px] font-700 px-2 py-0.5 rounded-full text-white" style={{ background: cfg.color }}>{items.length}</span>
      </div>
      <div
        className={`flex flex-col gap-3 md:overflow-y-auto md:flex-1 pr-1 rounded-2xl transition-colors ${depot.possible ? 'outline-2 outline-dashed -outline-offset-2 p-1' : ''}`}
        style={depot.possible ? { outlineColor: cfg.color + (depot.survolee ? '' : '66'), background: depot.survolee ? cfg.color + '0f' : undefined } : undefined}
      >
        <CaseGroupe ids={items.map(d => d.id)} selection={selection} />
        {items.length === 0 && (
          <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-2xl" style={{ borderColor: cfg.color + '40' }}>
            <span className="text-xs font-500" style={{ color: cfg.color + '99' }}>Aucune demande</span>
          </div>
        )}
        {items.map(d => (
          <div key={d.id} {...glisser.carte(d)} className={`shrink-0 relative ${glisser.glisse?.id === d.id ? 'opacity-40' : ''}`}>
            <MedicalCard
              demande={d}
              onClick={() => (selection.actif ? selection.basculer(d.id) : onOpen(d))}
              etatVu={etats[d.id] ?? null}
              selectionnee={selection.actif ? selection.ids.has(d.id) : undefined}
            />
            {selection.actif && <CaseCarte coche={selection.ids.has(d.id)} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LivreurBoard({ demandes, onOpen, onDropCard, onDeposerStatut, etats, selection, boutonSelection, vueInitiale = 'kanban', tourneeLogisticien }: Props) {
  const livreurs = useLivreurs();
  // Tournée affichée pour le logisticien : la sienne par défaut (livreur portant
  // le même prénom que son compte), sinon celle de tous.
  // (Calculé à chaque affichage : la liste des livreurs arrive après le premier.)
  const [choixTournee, setChoixTournee] = useState<string | null>(() => lireTourneeDe());
  const moi = tourneeLogisticien && livreurs.find(l => l.nom.trim().toLowerCase() === tourneeLogisticien.nomCompte.trim().toLowerCase());
  const tourneeDe = choixTournee ?? moi?.id ?? 'tous';
  const choisirTournee = (v: string) => {
    memoriserTourneeDe(v);
    setChoixTournee(v);
  };
  const tourneeConnue = tourneeDe === 'tous' || livreurs.some(l => l.id === tourneeDe);
  const demandesTournee =
    tourneeLogisticien && tourneeDe !== 'tous' && tourneeConnue ? demandes.filter(d => d.livreur_id === tourneeDe) : demandes;
  const glisser = useGlisserStatut(selection.actif ? undefined : onDeposerStatut);
  const [tri, setTri] = useState<Tri>('recentes');
  const [vue, setVue] = useState<Vue>(vueInitiale);
  const [onglet, setOnglet] = useState<Statut>('nouvelle');
  const [debutSemaine, setDebutSemaine] = useState<Date>(() => lundiDeLaSemaine(new Date()));
  // La Tournée n'a pas de cases à cocher : le mode sélection ouvre le tableau.
  useEffect(() => {
    if (selection.actif && vue === 'tournee') setVue('kanban');
  }, [selection.actif, vue]);

  const trier = (items: Demande[]) =>
    [...items].sort((a, b) =>
      tri === 'recentes'
        ? plusRecenteEnTete(a, b)
        : tri === 'date'
          ? a.jour_livraison.localeCompare(b.jour_livraison) || CRITICITE_ORDRE[a.criticite] - CRITICITE_ORDRE[b.criticite]
          : CRITICITE_ORDRE[a.criticite] - CRITICITE_ORDRE[b.criticite] || a.jour_livraison.localeCompare(b.jour_livraison),
    );

  const parStatut = (s: Statut) => trier(demandes.filter(d => d.statut === s));
  const annulees = parStatut('annulee');
  const finSemaine = ajouterJours(debutSemaine, 5);

  return (
    // Sur téléphone, tout l'écran défile d'un bloc (barre d'outils, onglets et
    // cartes) ; sur ordinateur, chaque colonne défile séparément.
    <div className="flex flex-col h-full min-h-0 overflow-y-auto md:overflow-visible">
      <div className="flex items-center gap-3 mb-4 flex-wrap shrink-0">
        {boutonSelection}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {vue === 'kanban' && (
            <>
              <span className="text-[10px] font-700 uppercase tracking-widest text-gray-400">Trier</span>
              <TriBouton actif={tri === 'recentes'} onClick={() => setTri('recentes')}>
                <Clock size={13} aria-hidden /> Récentes
              </TriBouton>
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
        <div className="flex flex-col md:flex-1 md:min-h-0">
          <OngletsStatut demandes={demandes} etats={etats} actif={onglet} onChange={setOnglet} />
          <div className={`flex gap-5 md:flex-1 md:min-h-0 md:overflow-x-auto ${selection.actif ? 'pb-48 md:pb-24' : 'pb-24 md:pb-4'}`}>
            <Colonne statut="nouvelle" items={parStatut('nouvelle')} onOpen={onOpen} etats={etats} visibleMobile={onglet === 'nouvelle'} glisser={glisser} selection={selection} />
            <Colonne statut="en_cours" items={parStatut('en_cours')} onOpen={onOpen} etats={etats} visibleMobile={onglet === 'en_cours'} glisser={glisser} selection={selection} />
            <Colonne statut="livree" items={parStatut('livree')} onOpen={onOpen} etats={etats} visibleMobile={onglet === 'livree'} glisser={glisser} selection={selection} />
            {(annulees.length > 0 || onglet === 'annulee') && (
              <Colonne statut="annulee" items={annulees} onOpen={onOpen} etats={etats} visibleMobile={onglet === 'annulee'} glisser={glisser} selection={selection} />
            )}
          </div>
        </div>
      ) : vue === 'tournee' ? (
        <div className="flex-1 min-h-0 flex flex-col">
          {tourneeLogisticien && (
            <label className="shrink-0 max-w-2xl w-full mx-auto mb-3 flex items-center gap-2 text-xs text-gray-500">
              Tournée de
              <select
                value={tourneeConnue ? tourneeDe : 'tous'}
                onChange={e => choisirTournee(e.target.value)}
                className="text-xs font-600 text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1.5"
              >
                {livreurs
                  .filter(l => l.actif || l.id === tourneeDe)
                  .map(l => (
                    <option key={l.id} value={l.id}>{l.nom}</option>
                  ))}
                <option value="tous">Tous les livreurs</option>
              </select>
            </label>
          )}
          <div className="flex-1 min-h-0">
            <TourneeDuJour demandes={demandesTournee} onOpen={onOpen} etats={etats} />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <WeekView
            demandes={demandes.filter(d => d.statut !== 'annulee')}
            weekStart={debutSemaine}
            onOpen={onOpen}
            onDropCard={onDropCard}
            etats={etats}
            selection={selection}
          />
        </div>
      )}
    </div>
  );
}
