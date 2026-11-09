import { useState } from 'react';
import { Archive, CalendarClock, Check, CircleCheck, CircleX, MapPin, Trash2, UserCheck, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Demande } from '../types';
import type { Role } from '../lib/useAuth';
import { actionPossible, actionsDuRole, type ActionGroupee, type Selection } from '../lib/selection';
import { aujourdhuiParis, erreurJourLivraison } from '../lib/dates';
import { useLivreurs } from '../lib/livreursContexte';

// Case affichée sur une carte en mode sélection (décorative : l'état est porté
// par aria-pressed sur la carte elle-même).
export function CaseCarte({ coche }: { coche: boolean }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center shadow-sm ${
        coche ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-gray-300'
      }`}
    >
      {coche && <Check size={13} strokeWidth={3} />}
    </span>
  );
}

// « Tout sélectionner » pour une colonne ou un jour.
export function CaseGroupe({ ids, selection }: { ids: string[]; selection: Selection }) {
  if (!selection.actif || ids.length === 0) return null;
  const tous = ids.every(id => selection.ids.has(id));
  return (
    <button
      type="button"
      aria-pressed={tous}
      onClick={() => selection.basculerGroupe(ids)}
      className="shrink-0 self-start flex items-center gap-1.5 text-[11px] font-600 text-sky-700 hover:text-sky-900 px-1 py-0.5"
    >
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${tous ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-gray-300'}`}>
        {tous && <Check size={11} strokeWidth={3} />}
      </span>
      {tous ? 'Tout décocher' : `Tout sélectionner (${ids.length})`}
    </button>
  );
}

const ACTIONS: Record<ActionGroupee, { libelle: string; Icone: LucideIcon; danger?: boolean }> = {
  secteur_est: { libelle: 'Secteur Est', Icone: MapPin },
  secteur_ouest: { libelle: 'Secteur Ouest', Icone: MapPin },
  attribuer: { libelle: 'Attribuer à…', Icone: UserCheck },
  livree: { libelle: 'Marquer livrées', Icone: CircleCheck },
  reporter: { libelle: 'Reporter au…', Icone: CalendarClock },
  archiver: { libelle: 'Archiver', Icone: Archive },
  annuler: { libelle: 'Annuler', Icone: CircleX, danger: true },
  supprimer: { libelle: 'Supprimer', Icone: Trash2, danger: true },
};

interface Props {
  role: Role;
  selectionnees: Demande[];
  occupe: boolean;
  // jour : pour « Reporter au… » ; livreur : pour « Attribuer à… » (null = retirer).
  onAction: (action: ActionGroupee, cibles: Demande[], options?: { jour?: string; livreur?: string | null }) => void;
  onQuitter: () => void;
}

