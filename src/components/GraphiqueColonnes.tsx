import { useEffect, useRef, useState } from 'react';

export interface Colonne {
  cle: string;
  axe: string; // libellé court sous la colonne
  complet: string; // libellé de l'infobulle et du tableau
  valeur: number;
}

interface Props {
  colonnes: Colonne[];
  unite: [singulier: string, pluriel: string];
  couleur?: string;
}

const HAUTEUR = 176;

// Graduation « ronde » : 0, 5, 10, 15, 20 plutôt que 0, 4.25, 8.5…
function graduation(max: number): { pas: number; haut: number } {
  const brut = Math.max(max, 4) / 4;
  const puissance = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map(m => m * puissance).find(p => p >= brut && Number.isInteger(p)) ?? 10 * puissance;
  return { pas, haut: pas * Math.ceil(Math.max(max, 1) / pas) };
}

// Colonnes à une seule série : fines, arrondies en haut, infobulle au survol,
// au toucher et au clavier ; seule la plus haute porte sa valeur.
export default function GraphiqueColonnes({ colonnes, unite, couleur = '#7c3aed' }: Props) {
  const [actif, setActif] = useState<number | null>(null);
  const [largeur, setLargeur] = useState(600);
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const obs = new ResizeObserver(([e]) => setLargeur(e.contentRect.width));
    obs.observe(zone);
    return () => obs.disconnect();
  }, []);

  const n = colonnes.length;
  const max = Math.max(0, ...colonnes.map(c => c.valeur));
  const { pas, haut } = graduation(max);
  const graduations = Array.from({ length: Math.round(haut / pas) + 1 }, (_, i) => i * pas);
  const indexMax = max > 0 ? colonnes.findIndex(c => c.valeur === max) : -1;
  // Un libellé d'axe toutes les k colonnes, pour qu'ils ne se chevauchent pas.
  const k = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(largeur / 46))));
  const nomUnite = (v: number) => (v > 1 ? unite[1] : unite[0]);
  const c = actif !== null ? colonnes[actif] : null;

  return (
    <div>
      <div className="flex">
        {/* Axe vertical */}
        <div className="relative w-8 shrink-0" style={{ height: HAUTEUR }} aria-hidden>
          {graduations.map(g => (
            <span
              key={g}
              className="absolute right-2 text-[10px] text-gray-400 tabular-nums"
              style={{ bottom: `${(g / haut) * 100}%`, transform: 'translateY(50%)' }}
            >
              {g}
            </span>
          ))}
        </div>

        <div ref={zoneRef} className="relative flex-1 min-w-0" style={{ height: HAUTEUR }} onPointerLeave={() => setActif(null)}>
          {/* Lignes de graduation */}
          {graduations.map(g => (
            <div key={g} className="absolute inset-x-0 border-t border-gray-100" style={{ bottom: `${(g / haut) * 100}%` }} aria-hidden />
          ))}

          {/* Colonnes : toute la hauteur de la tranche sert de zone de survol */}
          <div className="absolute inset-0 flex items-end" role="list">
            {colonnes.map((col, i) => {
              const h = (col.valeur / haut) * 100;
              return (
                <div
                  key={col.cle}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${col.complet} : ${col.valeur} ${nomUnite(col.valeur)}`}
                  onPointerEnter={() => setActif(i)}
                  onPointerDown={() => setActif(i)}
                  onFocus={() => setActif(i)}
                  onBlur={() => setActif(null)}
                  className="relative flex-1 h-full flex items-end justify-center outline-none focus-visible:bg-violet-50 cursor-default"
                  style={{ paddingInline: 1 }}
                >
                  {col.valeur > 0 && (
                    <div
                      className="w-full transition-[height,opacity] duration-300"
                      style={{
                        maxWidth: 24,
                        height: `${h}%`,
                        background: couleur,
                        borderRadius: '4px 4px 0 0',
                        opacity: actif === null || actif === i ? 1 : 0.55,
                      }}
                    />
                  )}
                  {i === indexMax && actif === null && (
                    <span className="absolute text-[11px] font-600 text-gray-700 tabular-nums" style={{ bottom: `calc(${h}% + 4px)` }}>
                      {col.valeur}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Infobulle */}
          {c && actif !== null && (
            <div
              className="absolute z-10 pointer-events-none bg-white border border-gray-200 shadow-lg rounded-xl px-3 py-2 whitespace-nowrap"
              style={{
                left: `${((actif + 0.5) / n) * 100}%`,
                bottom: `calc(${Math.min((c.valeur / haut) * 100, 70)}% + 10px)`,
                transform: `translateX(${actif < n * 0.2 ? '-15%' : actif > n * 0.8 ? '-85%' : '-50%'})`,
              }}
            >
              <p className="text-base font-700 text-gray-900 leading-tight">
                {c.valeur} <span className="text-xs font-500 text-gray-500">{nomUnite(c.valeur)}</span>
              </p>
              <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: couleur }} aria-hidden />
                {c.complet}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Axe horizontal */}
      <div className="flex ml-8 mt-1.5" aria-hidden>
        {colonnes.map((col, i) => (
          <span key={col.cle} className="flex-1 min-w-0 text-center text-[10px] text-gray-400 whitespace-nowrap overflow-visible">
            {i % k === 0 ? col.axe : ''}
          </span>
        ))}
      </div>

      <details className="mt-3 group">
        <summary className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer select-none w-fit">Voir le détail chiffré</summary>
        <div className="mt-2 max-h-56 overflow-y-auto border border-gray-100 rounded-xl">
          <table className="w-full text-xs">
            <tbody>
              {colonnes.map(col => (
                <tr key={col.cle} className="border-b border-gray-50 last:border-b-0">
                  <td className="px-3 py-1.5 text-gray-600">{col.complet}</td>
                  <td className="px-3 py-1.5 text-right font-600 text-gray-800 tabular-nums">{col.valeur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
