import { useState, useRef, useEffect } from 'react';
import type { Demande, Statut } from '../types';
import { CRITICITE_CONFIG, CRITICITE_ORDRE, STATUT_CONFIG } from '../data';
import WeekView from './WeekView';
import IconDate from '../assets/IconDate';
import { ajouterJours, formatJour, lundiDeLaSemaine, moisCourt } from '../lib/dates';

type Tri = 'date' | 'criticite';
type Vue = 'kanban' | 'week';

interface Props {
  demandes: Demande[];
  onOpen: (demande: Demande) => void;
  onDropCard: (demandeId: string, jour: string) => void;
}

function MedicalCard({ demande, onClick, highlight }: { demande: Demande; onClick: () => void; highlight?: boolean }) {
  const criticite = CRITICITE_CONFIG[demande.criticite];
  const annulee = demande.statut === 'annulee';
  const nbMedicaments = demande.medicaments.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-new w-full text-left bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow group ${
        annulee ? 'border-red-200 opacity-60' : 'border-black/5'
      } ${highlight ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="h-1" style={{ background: annulee ? '#ef4444' : criticite.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-mono text-[11px] text-gray-400 tracking-widest">{demande.numero_ticket}</span>
          <span className="text-[11px] text-gray-500 font-500 shrink-0">{formatJour(demande.jour_livraison)}</span>
        </div>
        <p className="font-700 text-gray-900 text-[15px] leading-tight mb-2">{demande.patient_nom}</p>
        <div className="flex items-start gap-2 mb-3">
          <span className="mt-1 w-2 h-2 rounded-full bg-red-400 shrink-0" />
          <p className="text-xs text-gray-500 leading-snug">{demande.patient_adresse}</p>
        </div>
        {demande.notes_initiales && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-3 flex items-start gap-1.5">
            <span className="text-xs shrink-0">⚠️</span>
            <p className="text-[11px] text-amber-700 leading-snug">{demande.notes_initiales}</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-600 truncate" style={{ color: criticite.color }}>
            {criticite.emoji} {criticite.label}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 group-hover:text-gray-600 transition-colors shrink-0">
            <span>💊 {nbMedicaments}</span>
            {demande.documents.length > 0 && <span>📄 {demande.documents.length}</span>}
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

function Colonne({ statut, items, onOpen, surlignes }: {
  statut: Statut; items: Demande[]; onOpen: (d: Demande) => void; surlignes?: Set<string>;
}) {
  const cfg = STATUT_CONFIG[statut];
  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl" style={{ background: cfg.color + '12' }}>
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
          <MedicalCard key={d.id} demande={d} onClick={() => onOpen(d)} highlight={surlignes?.has(d.id)} />
        ))}
      </div>
    </div>
  );
}

function BarreRecherche({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raccourci = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', raccourci);
    return () => window.removeEventListener('keydown', raccourci);
  }, []);

  return (
    <div className="relative flex items-center">
      <svg className="absolute left-3 text-gray-400 shrink-0" width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
        <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        ref={ref}
        value={valeur}
        onChange={e => onChange(e.target.value)}
        placeholder="Rechercher par patient ou n° ticket…"
        aria-label="Rechercher"
        className="w-64 max-w-full text-xs bg-white border border-gray-200 rounded-xl pl-8 pr-8 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
      />
      {valeur && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          className="absolute right-2.5 w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 text-[10px] transition-colors"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function LivreurBoard({ demandes, onOpen, onDropCard }: Props) {
  const [tri, setTri] = useState<Tri>('date');
  const [vue, setVue] = useState<Vue>('kanban');
  const [debutSemaine, setDebutSemaine] = useState<Date>(() => lundiDeLaSemaine(new Date()));
  const [recherche, setRecherche] = useState('');

  const q = recherche.trim().toLowerCase();
  const filtrees = q
    ? demandes.filter(d => d.patient_nom.toLowerCase().includes(q) || d.numero_ticket.toLowerCase().includes(q))
    : demandes;
  const surlignes = q ? new Set(filtrees.map(d => d.id)) : undefined;

  const trier = (items: Demande[]) =>
    [...items].sort((a, b) =>
      tri === 'date'
        ? a.jour_livraison.localeCompare(b.jour_livraison) || CRITICITE_ORDRE[a.criticite] - CRITICITE_ORDRE[b.criticite]
        : CRITICITE_ORDRE[a.criticite] - CRITICITE_ORDRE[b.criticite] || a.jour_livraison.localeCompare(b.jour_livraison),
    );

  const parStatut = (s: Statut) => trier(filtrees.filter(d => d.statut === s));
  const annulees = parStatut('annulee');
  const finSemaine = ajouterJours(debutSemaine, 5);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 mb-4 flex-wrap shrink-0">
        <BarreRecherche valeur={recherche} onChange={setRecherche} />
        {q && (
          <span className="text-[11px] font-600 text-gray-400">
            {filtrees.length} résultat{filtrees.length !== 1 ? 's' : ''}
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {vue === 'kanban' && (
            <>
              <span className="text-[10px] font-700 uppercase tracking-widest text-gray-400">Trier</span>
              <TriBouton actif={tri === 'date'} onClick={() => setTri('date')}>
                <IconDate size={13} color={tri === 'date' ? '#fff' : '#6b7280'} /> Date
              </TriBouton>
              <TriBouton actif={tri === 'criticite'} onClick={() => setTri('criticite')}>
                🔴 Criticité
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
            {([['kanban', '⊞', 'Vue par statut'], ['week', '📅', 'Vue semaine']] as [Vue, string, string][]).map(([v, icone, titre]) => (
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
                {icone}
              </button>
            ))}
          </div>
        </div>
      </div>

      {vue === 'kanban' ? (
        <div className="flex gap-5 flex-1 min-h-0 overflow-x-auto pb-4">
          <Colonne statut="nouvelle" items={parStatut('nouvelle')} onOpen={onOpen} surlignes={surlignes} />
          <Colonne statut="en_cours" items={parStatut('en_cours')} onOpen={onOpen} surlignes={surlignes} />
          <Colonne statut="livree" items={parStatut('livree')} onOpen={onOpen} surlignes={surlignes} />
          {annulees.length > 0 && <Colonne statut="annulee" items={annulees} onOpen={onOpen} surlignes={surlignes} />}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <WeekView
            demandes={filtrees.filter(d => d.statut !== 'annulee')}
            weekStart={debutSemaine}
            onOpen={onOpen}
            onDropCard={onDropCard}
          />
        </div>
      )}
    </div>
  );
}
