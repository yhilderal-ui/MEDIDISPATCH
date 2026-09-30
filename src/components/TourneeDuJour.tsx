import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CircleCheck, MapPinned, Phone, RotateCcw, TriangleAlert } from 'lucide-react';
import type { Demande, EtatVu } from '../types';
import BadgeCriticite from './BadgeCriticite';
import BadgeVu from './BadgeVu';
import BoutonsItineraire from './BoutonsItineraire';
import { CRITICITE_ORDRE, STATUT_CONFIG } from '../data';
import { aujourdhuiParis, formatJour } from '../lib/dates';
import { ARRETS_PAR_PARCOURS, urlsTourneeGoogle } from '../lib/itineraire';
import { villeDepuisAdresse } from '../lib/adresse';

interface Props {
  demandes: Demande[];
  onOpen: (demande: Demande) => void;
  etats: Record<string, EtatVu>;
}

// Ordre choisi à la main, mémorisé sur l'appareil pour la journée.
const cleOrdre = (jour: string) => `medidispatch.tournee.${jour}`;

function lireOrdre(jour: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(cleOrdre(jour)) ?? '[]');
  } catch {
    return [];
  }
}

function ecrireOrdre(jour: string, ids: string[] | null) {
  try {
    // On ne garde que la tournée du jour : les anciennes sont effacées.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const cle = localStorage.key(i);
      if (cle?.startsWith('medidispatch.tournee.') && cle !== cleOrdre(jour)) localStorage.removeItem(cle);
    }
    if (ids) localStorage.setItem(cleOrdre(jour), JSON.stringify(ids));
    else localStorage.removeItem(cleOrdre(jour));
  } catch {
    // stockage indisponible : l'ordre ne sera simplement pas mémorisé
  }
}

// Ordre automatique : urgences d'abord, puis regroupement par code postal.
function ordreAutomatique(a: Demande, b: Demande) {
  return (
    CRITICITE_ORDRE[a.criticite] - CRITICITE_ORDRE[b.criticite] ||
    villeDepuisAdresse(a.patient_adresse).localeCompare(villeDepuisAdresse(b.patient_adresse), 'fr') ||
    a.numero_ticket.localeCompare(b.numero_ticket)
  );
}

