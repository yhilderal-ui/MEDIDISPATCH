import { ClipboardList, MessageSquare, Pencil, TriangleAlert } from 'lucide-react';
import type { Alerte } from '../lib/notifications';

interface Props {
  alertes: Alerte[];
  onActiver: (a: Alerte) => void;
  onFermer: (id: string) => void;
}

// Bandeaux d'alerte en haut à droite ; un clic ouvre la carte ou le chat.
export default function Alertes({ alertes, onActiver, onFermer }: Props) {
  if (alertes.length === 0) return null;
  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))]" aria-live="polite">
      {alertes.map(a => (
        <div
          key={a.id}
          className={`slide-in bg-white rounded-2xl shadow-xl border flex items-start gap-3 p-3 ${a.urgente ? 'border-red-300 ring-2 ring-red-200' : 'border-violet-200'}`}
        >
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${a.urgente ? 'bg-red-50 text-red-600' : 'bg-violet-50 text-violet-600'}`}
            aria-hidden
          >
            {a.genre === 'message' ? <MessageSquare size={16} /> : a.genre === 'maj' ? <Pencil size={16} /> : a.urgente ? <TriangleAlert size={16} /> : <ClipboardList size={16} />}
          </span>
          <button type="button" onClick={() => onActiver(a)} className="flex-1 min-w-0 text-left">
            <p className={`text-sm font-700 ${a.urgente ? 'text-red-700' : 'text-gray-900'}`}>{a.titre}</p>
            <p className="text-xs text-gray-500 truncate">{a.detail}</p>
            <p className="text-[10px] font-600 text-violet-600 mt-1">{a.chat ? 'Ouvrir la messagerie →' : 'Ouvrir la demande →'}</p>
          </button>
          <button
            type="button"
            onClick={() => onFermer(a.id)}
            aria-label="Fermer l'alerte"
            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 text-sm shrink-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
