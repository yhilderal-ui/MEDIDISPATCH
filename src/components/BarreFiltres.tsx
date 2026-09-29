import { useEffect, useRef } from 'react';
import type { Criticite, Statut } from '../types';
import { CRITICITE_CONFIG, STATUT_CONFIG } from '../data';
import { FILTRES_VIDES, filtresActifs, type FiltreDate, type Filtres } from '../lib/filtres';

interface Props {
  filtres: Filtres;
  onChange: (f: Filtres) => void;
  nbResultats: number;
  nbTotal: number;
  masquerStatut?: boolean;
}

const SELECT =
  'text-xs bg-white border border-gray-200 rounded-xl px-2.5 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all';

export default function BarreFiltres({ filtres, onChange, nbResultats, nbTotal, masquerStatut }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Filtres>(k: K, v: Filtres[K]) => onChange({ ...filtres, [k]: v });

  // Ctrl+F (ou Cmd+F) place le curseur dans la recherche.
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

  const actifs = filtresActifs(filtres);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex items-center">
        <svg className="absolute left-3 text-gray-400" width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
          <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          ref={ref}
          value={filtres.recherche}
          onChange={e => set('recherche', e.target.value)}
          placeholder="Patient ou n° de ticket…"
          aria-label="Rechercher par patient ou numéro de ticket"
          className="w-56 max-w-[70vw] text-xs bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
        />
      </div>

      {!masquerStatut && (
        <select aria-label="Filtrer par statut" value={filtres.statut} onChange={e => set('statut', e.target.value as Statut | 'tous')} className={SELECT}>
          <option value="tous">Tous les statuts</option>
          {(Object.keys(STATUT_CONFIG) as Statut[]).map(s => (
            <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>
          ))}
        </select>
      )}

      <select aria-label="Filtrer par criticité" value={filtres.criticite} onChange={e => set('criticite', e.target.value as Criticite | 'toutes')} className={SELECT}>
        <option value="toutes">Toutes criticités</option>
        {(Object.keys(CRITICITE_CONFIG) as Criticite[]).map(c => (
          <option key={c} value={c}>{CRITICITE_CONFIG[c].emoji} {CRITICITE_CONFIG[c].label}</option>
        ))}
      </select>

      <select aria-label="Filtrer par date de livraison" value={filtres.date} onChange={e => set('date', e.target.value as FiltreDate)} className={SELECT}>
        <option value="toutes">Toutes les dates</option>
        <option value="aujourdhui">Aujourd'hui</option>
        <option value="demain">Demain</option>
        <option value="semaine">Cette semaine</option>
        <option value="jour">Choisir un jour…</option>
      </select>
      {filtres.date === 'jour' && (
        <input type="date" aria-label="Jour de livraison" value={filtres.jour} onChange={e => set('jour', e.target.value)} className={SELECT} />
      )}

      {actifs && (
        <>
          <span className="text-[11px] font-600 text-gray-500">
            {nbResultats} / {nbTotal} demande{nbTotal > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={() => onChange(FILTRES_VIDES)}
            className="text-[11px] font-600 text-violet-600 hover:text-violet-800"
          >
            Effacer les filtres
          </button>
        </>
      )}
    </div>
  );
}