export default function TourneeDuJour({ demandes, onOpen, etats }: Props) {
  const jour = aujourdhuiParis();
  const [ordre, setOrdre] = useState<string[]>(() => lireOrdre(jour));

  // Nouveau jour (application restée ouverte) : on repart de l'ordre automatique.
  useEffect(() => setOrdre(lireOrdre(jour)), [jour]);

  const duJour = demandes.filter(d => d.jour_livraison === jour && d.statut !== 'annulee');
  const livrees = duJour
    .filter(d => d.statut === 'livree')
    .sort((a, b) => (a.livree_le ?? '').localeCompare(b.livree_le ?? ''));

  const aLivrer = (() => {
    const restants = duJour.filter(d => d.statut === 'nouvelle' || d.statut === 'en_cours');
    const position = new Map(ordre.map((id, i) => [id, i]));
    const places = restants.filter(d => position.has(d.id)).sort((a, b) => position.get(a.id)! - position.get(b.id)!);
    const nouveaux = restants.filter(d => !position.has(d.id)).sort(ordreAutomatique);
    return [...places, ...nouveaux];
  })();

  const deplacer = (index: number, sens: -1 | 1) => {
    const ids = aLivrer.map(d => d.id);
    const cible = index + sens;
    if (cible < 0 || cible >= ids.length) return;
    [ids[index], ids[cible]] = [ids[cible], ids[index]];
    setOrdre(ids);
    ecrireOrdre(jour, ids);
  };

  const reinitialiser = () => {
    setOrdre([]);
    ecrireOrdre(jour, null);
  };

  const parcours = urlsTourneeGoogle(aLivrer.map(d => d.patient_adresse));

  return (
    <div className="h-full overflow-y-auto pb-24 md:pb-6">
      <div className="max-w-2xl mx-auto space-y-3">
        {/* En-tête de la tournée */}
        <div className="bg-white rounded-2xl border border-black/5 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-700 text-gray-900">Tournée du {formatJour(jour)}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-600 text-gray-800">{aLivrer.length}</span> à livrer
                {livrees.length > 0 && <> · <span className="font-600 text-emerald-700">{livrees.length}</span> livrée{livrees.length > 1 ? 's' : ''}</>}
              </p>
            </div>
            {ordre.length > 0 && aLivrer.length > 1 && (
              <button type="button" onClick={reinitialiser} className="text-[11px] text-gray-400 hover:text-gray-700 inline-flex items-center gap-1">
                <RotateCcw size={12} aria-hidden /> Ordre automatique
              </button>
            )}
          </div>

          {aLivrer.length > 0 && (
            // Waze n'accepte qu'une destination : on lui donne le prochain arrêt.
            <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5">
              <BoutonsItineraire adresse={aLivrer[0].patient_adresse} libelle={`Prochain arrêt (n° 1 — ${aLivrer[0].numero_ticket})`} />
            </div>
          )}

          {aLivrer.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {parcours.map(p => (
                <a
                  key={p.debut}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-600 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
                >
                  <MapPinned size={14} aria-hidden />
                  {parcours.length === 1 ? 'Toute la tournée dans Google Maps' : `Arrêts ${p.debut} à ${p.fin} dans Google Maps`}
                </a>
              ))}
            </div>
          )}
          {aLivrer.length > 1 && (
            <p className="text-[10px] text-gray-400 mt-2">
              Ordre par défaut : urgences d'abord, puis par ville. Les flèches permettent de le changer (mémorisé sur cet appareil pour la journée).
              {parcours.length > 1 && ` Google Maps accepte ${ARRETS_PAR_PARCOURS} arrêts par parcours.`}
            </p>
          )}
        </div>

        {aLivrer.length === 0 && (
          <div className="flex items-center justify-center h-28 border-2 border-dashed border-gray-200 rounded-2xl">
            <span className="text-xs text-gray-400">{livrees.length ? 'Tout est livré pour aujourd’hui.' : 'Aucune livraison prévue aujourd’hui.'}</span>
          </div>
        )}

        {/* Arrêts à livrer, dans l'ordre de la tournée */}
        <ol className="space-y-3">
          {aLivrer.map((d, i) => {
            const statut = STATUT_CONFIG[d.statut];
            return (
              <li key={d.id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                <div className="flex">
                  <div className="flex flex-col items-center gap-1 py-3 px-2 bg-gray-50 border-r border-gray-100">
                    <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-700 flex items-center justify-center" aria-label={`Arrêt ${i + 1}`}>
                      {i + 1}
                    </span>
                    <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label={`Monter l'arrêt ${i + 1}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-25">
                      <ArrowUp size={15} aria-hidden />
                    </button>
                    <button type="button" onClick={() => deplacer(i, 1)} disabled={i === aLivrer.length - 1} aria-label={`Descendre l'arrêt ${i + 1}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-25">
                      <ArrowDown size={15} aria-hidden />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] text-gray-400 tracking-widest">{d.numero_ticket}</span>
                      <BadgeVu etat={etats[d.id] ?? null} />
                      <span className="text-[10px] font-600 px-2 py-0.5 rounded-full" style={{ color: statut.color, background: statut.color + '14' }}>
                        {statut.label}
                      </span>
                      <span className="ml-auto"><BadgeCriticite criticite={d.criticite} /></span>
                    </div>
                    <p className="font-700 text-gray-900 text-[15px] leading-tight">{d.patient_nom}</p>
                    <p className="text-xs text-gray-600 leading-snug">{d.patient_adresse}</p>
                    <a href={`tel:${d.patient_telephone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-xs text-gray-600 underline decoration-gray-300">
                      <Phone size={12} className="text-gray-400" aria-hidden /> {d.patient_telephone}
                    </a>
                    {d.notes_initiales && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                        <TriangleAlert size={13} className="text-amber-600 shrink-0 mt-px" aria-hidden />
                        <p className="text-[11px] text-amber-700 leading-snug">{d.notes_initiales}</p>
                      </div>
                    )}
                    <div className="flex items-end justify-between gap-2 flex-wrap pt-1">
                      <BoutonsItineraire adresse={d.patient_adresse} />
                      <button type="button" onClick={() => onOpen(d)} className="text-xs font-600 text-violet-700 hover:text-violet-900 px-1 py-1.5">
                        Ouvrir la demande →
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Déjà livrées aujourd'hui */}
        {livrees.length > 0 && (
          <details className="bg-white rounded-2xl border border-black/5 p-4">
            <summary className="text-xs font-600 text-gray-600 cursor-pointer select-none inline-flex items-center gap-1.5">
              <CircleCheck size={14} className="text-emerald-600" aria-hidden /> Livrées aujourd’hui ({livrees.length})
            </summary>
            <ul className="mt-3 divide-y divide-gray-100">
              {livrees.map(d => (
                <li key={d.id}>
                  <button type="button" onClick={() => onOpen(d)} className="w-full text-left py-2 flex items-center gap-3 text-xs hover:bg-gray-50">
                    <span className="font-mono text-[11px] text-gray-400">{d.numero_ticket}</span>
                    <span className="flex-1 min-w-0 truncate text-gray-700">{d.patient_nom}</span>
                    {d.livree_le && (
                      <span className="text-gray-400 shrink-0">
                        {new Date(d.livree_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