// Barre d'actions en bas de l'écran. Chaque action indique combien de cartes
// cochées elle concerne ; les autres sont ignorées.
export function BarreSelection({ role, selectionnees, occupe, onAction, onQuitter }: Props) {
  const [jourOuvert, setJourOuvert] = useState(false);
  const [jour, setJour] = useState('');
  const [erreurJour, setErreurJour] = useState<string | null>(null);
  const [attribuerOuvert, setAttribuerOuvert] = useState(false);
  const livreurs = useLivreurs().filter(l => l.actif);
  const n = selectionnees.length;

  const lancer = (action: ActionGroupee) => {
    const cibles = selectionnees.filter(d => actionPossible(action, d, role));
    if (action === 'reporter') {
      setErreurJour(null);
      setAttribuerOuvert(false);
      setJourOuvert(o => !o);
      return;
    }
    if (action === 'attribuer') {
      setJourOuvert(false);
      setAttribuerOuvert(o => !o);
      return;
    }
    if (action === 'annuler' || action === 'supprimer') {
      const tickets = cibles.map(d => d.numero_ticket);
      const liste = tickets.slice(0, 10).join(', ') + (tickets.length > 10 ? ` et ${tickets.length - 10} autres` : '');
      const question =
        action === 'annuler'
          ? `Annuler ${cibles.length > 1 ? `ces ${cibles.length} demandes` : 'cette demande'} : ${liste} ?\nElles resteront visibles dans l'historique.`
          : `Supprimer DÉFINITIVEMENT ${cibles.length > 1 ? `ces ${cibles.length} demandes` : 'cette demande'} et leurs documents : ${liste} ?\nCette action est irréversible.`;
      if (!window.confirm(question)) return;
    }
    onAction(action, cibles);
  };

  const reporter = () => {
    const probleme = erreurJourLivraison(jour);
    if (probleme) {
      setErreurJour(probleme);
      return;
    }
    const cibles = selectionnees.filter(d => actionPossible('reporter', d, role) && d.jour_livraison !== jour);
    setJourOuvert(false);
    onAction('reporter', cibles, { jour });
  };

  const attribuer = (livreur: string | null) => {
    const cibles = selectionnees.filter(d => actionPossible('attribuer', d, role) && d.livreur_id !== livreur);
    setAttribuerOuvert(false);
    onAction('attribuer', cibles, { livreur });
  };

  return (
    <div
      role="region"
      aria-label="Actions sur la sélection"
      className="fixed z-50 bottom-3 inset-x-3 md:mx-auto md:w-fit md:max-w-[calc(100vw-2rem)] bg-gray-900 text-white rounded-2xl shadow-2xl p-2"
    >
      {jourOuvert && (
        <div className="flex flex-wrap items-center gap-2 px-2 pt-1 pb-2 mb-1 border-b border-white/10">
          <label className="text-xs text-white/70 flex items-center gap-2">
            Reporter au
            <input
              type="date"
              value={jour}
              min={aujourdhuiParis()}
              onChange={e => setJour(e.target.value)}
              className="bg-white text-gray-900 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <button type="button" onClick={reporter} disabled={!jour || occupe} className="text-xs font-600 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40">
            Reporter
          </button>
          {erreurJour && <p role="alert" className="text-[11px] text-red-300 w-full">{erreurJour}</p>}
        </div>
      )}
      {attribuerOuvert && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 pt-1 pb-2 mb-1 border-b border-white/10" role="group" aria-label="Attribuer à">
          <span className="text-xs text-white/70 mr-1">Attribuer à</span>
          {livreurs.map(l => (
            <button key={l.id} type="button" disabled={occupe} onClick={() => attribuer(l.id)} className="text-xs font-600 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-sky-500">
              {l.nom}
            </button>
          ))}
          <button type="button" disabled={occupe} onClick={() => attribuer(null)} className="text-xs px-2.5 py-1.5 rounded-lg text-white/70 hover:bg-white/10">
            Personne
          </button>
          {livreurs.length === 0 && <span className="text-[11px] text-white/60">Ajoutez d'abord des livreurs (écran Répartition).</span>}
        </div>
      )}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5">
        <p role="status" className="text-xs font-600 px-2 shrink-0 whitespace-nowrap flex-1 md:flex-none">
          {n === 0 ? 'Touchez les cartes à sélectionner' : `${n} sélectionnée${n > 1 ? 's' : ''}`}
        </p>
        <div className="order-last md:order-none w-full md:w-auto flex flex-wrap md:flex-nowrap items-center gap-1 min-w-0">
          {n > 0 &&
            actionsDuRole(role).map(action => {
              const nb = selectionnees.filter(d => actionPossible(action, d, role)).length;
              const { libelle, Icone, danger } = ACTIONS[action];
              return (
                <button
                  key={action}
                  type="button"
                  disabled={nb === 0 || occupe}
                  onClick={() => lancer(action)}
                  title={nb === 0 ? 'Aucune carte sélectionnée ne s’y prête' : undefined}
                  className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-600 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-35 ${
                    danger ? 'text-red-200 hover:bg-red-500/20' : 'hover:bg-white/10'
                  } ${(action === 'reporter' && jourOuvert) || (action === 'attribuer' && attribuerOuvert) ? 'bg-white/15' : ''}`}
                >
                  <Icone size={14} aria-hidden />
                  {libelle}
                  {nb > 0 && nb < n && <span className="text-white/50 font-400">({nb})</span>}
                </button>
              );
            })}
        </div>
        <button type="button" onClick={onQuitter} aria-label="Quitter la sélection" className="shrink-0 w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
