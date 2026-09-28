import { useState } from 'react';
import type { DeliveryCard } from '../types';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '../data';

interface Props {
  card: DeliveryCard;
  onStatusChange?: (id: string, status: DeliveryCard['status']) => void;
  onCancel?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onRestore?: (id: string) => void;
  isDispatcher?: boolean;
}

const ACTIVE_STATUSES: DeliveryCard['status'][] = ['nouveau', 'assigné', 'en_transit', 'livré'];

export default function DeliveryCardComponent({ card, onStatusChange, onCancel, onSuspend, onRestore, isDispatcher }: Props) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_CONFIG[card.priority];
  const status = STATUS_CONFIG[card.status];

  const isSuspended = card.status === 'suspendu';
  const isCancelled = card.status === 'annulé';
  const isInactive = isSuspended || isCancelled;

  const elapsed = () => {
    const diff = Date.now() - card.createdAt.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `il y a ${m} min`;
    return `il y a ${Math.floor(m / 60)} h`;
  };

  return (
    <div
      className={`card-new bg-white rounded-2xl border overflow-hidden cursor-pointer select-none transition-shadow hover:shadow-md ${
        card.isNew ? 'ring-2 ring-violet-400/50' : ''
      } ${isCancelled ? 'opacity-60 border-red-100' : isSuspended ? 'opacity-75 border-amber-200' : 'border-black/5 shadow-sm'}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="h-1" style={{ background: isInactive ? (isCancelled ? '#ef4444' : '#f59e0b') : priority.color }} />

      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-gray-400 tracking-widest">{card.id}</span>
            {card.isNew && (
              <span className="text-[9px] font-700 uppercase tracking-widest text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                Nouveau
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-400 shrink-0">{elapsed()}</span>
        </div>

        <p className="font-600 text-gray-900 text-sm mb-0.5 leading-tight">
          {card.patient ?? card.client}
        </p>
        <p className="text-xs text-gray-400 mb-2 truncate">{card.client}</p>

        <div className="space-y-1 mb-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-xs text-gray-500 leading-snug truncate">{card.pickup}</p>
          </div>
          <div className="ml-[2px] w-px h-2 bg-gray-200" />
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            <p className="text-xs text-gray-500 leading-snug truncate">{card.dropoff}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: isInactive ? status.color : priority.color }} />
            <span className="text-xs font-500" style={{ color: isInactive ? status.color : priority.color }}>
              {isInactive ? status.label : priority.label}
            </span>
          </div>
          <span
            className="text-[10px] font-600 uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ color: status.color, background: status.color + '18' }}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && isDispatcher && (
        <div className="border-t border-gray-100 px-3 py-3 bg-gray-50/50" onClick={e => e.stopPropagation()}>
          {isInactive ? (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-600 uppercase tracking-widest text-gray-400 mb-1">
                {isCancelled ? 'Demande annulée' : 'Demande suspendue'}
              </p>
              {onRestore && (
                <button
                  onClick={() => onRestore(card.id)}
                  className="w-full text-xs font-600 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  ↩ Remettre en attente
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-[10px] font-600 uppercase tracking-widest text-gray-400 mb-1.5">Changer le statut</p>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVE_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => onStatusChange?.(card.id, s)}
                      className="text-[10px] font-600 uppercase tracking-wide px-2 py-1 rounded-lg transition-all"
                      style={{
                        color: STATUS_CONFIG[s].color,
                        background: card.status === s ? STATUS_CONFIG[s].color + '25' : STATUS_CONFIG[s].color + '10',
                        outline: card.status === s ? `1.5px solid ${STATUS_CONFIG[s].color}` : 'none',
                      }}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                {onSuspend && (
                  <button
                    onClick={() => onSuspend(card.id)}
                    className="flex-1 text-[11px] font-600 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors"
                  >
                    ⏸ Suspendre
                  </button>
                )}
                {onCancel && (
                  <button
                    onClick={() => onCancel(card.id)}
                    className="flex-1 text-[11px] font-600 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors"
                  >
                    ✕ Annuler
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
