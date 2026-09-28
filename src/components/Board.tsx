import type { DeliveryCard } from '../types';
import { STATUS_CONFIG } from '../data';
import DeliveryCardComponent from './DeliveryCardComponent';

interface Props {
  cards: DeliveryCard[];
  onStatusChange?: (id: string, status: DeliveryCard['status']) => void;
  onCancel?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onRestore?: (id: string) => void;
  isDispatcher?: boolean;
}

const ACTIVE_COLUMNS: { key: DeliveryCard['status']; emoji: string }[] = [
  { key: 'nouveau', emoji: '📋' },
  { key: 'assigné', emoji: '🚚' },
  { key: 'en_transit', emoji: '📍' },
  { key: 'livré', emoji: '✅' },
];

export default function Board({ cards, onStatusChange, onCancel, onSuspend, onRestore, isDispatcher }: Props) {
  const activeCards = cards.filter(c => c.status !== 'annulé' && c.status !== 'suspendu');
  const suspendedCards = cards.filter(c => c.status === 'suspendu');
  const cancelledCards = cards.filter(c => c.status === 'annulé');

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 overflow-y-auto pb-4">
      {/* Active columns */}
      <div className="flex gap-5 shrink-0">
        {ACTIVE_COLUMNS.map(col => {
          const colCards = activeCards.filter(c => c.status === col.key);
          const cfg = STATUS_CONFIG[col.key];
          return (
            <div key={col.key} className="flex flex-col min-w-[240px] w-[240px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{col.emoji}</span>
                  <span className="text-xs font-700 uppercase tracking-widest" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
                <span className="text-[10px] font-700 w-5 h-5 flex items-center justify-center rounded-full"
                  style={{ color: cfg.color, background: cfg.color + '20' }}>
                  {colCards.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {colCards.length === 0 && (
                  <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-2xl">
                    <span className="text-xs text-gray-300 font-500">Aucune demande</span>
                  </div>
                )}
                {colCards.map(card => (
                  <DeliveryCardComponent
                    key={card.id}
                    card={card}
                    onStatusChange={onStatusChange}
                    onCancel={onCancel}
                    onSuspend={onSuspend}
                    isDispatcher={isDispatcher}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suspended + Cancelled row */}
      {(suspendedCards.length > 0 || cancelledCards.length > 0) && (
        <div className="shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[10px] font-700 uppercase tracking-widest text-gray-400">Suspendues & Annulées</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="flex gap-4 flex-wrap">
            {[...suspendedCards, ...cancelledCards].map(card => (
              <div key={card.id} className="w-[240px]">
                <DeliveryCardComponent
                  card={card}
                  onStatusChange={onStatusChange}
                  onCancel={onCancel}
                  onSuspend={onSuspend}
                  onRestore={onRestore}
                  isDispatcher={isDispatcher}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
