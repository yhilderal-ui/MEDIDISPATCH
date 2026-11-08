import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Users } from 'lucide-react';
import type { Demande, EtatVu, Livreur, Secteur } from '../types';
import BadgeCriticite from './BadgeCriticite';
import BadgeVu from './BadgeVu';
import { CaseCarte, CaseGroupe } from './Selection';
import { NATURE_CONFIG, statutAffiche } from '../data';
import { villeDepuisAdresse } from '../lib/adresse';
import { ajouterJours, aujourdhuiParis, depuisJour, formatJour, versJour } from '../lib/dates';
import { SECTEURS } from '../lib/livreurs';
import type { Selection } from '../lib/selection';

interface Props {
  demandes: Demande[];
  livreurs: Livreur[];
  etats: Record<string, EtatVu>;
  selection: Selection;
  onOpen: (d: Demande) => void;
  onRepartir: (d: Demande, champs: { secteur?: Secteur | null; livreur_id?: string | null }) => void;
  onAjouterLivreur: (nom: string) => Promise<boolean>;
  onModifierLivreur: (l: Livreur, champs: Partial<Pick<Livreur, 'nom' | 'actif'>>) => Promise<boolean>;
}

const MENU = 'w-full min-w-0 text-[11px] bg-white border border-gray-200 rounded-lg px-1.5 py-1 text-gray-700';

