import type { DeliveryCard } from '../types';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '../data';

interface Props {
  cards: DeliveryCard[];
  weekStart: Date;
  onCardClick: (card: DeliveryCard) => void;
  onDropCard: (cardId: string, date: string) => void;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isToday(d: Date) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function WeekCard({ card, onClick }: { card: DeliveryCard; onClick: () => void }) {
  const priority = PRIORITY_CONFIG[card.priority];
  const status = STATUS_CONFIG[card.status];
  const isCancelled = card.status === 'annulé';
  const isSuspended = card.status === 'suspendu';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-black/5 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
      style={{ opacity: isCancelled ? 0.5 : isSuspended ? 0.7 : 1 }}
    >
      <div className="h-0.5" style={{ background: priority.color }} />
      <div className="px-2.5 py-2">
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className="font-mono text-[9px] text-gray-400 tracking-widest leading-tight">{card.id}</span>
          <span
            className="text-[8px] font-700 uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
            style={{ color: status.color, background: status.color + '18' }}
          >
            {status.label}
          </span>
        </div>
        <p className="font-600 text-gray-900 text-[11px] leading-tight truncate">
          {card.patient ?? card.client}
        </p>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{card.pickup.split('—')[0]?.trim() ?? card.pickup}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: priority.color }} />
          <span className="text-[9px] font-500 truncate" style={{ color: priority.color }}>{priority.label}</span>
        </div>
      </div>
    </button>
  );
}

export default function WeekView({ cards, weekStart, onCardClick, onDropCard }: Props) {
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, date: string) => {
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) onDropCard(cardId, date);
  };

  const unscheduled = cards.filter(
    c => !c.scheduledDate && c.status !== 'annulé' && c.status !== 'suspendu'
  );

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Week grid */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-x-auto">
        {days.map((day, i) => {
          const iso = toISO(day);
          const dayCards = cards.filter(c => c.scheduledDate === iso);
          const today = isToday(day);

          return (
            <div
              key={iso}
              className="flex flex-col min-w-[160px] flex-1"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, iso)}
            >
              {/* Day header */}
              <div className={`flex items-center justify-between mb-2 px-2 py-1.5 rounded-xl ${today ? 'bg-gray-900' : 'bg-white border border-gray-100'}`}>
                <div>
                  <p className={`text-[10px] font-700 uppercase tracking-widest ${today ? 'text-white/60' : 'text-gray-400'}`}>
                    {DAY_LABELS[i]}
                  </p>
                  <p className={`text-sm font-700 leading-tight ${today ? 'text-white' : 'text-gray-800'}`}>
                    {day.getDate()} {MONTH_FR[day.getMonth()]}
                  </p>
                </div>
                {dayCards.length > 0 && (
                  <span
                    className="text-[10px] font-700 w-5 h-5 flex items-center justify-center rounded-full"
                    style={today
                      ? { background: 'rgba(255,255,255,0.2)', color: 'white' }
                      : { background: '#f3f4f6', color: '#6b7280' }}
                  >
                    {dayCards.length}
                  </span>
                )}
              </div>

              {/* Drop zone + cards */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 rounded-xl min-h-[80px] p-1 border-2 border-dashed border-transparent hover:border-gray-200 transition-colors">
                {dayCards.length === 0 && (
                  <div className="flex items-center justify-center flex-1 min-h-[60px]">
                    <p className="text-[10px] text-gray-300 font-500">Aucune livraison</p>
                  </div>
                )}
                {dayCards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={e => e.dataTransfer.setData('cardId', card.id)}
                  >
                    <WeekCard card={card} onClick={() => onCardClick(card)} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled pool */}
      {unscheduled.length > 0 && (
        <div className="shrink-0 border-t border-gray-200 pt-3">
          <p className="text-[10px] font-700 uppercase tracking-widest text-gray-400 mb-2">
            Non planifiées ({unscheduled.length}) — glissez vers un jour
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unscheduled.map(card => (
              <div
                key={card.id}
                className="shrink-0 w-[150px]"
                draggable
                onDragStart={e => e.dataTransfer.setData('cardId', card.id)}
              >
                <WeekCard card={card} onClick={() => onCardClick(card)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
