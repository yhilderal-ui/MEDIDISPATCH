import { useState, useRef, useEffect } from 'react';
import type { DeliveryCard, CardNote } from '../types';
import { PRIORITY_CONFIG } from '../data';
import DocumentPanel from './DocumentPanel';
import WeekView from './WeekView';
import IconDate from '../assets/IconDate';
import iconDistance from '../assets/icon-distance.png';
import iconArchive from '../assets/icon-archive.png';

type SortKey = 'date' | 'distance';
type BoardView = 'kanban' | 'week';

interface Props {
  cards: DeliveryCard[];
  onValidate: (id: string) => void;
  onAddNote: (cardId: string, note: CardNote) => void;
  onArchive: (id: string) => void;
  onCancel: (id: string) => void;
  onSuspend: (id: string) => void;
  onRestore: (id: string) => void;
  onDropCard: (cardId: string, date: string) => void;
}

function MedicalCard({ card, onClick, highlight }: { card: DeliveryCard; onClick: () => void; highlight?: boolean }) {
  const priority = PRIORITY_CONFIG[card.priority];
  const isValidated = card.livreurStatus === 'validé';
  const isSuspended = card.livreurStatus === 'suspendu';
  const isCancelled = card.livreurStatus === 'annulé';
  const docCount = card.documents?.length ?? 0;
  const noteCount = card.cardNotes?.length ?? 0;

  const elapsed = () => {
    const diff = Date.now() - card.createdAt.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `il y a ${m} min`;
    return `il y a ${Math.floor(m / 60)} h`;
  };

  const borderClass = isCancelled
    ? 'border-red-200 opacity-60'
    : isSuspended
    ? 'border-amber-200 opacity-75'
    : isValidated
    ? 'border-emerald-200'
    : 'border-black/5';

  return (
    <button
      onClick={onClick}
      className={`card-new w-full text-left bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow group ${card.isNew ? 'ring-2 ring-violet-300/60' : ''} ${borderClass} ${highlight ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="h-1" style={{ background: isCancelled ? '#ef4444' : isSuspended ? '#f59e0b' : priority.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-gray-400 tracking-widest">{card.id}</span>
            {card.isNew && <span className="text-[9px] font-700 uppercase tracking-widest text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">Nouveau</span>}
            {isSuspended && <span className="text-[9px] font-700 uppercase tracking-widest text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Suspendu</span>}
            {isCancelled && <span className="text-[9px] font-700 uppercase tracking-widest text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">Annulé</span>}
          </div>
          <span className="text-[11px] text-gray-400 shrink-0">{elapsed()}</span>
        </div>
        <p className="font-700 text-gray-900 text-[15px] leading-tight mb-1">{card.patient ?? card.client}</p>
        <p className="text-xs text-gray-400 mb-3 truncate">{card.client}</p>
        <div className="space-y-1.5 mb-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-xs text-gray-500 leading-snug">{card.pickup}</p>
          </div>
          <div className="ml-[3px] w-px h-2.5 bg-gray-200" />
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <p className="text-xs text-gray-500 leading-snug">{card.dropoff}</p>
          </div>
        </div>
        {card.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-3 flex items-start gap-1.5">
            <span className="text-xs shrink-0">⚠️</span>
            <p className="text-[11px] text-amber-700 leading-snug">{card.notes}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: priority.color }} />
              <span className="text-xs font-500" style={{ color: priority.color }}>{priority.label}</span>
            </div>
            {card.distanceKm !== undefined && (
              <span className="text-[11px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded-md">{card.distanceKm} km</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-300 group-hover:text-gray-500 transition-colors">
            {docCount > 0 && <span>📄 {docCount}</span>}
            {noteCount > 0 && <span>💬 {noteCount}</span>}
            <span className="font-500">Voir →</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function SortButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg transition-all"
      style={{ background: active ? '#111' : '#f3f4f6', color: active ? '#fff' : '#6b7280' }}
    >
      {children}
    </button>
  );
}

function Column({ label, color, bg, items, onOpen, emptyText, highlight }: {
  label: string; color: string; bg: string; items: DeliveryCard[];
  onOpen: (c: DeliveryCard) => void; emptyText: string; highlight?: Set<string>;
}) {
  return (
    <div className="flex flex-col min-w-[300px] w-[300px] shrink-0">
      <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl" style={{ background: bg }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-xs font-700 uppercase tracking-widest" style={{ color }}>{label}</span>
        </div>
        <span className="text-[10px] font-700 px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{items.length}</span>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
        {items.length === 0 && (
          <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-2xl" style={{ borderColor: color + '40' }}>
            <span className="text-xs font-500" style={{ color: color + '80' }}>{emptyText}</span>
          </div>
        )}
        {items.map(card => (
          <MedicalCard key={card.id} card={card} onClick={() => onOpen(card)} highlight={highlight?.has(card.id)} />
        ))}
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, resultCount }: { value: string; onChange: (v: string) => void; resultCount: number }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative flex items-center">
      <svg className="absolute left-3 text-gray-400 shrink-0" width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Rechercher par patient ou n° ticket…"
        className="w-64 text-xs bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
      />
      {value && (
        <div className="absolute right-2.5 flex items-center gap-1.5">
          <span className="text-[10px] font-600 text-gray-400">{resultCount} résultat{resultCount !== 1 ? 's' : ''}</span>
          <button onClick={() => onChange('')} className="w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 text-[10px] transition-colors">×</button>
        </div>
      )}
    </div>
  );
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const MONTH_FR = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

export default function LivreurBoard({ cards, onValidate, onAddNote, onArchive, onCancel, onSuspend, onRestore, onDropCard }: Props) {
  const [openCard, setOpenCard] = useState<DeliveryCard | null>(null);
  const [sort, setSort] = useState<SortKey>('date');
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<BoardView>('kanban');
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart);
  const [search, setSearch] = useState('');

  const openCardLive = openCard ? cards.find(c => c.id === openCard.id) ?? openCard : null;

  const matchesSearch = (card: DeliveryCard) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (card.patient ?? '').toLowerCase().includes(q) ||
      card.id.toLowerCase().includes(q) ||
      card.client.toLowerCase().includes(q)
    );
  };

  const searchMatches = search.trim()
    ? new Set(cards.filter(matchesSearch).map(c => c.id))
    : null;

  const sorted = (items: DeliveryCard[]) =>
    [...items].sort((a, b) =>
      sort === 'date'
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : (a.distanceKm ?? 999) - (b.distanceKm ?? 999)
    );

  const filter = (items: DeliveryCard[]) =>
    searchMatches ? items.filter(c => searchMatches.has(c.id)) : items;

  const nouveaux = sorted(filter(cards.filter(c => c.livreurStatus === 'nouveau')));
  const validés = sorted(filter(cards.filter(c => c.livreurStatus === 'validé')));
  const inactifs = sorted(filter(cards.filter(c => c.livreurStatus === 'suspendu' || c.livreurStatus === 'annulé')));
  const archivés = sorted(filter(cards.filter(c => c.livreurStatus === 'archivé')));

  const open = (card: DeliveryCard) => setOpenCard(card);

  const shiftWeek = (n: number) => setWeekStart(d => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + n * 7);
    return nd;
  });

  const weekEnd = new Date(weekStart.getTime() + 5 * 86400000);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          resultCount={searchMatches ? searchMatches.size : cards.length}
        />

        <div className="flex items-center gap-2 ml-auto">
          {/* Sort (kanban only) */}
          {view === 'kanban' && (
            <>
              <span className="text-[10px] font-700 uppercase tracking-widest text-gray-400">Trier</span>
              <SortButton active={sort === 'date'} onClick={() => setSort('date')}>
                <IconDate size={13} color={sort === 'date' ? '#fff' : '#6b7280'} /> Date
              </SortButton>
              <SortButton active={sort === 'distance'} onClick={() => setSort('distance')}>
                <img src={iconDistance} alt="" className="w-3.5 h-3.5" style={{ filter: sort === 'distance' ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.35)' }} /> Distance
              </SortButton>
            </>
          )}

          {/* Week nav (week only) */}
          {view === 'week' && (
            <div className="flex items-center gap-2">
              <button onClick={() => shiftWeek(-1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">‹</button>
              <span className="text-xs font-600 text-gray-600 font-mono whitespace-nowrap">
                {weekStart.getDate()} — {weekEnd.getDate()} {MONTH_FR[weekEnd.getMonth()]}
              </span>
              <button onClick={() => shiftWeek(1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">›</button>
            </div>
          )}

          {/* Archives toggle */}
          {view === 'kanban' && archivés.length > 0 && (
            <button
              onClick={() => setShowArchived(s => !s)}
              className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <img src={iconArchive} alt="" className="w-3.5 h-3.5" style={{ filter: 'brightness(0) invert(0.35)' }} /> Archives ({archivés.length})
            </button>
          )}

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
            {([['kanban', '⊞'], ['week', '📅']] as [BoardView, string][]).map(([v, icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="text-xs px-2.5 py-1 rounded-md transition-all font-600"
                style={{
                  background: view === v ? 'white' : 'transparent',
                  color: view === v ? '#111' : '#9ca3af',
                  boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search results banner */}
      {search && (
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 slide-in">
          <span>🔍</span>
          <span><span className="font-700">{searchMatches?.size ?? 0} résultat{(searchMatches?.size ?? 0) !== 1 ? 's' : ''}</span> pour « {search} »</span>
          <button onClick={() => setSearch('')} className="ml-auto text-amber-500 hover:text-amber-700 font-600">Effacer</button>
        </div>
      )}

      {/* Content */}
      {view === 'kanban' ? (
        <div className="flex gap-0 h-full min-h-0 overflow-x-auto pb-4">
          <Column label="Nouvelles demandes" color="#7c3aed" bg="#f5f3ff"
            items={nouveaux} onOpen={open} emptyText="Aucune nouvelle demande" highlight={searchMatches ?? undefined} />

          <div className="shrink-0 flex flex-col items-center justify-center px-5 gap-2 self-stretch">
            <div className="flex-1 w-px bg-gray-200" />
            <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6M6 3l2 2-2 2" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 w-px bg-gray-200" />
          </div>

          <Column label="Validées" color="#059669" bg="#f0fdf4"
            items={validés} onOpen={open} emptyText="Aucune demande validée" highlight={searchMatches ?? undefined} />

          {inactifs.length > 0 && (
            <>
              <div className="shrink-0 flex flex-col items-center justify-center px-4 gap-2 self-stretch">
                <div className="flex-1 w-px bg-gray-100" />
                <div className="w-7 h-7 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm text-xs">⚠️</div>
                <div className="flex-1 w-px bg-gray-100" />
              </div>
              <Column label="Suspendues / Annulées" color="#d97706" bg="#fffbeb"
                items={inactifs} onOpen={open} emptyText="Aucune" highlight={searchMatches ?? undefined} />
            </>
          )}

          {showArchived && archivés.length > 0 && (
            <>
              <div className="shrink-0 flex flex-col items-center justify-center px-4 gap-2 self-stretch">
                <div className="flex-1 w-px bg-gray-100" />
                <div className="w-7 h-7 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                  <img src={iconArchive} alt="" className="w-4 h-4" style={{ filter: 'brightness(0) invert(0.45)' }} />
                </div>
                <div className="flex-1 w-px bg-gray-100" />
              </div>
              <Column label="Archivées" color="#9ca3af" bg="#f9fafb"
                items={archivés} onOpen={open} emptyText="Aucune archive" highlight={searchMatches ?? undefined} />
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <WeekView
            cards={filter(cards.filter(c => c.livreurStatus !== 'archivé'))}
            weekStart={weekStart}
            onCardClick={open}
            onDropCard={onDropCard}
          />
        </div>
      )}

      {openCardLive && (
        <DocumentPanel
          card={openCardLive}
          onClose={() => setOpenCard(null)}
          onValidate={(id) => { onValidate(id); setOpenCard(null); }}
          onAddNote={onAddNote}
          onArchive={(id) => { onArchive(id); setOpenCard(null); }}
          onCancel={(id) => { onCancel(id); setOpenCard(null); }}
          onSuspend={(id) => { onSuspend(id); setOpenCard(null); }}
          onRestore={(id) => { onRestore(id); setOpenCard(null); }}
        />
      )}
    </>
  );
}
