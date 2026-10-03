import { useEffect, useMemo, useState } from 'react';
import { CalendarX2, CircleCheck, Download, FilePlus2, Minus, Redo2, TrendingDown, TrendingUp, Undo2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import GraphiqueColonnes, { type Colonne } from './GraphiqueColonnes';
import { exporterStatistiques } from '../lib/exportExcel';
import { ajouterJours, aujourdhuiParis, depuisJour, formatJour, moisCourt, versJour } from '../lib/dates';
import {
  calculerPeriode,
  chargerStatistiques,
  granulariteParDefaut,
  JOURS_MAX_PAR_JOUR,
  nbJours,
  PRESETS,
  type Chiffres,
  type Granularite,
  type Preset,
  type Statistiques,
} from '../lib/statistiques';

const JOURS_SEMAINE = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const CARTE = 'bg-white rounded-2xl border border-black/5 p-4 sm:p-5';
const TITRE = 'text-sm font-700 text-gray-900';

// Sens de l'évolution : plus de livraisons, c'est bien ; plus d'annulations, non.
type Sens = 'hausse_bonne' | 'hausse_mauvaise' | 'neutre';

const TUILES: { cle: keyof Chiffres; libelle: string; Icone: LucideIcon; sens: Sens }[] = [
  { cle: 'creees', libelle: 'Livraisons créées', Icone: FilePlus2, sens: 'neutre' },
  { cle: 'livrees', libelle: 'Livrées', Icone: CircleCheck, sens: 'hausse_bonne' },
  { cle: 'retours', libelle: 'Retours récupérés', Icone: Undo2, sens: 'neutre' },
  { cle: 'reportees', libelle: 'Reportées', Icone: Redo2, sens: 'hausse_mauvaise' },
  { cle: 'annulees', libelle: 'Annulées', Icone: CalendarX2, sens: 'hausse_mauvaise' },
];

function Evolution({ actuel, precedent, sens, comparaison }: { actuel: number; precedent: number; sens: Sens; comparaison: string }) {
  if (precedent === 0) {
    // Pas de pourcentage possible à partir de zéro.
    return <p className="text-[11px] text-gray-400 mt-1">{comparaison} : 0</p>;
  }
  const ecart = Math.round(((actuel - precedent) / precedent) * 100);
  const Icone = ecart > 0 ? TrendingUp : ecart < 0 ? TrendingDown : Minus;
  const bon = sens === 'neutre' || ecart === 0 ? null : (ecart > 0) === (sens === 'hausse_bonne');
  const couleur = bon === null ? 'text-gray-500' : bon ? 'text-emerald-700' : 'text-red-600';
  return (
    <p className="text-[11px] mt-1 flex flex-wrap items-center gap-x-1.5">
      <span className={`inline-flex items-center gap-1 whitespace-nowrap font-600 ${couleur}`}>
        <Icone size={13} aria-hidden />
        {ecart > 0 ? '+' : ''}{ecart} %
      </span>
      <span className="text-gray-400">{comparaison} ({precedent})</span>
    </p>
  );
}

function colonnesLivraisons(stats: Statistiques, g: Granularite): Colonne[] {
  return stats.livraisons.map(({ periode, nombre }) => {
    const d = depuisJour(periode);
    if (g === 'day') {
      return { cle: periode, axe: d.getDate() === 1 ? `1 ${moisCourt(d)}` : String(d.getDate()), complet: formatJour(periode), valeur: nombre };
    }
    if (g === 'week') {
      const fin = ajouterJours(d, 6);
      return {
        cle: periode,
        axe: `${d.getDate()} ${moisCourt(d)}`,
        complet: `Semaine du ${d.getDate()} ${moisCourt(d)} au ${fin.getDate()} ${moisCourt(fin)}`,
        valeur: nombre,
      };
    }
    return { cle: periode, axe: moisCourt(d), complet: `${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`, valeur: nombre };
  });
}

export default function StatistiquesView() {
  const aujourdhui = aujourdhuiParis();
  const [preset, setPreset] = useState<Preset>('mois');
  const [persoDebut, setPersoDebut] = useState(versJour(ajouterJours(depuisJour(aujourdhui), -29)));
  const [persoFin, setPersoFin] = useState(aujourdhui);
  const periodeValide = preset !== 'perso' || (persoDebut <= persoFin && nbJours(persoDebut, persoFin) <= 1100);
  const periode = useMemo(
    () => calculerPeriode(preset, persoDebut, persoFin),
    [preset, persoDebut, persoFin],
  );
  const [choixGranularite, setChoixGranularite] = useState<Granularite | null>(null);
  const jourPossible = nbJours(periode.debut, periode.fin) <= JOURS_MAX_PAR_JOUR;
  const granularite: Granularite =
    choixGranularite && (choixGranularite !== 'day' || jourPossible) ? choixGranularite : granulariteParDefaut(periode);

  const [stats, setStats] = useState<Statistiques | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [export_, setExport] = useState<{ enCours: boolean; message: string | null }>({ enCours: false, message: null });

  useEffect(() => {
    if (!periodeValide) return;
    let actif = true;
    setChargement(true);
    chargerStatistiques(periode, granularite)
      .then(s => {
        if (!actif) return;
        setStats(s);
        setErreur(null);
      })
      .catch(e => actif && setErreur(e instanceof Error ? e.message : String(e)))
      .finally(() => actif && setChargement(false));
    return () => {
      actif = false;
    };
  }, [periode, granularite, periodeValide]);

  const livraisons = stats ? colonnesLivraisons(stats, granularite) : [];
  const joursSemaine: Colonne[] = (stats?.jours_semaine ?? [])
    .filter(j => j.jour < 7 || j.nombre > 0) // pas de colonne dimanche s'il est vide
    .map(j => ({ cle: String(j.jour), axe: JOURS_SEMAINE[j.jour].slice(0, 3) + '.', complet: JOURS_SEMAINE[j.jour], valeur: j.nombre }));
  const maxMedicament = Math.max(1, ...(stats?.medicaments ?? []).map(m => m.demandes));
  const regroupement = granularite === 'day' ? 'Jour' : granularite === 'week' ? 'Semaine' : 'Mois';

  const exporter = async () => {
    if (!stats) return;
    setExport({ enCours: true, message: null });
    try {
      const n = await exporterStatistiques(periode, stats, livraisons, regroupement, joursSemaine);
      setExport({ enCours: false, message: `Fichier Excel téléchargé (${n} demande${n > 1 ? 's' : ''} dans le détail).` });
    } catch (e) {
      setExport({ enCours: false, message: `Export impossible : ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  const libellePeriode =
    periode.debut === periode.fin ? formatJour(periode.debut) : `du ${formatJour(periode.debut)} au ${formatJour(periode.fin)}`;

  return (
    <div className="h-full overflow-y-auto pb-24 md:pb-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Période : une seule rangée de filtres, qui s'applique à toute la page */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1 max-w-full" role="radiogroup" aria-label="Période">
            {PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={preset === p.id}
                onClick={() => setPreset(p.id)}
                className={`shrink-0 text-xs font-600 px-3 py-2 rounded-xl transition-colors ${
                  preset === p.id ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p.libelle}
              </button>
            ))}
          </div>
          {preset === 'perso' && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <label className="flex items-center gap-1.5">
                Du
                <input type="date" value={persoDebut} max={persoFin} onChange={e => e.target.value && setPersoDebut(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700" />
              </label>
              <label className="flex items-center gap-1.5">
                au
                <input type="date" value={persoFin} min={persoDebut} max={aujourdhui} onChange={e => e.target.value && setPersoFin(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700" />
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-400">
            {periodeValide ? <>Période : <span className="text-gray-600 font-600">{libellePeriode}</span></> : 'Choisissez une date de début antérieure à la date de fin (3 ans au plus).'}
          </p>
          <button
            type="button"
            onClick={exporter}
            disabled={!stats || chargement || export_.enCours || !periodeValide}
            className="flex items-center gap-1.5 text-xs font-600 px-3 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 transition-colors"
          >
            <Download size={14} aria-hidden />
            {export_.enCours ? 'Export en cours…' : 'Exporter (Excel)'}
          </button>
        </div>
        {export_.message && (
          <p role="status" className={`text-xs ${export_.message.startsWith('Export impossible') ? 'text-red-600' : 'text-emerald-700'}`}>
            {export_.message}
          </p>
        )}

        {erreur && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            Impossible de charger les statistiques. {erreur}
          </p>
        )}

        {!stats && chargement && !erreur && <p className="text-xs text-gray-400 font-mono py-10 text-center">Chargement des statistiques…</p>}

        {stats && (
          // Pendant un rechargement, la page garde l'affichage précédent, estompé.
          <div className={`space-y-4 transition-opacity ${chargement ? 'opacity-50' : ''}`} aria-busy={chargement}>
            {/* Chiffres clés */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {TUILES.map(({ cle, libelle, Icone, sens }) => (
                <div key={cle} className={CARTE}>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Icone size={14} className="text-gray-400" aria-hidden />
                    {libelle}
                  </p>
                  <p className="text-3xl font-700 text-gray-900 mt-1.5 leading-none">{stats.chiffres[cle]}</p>
                  <Evolution actuel={stats.chiffres[cle]} precedent={stats.precedent[cle]} sens={sens} comparaison={periode.comparaison} />
                </div>
              ))}
            </div>

            {/* Livraisons par jour / semaine / mois */}
            <section className={CARTE} aria-labelledby="titre-livraisons">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 id="titre-livraisons" className={TITRE}>Livraisons</h3>
                  <p className="text-[11px] text-gray-400">Demandes marquées « Livrée », par {granularite === 'day' ? 'jour' : granularite === 'week' ? 'semaine' : 'mois'}</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg" role="radiogroup" aria-label="Regrouper par">
                  {([['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois']] as [Granularite, string][]).map(([g, libelle]) => {
                    const impossible = g === 'day' && !jourPossible;
                    return (
                      <button
                        key={g}
                        type="button"
                        role="radio"
                        aria-checked={granularite === g}
                        disabled={impossible}
                        title={impossible ? `Par jour : ${JOURS_MAX_PAR_JOUR} jours au plus` : undefined}
                        onClick={() => setChoixGranularite(g)}
                        className={`text-xs px-3 py-1 rounded-md font-600 transition-all disabled:opacity-40 ${
                          granularite === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                        }`}
                      >
                        {libelle}
                      </button>
                    );
                  })}
                </div>
              </div>
              {stats.chiffres.livrees === 0 ? (
                <p className="text-xs text-gray-400 text-center py-10">Aucune livraison sur cette période.</p>
              ) : (
                <GraphiqueColonnes colonnes={livraisons} unite={['livraison', 'livraisons']} />
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Activité selon le jour de la semaine */}
              <section className={CARTE} aria-labelledby="titre-activite">
                <h3 id="titre-activite" className={TITRE}>Activité selon le jour de la semaine</h3>
                <p className="text-[11px] text-gray-400 mb-4">Livraisons de la période, cumulées par jour</p>
                {stats.chiffres.livrees === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-10">Aucune livraison sur cette période.</p>
                ) : (
                  <GraphiqueColonnes colonnes={joursSemaine} unite={['livraison', 'livraisons']} />
                )}
              </section>

              {/* Top 10 des médicaments */}
              <section className={CARTE} aria-labelledby="titre-medicaments">
                <h3 id="titre-medicaments" className={TITRE}>Top 10 des médicaments</h3>
                <p className="text-[11px] text-gray-400 mb-4">Nombre de demandes livrées qui en contenaient</p>
                {stats.medicaments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-10">Aucune livraison sur cette période.</p>
                ) : (
                  <ol className="space-y-2.5">
                    {stats.medicaments.map((m, i) => (
                      <li key={m.nom}>
                        <p className="text-xs text-gray-700 leading-snug">
                          <span className="text-gray-400 tabular-nums mr-1.5">{i + 1}.</span>
                          {m.nom}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2">
                            <div className="h-full rounded-r bg-violet-600" style={{ width: `${(m.demandes / maxMedicament) * 100}%`, borderRadius: '0 4px 4px 0' }} />
                          </div>
                          <span className="text-xs font-600 text-gray-700 tabular-nums w-8 text-right">{m.demandes}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <p className="text-[10px] text-gray-400 pb-2">
              Une demande supprimée définitivement n'est plus comptée. « Reportées » et « Annulées » comptent les demandes reportées ou annulées pendant la période.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