// Écran du logisticien (décision du 08/11) : pour un jour donné, chaque
// livraison est classée en Est ou Ouest, puis attribuée à un livreur.
export default function RepartitionView({ demandes, livreurs, etats, selection, onOpen, onRepartir, onAjouterLivreur, onModifierLivreur }: Props) {
  // Le dimanche (pas de livraison), on prépare directement le lundi.
  const [jour, setJour] = useState(() => {
    const auj = depuisJour(aujourdhuiParis());
    return versJour(auj.getDay() === 0 ? ajouterJours(auj, 1) : auj);
  });
  const [gestionOuverte, setGestionOuverte] = useState(false);
  const duJour = demandes.filter(d => d.jour_livraison === jour && d.statut !== 'annulee');
  const actifs = livreurs.filter(l => l.actif);
  const aClasser = duJour.filter(d => !d.secteur);
  const nonAttribuees = duJour.filter(d => !d.livreur_id).length;
  const decaler = (n: number) => {
    let d = ajouterJours(depuisJour(jour), n);
    if (d.getDay() === 0) d = ajouterJours(d, n); // pas de livraison le dimanche
    setJour(versJour(d));
  };

  const carte = (d: Demande) => {
    const statut = statutAffiche(d);
    const coche = selection.ids.has(d.id);
    // Un livreur désactivé reste affiché s'il est encore attribué à la carte.
    const proposes = livreurs.filter(l => l.actif || l.id === d.livreur_id);
    return (
      <div key={d.id} className={`relative bg-white rounded-xl border shadow-sm ${selection.actif && coche ? 'border-sky-500 ring-2 ring-sky-500' : 'border-black/5'}`}>
        <button
          type="button"
          onClick={() => (selection.actif ? selection.basculer(d.id) : onOpen(d))}
          aria-pressed={selection.actif ? coche : undefined}
          className="w-full text-left px-3 pt-2.5 pb-1.5"
        >
          <div className={`flex items-center gap-1.5 flex-wrap ${selection.actif ? 'pl-6' : ''}`}>
            <span className="font-mono text-[10px] text-gray-400 tracking-widest">{d.numero_ticket}</span>
            <BadgeVu etat={etats[d.id] ?? null} />
            {d.nature === 'retour' && (
              <span className="text-[9px] font-700 uppercase px-1.5 py-0.5 rounded-full" style={{ color: NATURE_CONFIG.retour.color, background: NATURE_CONFIG.retour.bg }}>
                Retour
              </span>
            )}
            <span className="ml-auto text-[9px] font-700 uppercase px-1.5 py-0.5 rounded-full" style={{ color: statut.color, background: statut.color + '18' }}>
              {statut.court}
            </span>
          </div>
          <p className="font-600 text-gray-900 text-[13px] leading-tight mt-1 truncate">{d.patient_nom}</p>
          <p className="text-[11px] text-gray-500 truncate">{villeDepuisAdresse(d.patient_adresse) || d.patient_adresse}</p>
          <div className="mt-1"><BadgeCriticite criticite={d.criticite} className="text-[10px]" /></div>
        </button>
        {selection.actif && <CaseCarte coche={coche} />}
        {!selection.actif && (
          <div className="grid grid-cols-2 gap-1.5 px-3 pb-2.5">
            <select
              aria-label={`Secteur de ${d.numero_ticket}`}
              value={d.secteur ?? ''}
              onChange={e => onRepartir(d, { secteur: (e.target.value || null) as Secteur | null })}
              className={MENU}
            >
              <option value="">Secteur…</option>
              <option value="est">Est</option>
              <option value="ouest">Ouest</option>
            </select>
            <select
              aria-label={`Livreur de ${d.numero_ticket}`}
              value={d.livreur_id ?? ''}
              onChange={e => onRepartir(d, { livreur_id: e.target.value || null })}
              className={MENU}
            >
              <option value="">Livreur…</option>
              {proposes.map(l => (
                <option key={l.id} value={l.id}>
                  {l.nom}
                  {l.actif ? '' : ' (inactif)'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  // Une colonne de secteur : d'abord les cartes non attribuées, puis un groupe par livreur.
  const colonneSecteur = (s: Secteur) => {
    const items = duJour.filter(d => d.secteur === s);
    const groupes: { cle: string; titre: string; items: Demande[] }[] = [
      { cle: 'sans', titre: 'Non attribuées', items: items.filter(d => !d.livreur_id) },
      ...livreurs.map(l => ({ cle: l.id, titre: l.nom, items: items.filter(d => d.livreur_id === l.id) })),
    ];
    return (
      <section key={s} aria-label={`Secteur ${SECTEURS[s].label}`} className="flex flex-col gap-2 min-w-0">
        <EnTete titre={SECTEURS[s].label} nombre={items.length} couleur={SECTEURS[s].color} fond={SECTEURS[s].bg} />
        <CaseGroupe ids={items.map(d => d.id)} selection={selection} />
        {items.length === 0 && <Vide texte="Aucune livraison" />}
        {items.length > 0 &&
          groupes
            .filter(g => g.items.length > 0)
            .map(g => (
              <div key={g.cle} className="space-y-1.5">
                <p className="text-[10px] font-700 uppercase tracking-widest text-gray-400 px-1 flex items-center justify-between">
                  <span>{g.titre}</span>
                  <span className="tabular-nums">{g.items.length}</span>
                </p>
                {g.items.map(carte)}
              </div>
            ))}
      </section>
    );
  };

  return (
    <div className={`h-full overflow-y-auto ${selection.actif ? 'pb-48 md:pb-24' : 'pb-24 md:pb-6'}`}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-0.5">
          <button type="button" aria-label="Jour précédent" onClick={() => decaler(-1)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
            <ChevronLeft size={16} aria-hidden />
          </button>
          <input
            type="date"
            aria-label="Jour à répartir"
            value={jour}
            onChange={e => e.target.value && setJour(e.target.value)}
            className="text-xs font-600 text-gray-700 bg-transparent px-1"
          />
          <button type="button" aria-label="Jour suivant" onClick={() => decaler(1)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
        {jour !== aujourdhuiParis() && (
          <button type="button" onClick={() => setJour(aujourdhuiParis())} className="text-xs font-600 text-sky-700 hover:text-sky-900 px-1">
            Aujourd'hui
          </button>
        )}
        <p className="text-xs text-gray-500" role="status">
          <span className="font-600 text-gray-800">{formatJour(jour)}</span> · {duJour.length} passage{duJour.length > 1 ? 's' : ''}
          {aClasser.length > 0 && <> · <span className="font-600 text-amber-700">{aClasser.length} à classer</span></>}
          {nonAttribuees > 0 && <> · <span className="font-600 text-amber-700">{nonAttribuees} non attribuée{nonAttribuees > 1 ? 's' : ''}</span></>}
        </p>
        <button
          type="button"
          onClick={() => setGestionOuverte(o => !o)}
          aria-expanded={gestionOuverte}
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-600 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          <Users size={14} aria-hidden /> Livreurs ({actifs.length})
        </button>
      </div>

      {gestionOuverte && <GestionLivreurs livreurs={livreurs} onAjouter={onAjouterLivreur} onModifier={onModifierLivreur} />}

      {/* Résumé par livreur */}
      {actifs.length > 0 && duJour.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4" aria-label="Passages par livreur">
          {actifs.map(l => {
            const n = duJour.filter(d => d.livreur_id === l.id).length;
            return (
              <span key={l.id} className="text-[11px] text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                {l.nom} <span className="font-700 tabular-nums text-gray-900">{n}</span>
              </span>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <section aria-label="À classer" className="flex flex-col gap-2 min-w-0">
          <EnTete titre="À classer" nombre={aClasser.length} couleur="#6b7280" fond="#f3f4f6" />
          <CaseGroupe ids={aClasser.map(d => d.id)} selection={selection} />
          {aClasser.length === 0 ? <Vide texte={duJour.length ? 'Tout est classé' : 'Aucune livraison ce jour-là'} /> : aClasser.map(carte)}
        </section>
        {colonneSecteur('est')}
        {colonneSecteur('ouest')}
      </div>
    </div>
  );
}

function EnTete({ titre, nombre, couleur, fond }: { titre: string; nombre: number; couleur: string; fond: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: fond }}>
      <span className="text-xs font-700 uppercase tracking-widest" style={{ color: couleur }}>{titre}</span>
      <span className="text-[10px] font-700 px-2 py-0.5 rounded-full text-white" style={{ background: couleur }}>{nombre}</span>
    </div>
  );
}

function Vide({ texte }: { texte: string }) {
  return (
    <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-2xl">
      <span className="text-xs text-gray-400">{texte}</span>
    </div>
  );
}

// Ajouter, renommer, désactiver un livreur (pas de suppression : son nom reste
// dans l'historique et les statistiques).
function GestionLivreurs({ livreurs, onAjouter, onModifier }: {
  livreurs: Livreur[];
  onAjouter: (nom: string) => Promise<boolean>;
  onModifier: (l: Livreur, champs: Partial<Pick<Livreur, 'nom' | 'actif'>>) => Promise<boolean>;
}) {
  const [nouveau, setNouveau] = useState('');
  const [edition, setEdition] = useState<{ id: string; nom: string } | null>(null);
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-4 mb-4 space-y-3">
      <p className="text-sm font-700 text-gray-900">Livreurs</p>
      <p className="text-[11px] text-gray-500 -mt-2">
        Ces prénoms sont proposés sur le compte partagé « Livreurs ». Un livreur désactivé n'est plus proposé, mais reste dans l'historique.
      </p>
      <ul className="divide-y divide-gray-100">
        {livreurs.map(l => (
          <li key={l.id} className="flex items-center gap-2 py-2">
            {edition?.id === l.id ? (
              <form
                className="flex items-center gap-2 flex-1"
                onSubmit={async e => {
                  e.preventDefault();
                  if (edition.nom.trim() && (await onModifier(l, { nom: edition.nom.trim() }))) setEdition(null);
                }}
              >
                <input
                  aria-label={`Nouveau prénom pour ${l.nom}`}
                  value={edition.nom}
                  onChange={e => setEdition({ id: l.id, nom: e.target.value })}
                  maxLength={40}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1"
                  autoFocus
                />
                <button type="submit" aria-label="Enregistrer" className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                  <Check size={14} aria-hidden />
                </button>
              </form>
            ) : (
              <>
                <span className={`flex-1 text-sm ${l.actif ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{l.nom}</span>
                <button type="button" aria-label={`Renommer ${l.nom}`} onClick={() => setEdition({ id: l.id, nom: l.nom })} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
                  <Pencil size={13} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onModifier(l, { actif: !l.actif })}
                  className="text-[11px] font-600 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  {l.actif ? 'Désactiver' : 'Réactiver'}
                </button>
              </>
            )}
          </li>
        ))}
        {livreurs.length === 0 && <li className="py-2 text-xs text-gray-400">Aucun livreur pour l'instant.</li>}
      </ul>
      <form
        className="flex items-center gap-2"
        onSubmit={async e => {
          e.preventDefault();
          if (nouveau.trim() && (await onAjouter(nouveau.trim()))) setNouveau('');
        }}
      >
        <input
          aria-label="Prénom du nouveau livreur"
          value={nouveau}
          onChange={e => setNouveau(e.target.value)}
          placeholder="Prénom du livreur"
          maxLength={40}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5"
        />
        <button type="submit" disabled={!nouveau.trim()} className="inline-flex items-center gap-1 text-xs font-600 px-3 py-1.5 rounded-lg bg-gray-900 text-white disabled:opacity-40">
          <Plus size={14} aria-hidden /> Ajouter
        </button>
      </form>
    </div>
  );
}
