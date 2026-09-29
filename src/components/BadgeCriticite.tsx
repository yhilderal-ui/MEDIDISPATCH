import type { Criticite } from '../types';
import { CRITICITE_CONFIG } from '../data';

// Criticité : pastille de couleur + libellé (plutôt que des émoticônes).
export default function BadgeCriticite({ criticite, className = 'text-xs' }: { criticite: Criticite; className?: string }) {
  const c = CRITICITE_CONFIG[criticite];
  return (
    <span className={`inline-flex items-center gap-1.5 font-600 min-w-0 ${className}`} style={{ color: c.color }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} aria-hidden />
      <span className="truncate">{c.label}</span>
    </span>
  );
}
