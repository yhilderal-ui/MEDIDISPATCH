import { useEffect, useRef, useState } from 'react';
import type { Demande, DocumentJoint, ModificationDemande as Champs, Note, Statut, TypeDocument } from '../types';
import ModificationDemande from './ModificationDemande';
import HistoriqueDemande from './HistoriqueDemande';
import { CRITICITE_CONFIG, DOC_CONFIG, LIBELLE_PIECE, PIECES, STATUT_CONFIG } from '../data';
import { aujourdhuiParis, erreurJourLivraison, formatHorodatage, formatJour } from '../lib/dates';
import { ajouterNote, lienDocument, listerNotes, messageErreur, surveillerNotes } from '../lib/demandes';
import type { Role } from '../lib/useAuth';

interface Props {
  demande: Demande;
  role: Role;
  utilisateurId: string;
  onClose: () => void;
  onSupprimer: () => Promise<boolean>;
  // Chaque action renvoie true si elle a réussi ; les erreurs sont affichées par App.
  onChangerStatut: (statut: Statut) => Promise<boolean>;
  onReporter: (jour: string) => Promise<boolean>;
  onDeposer: (type: TypeDocument, fichier: File) => Promise<boolean>;
  onModifier: (champs: Champs) => Promise<boolean>;
  onGenererBon: () => Promise<boolean>;
}

const TITRE = 'text-[10px] font-700 uppercase tracking-widest text-gray-400 mb-2';

function LigneDocument({ doc }: { doc: DocumentJoint }) {
  const cfg = DOC_CONFIG[doc.type];
  const [erreur, setErreur] = useState<string | null>(null);

  const ouvrir = async () => {
    // On ouvre l'onglet tout de suite (sinon le navigateur le bloque),
    // puis on y charge le lien temporaire sécurisé.
    const onglet = window.open('', '_blank');
    try {
      const url = await lienDocument(doc.chemin_fichier);
      if (onglet) onglet.location.href = url;
      else window.location.href = url;
      setErreur(null);
    } catch (e) {
      onglet?.close();
      setErreur((e as Error).message);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={ouvrir}
        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: cfg.bg }}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-600 text-gray-800 leading-tight">
            {cfg.label}
            {doc.type === 'bon_livraison' && (
              <span className="ml-1.5 text-[9px] font-700 uppercase tracking-widest text-gray-400">{doc.genere ? 'généré' : 'joint'}</span>
            )}
          </p>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">{doc.nom_fichier}</p>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">Ajouté le {formatHorodatage(doc.ajoute_le)}</p>
        </div>
        <span className="text-[10px] text-gray-300 group-hover:text-gray-600 transition-colors shrink-0">Ouvrir →</span>
      </button>
      {erreur && <p className="text-[11px] text-red-600 px-3 pb-2">{erreur}</p>}
    </div>
  );
}

function FilNotes({ demandeId }: { demandeId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let actif = true;
    const charger = () =>
      listerNotes(demandeId)
        .then(n => actif && setNotes(n))
        .catch(e => actif && setErreur(messageErreur(e)));
    charger();
    const arreter = surveillerNotes(demandeId, charger);
    return () => {
      actif = false;
      arreter();
    };
  }, [demandeId]);

  const envoyer = async () => {
    const contenu = texte.trim();
    if (!contenu) return;
    setEnvoi(true);
    try {
      await ajouterNote(demandeId, contenu);
      setTexte('');
      setErreur(null);
      setNotes(await listerNotes(demandeId));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {notes.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Aucune note pour cette demande.</p>}
      {notes.map(n => (
        <div key={n.id} className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="text-xs font-700 text-amber-800">{n.auteur_nom}</span>
            <span className="text-[10px] text-amber-500 font-mono">{formatHorodatage(n.cree_le)}</span>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{n.contenu}</p>
        </div>
      ))}

      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
        <textarea
          value={texte}
          onChange={e => setTexte(e.target.value)}
          placeholder="Ajouter une note…"
          aria-label="Nouvelle note"
          rows={2}
          className="w-full px-4 pt-3 pb-2 text-sm text-gray-800 resize-none outline-none placeholder:text-gray-300"
        />
        <div className="flex items-center justify-end px-3 pb-3">
          <button
            type="button"
            onClick={envoyer}
            disabled={!texte.trim() || envoi}
            className="text-xs font-600 bg-amber-400 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {envoi ? 'Envoi…' : 'Ajouter'}
          </button>
        </div>
      </div>
      {erreur && <p role="alert" className="text-[11px] text-red-600">{erreur}</p>}
    </div>
  );
}

export default function DemandePanel({ demande, role, utilisateurId, onClose, onSupprimer, onChangerStatut, onReporter, onDeposer, onModifier, onGenererBon }: Props) {
  const [edition, setEdition] = useState(false);
  const criticite = CRITICITE_CONFIG[demande.criticite];
  const statut = STATUT_CONFIG[demande.statut];
  const [occupe, setOccupe] = useState(false);
  const [nouveauJour, setNouveauJour] = useState('');
  const [erreurReport, setErreurReport] = useState<string | null>(null);
  const preuveRef = useRef<HTMLInputElement>(null);

  const aPreuve = demande.documents.some(d => d.type === 'preuve_livraison');
  const documents = [...demande.documents].sort((a, b) => a.ajoute_le.localeCompare(b.ajoute_le));

  const executer = async (action: () => Promise<boolean>) => {
    setOccupe(true);
    await action();
    setOccupe(false);
  };

  const confirmerReport = () => {
    const probleme = erreurJourLivraison(nouveauJour);
    if (probleme) {
      setErreurReport(probleme);
      return;
    }
    setErreurReport(null);
    executer(async () => {
      const ok = await onReporter(nouveauJour);
      if (ok) setNouveauJour('');
      return ok;
    });
  };

  const annuler = () => {
    if (window.confirm(`Annuler la demande ${demande.numero_ticket} ? Elle restera visible dans l'historique.`)) {
      executer(() => onChangerStatut('annulee'));
    }
  };

  const supprimer = () => {
    const saisie = window.prompt(
      `Suppression DÉFINITIVE de la demande ${demande.numero_ticket} et de ses documents.\n` +
        `Cette action est irréversible.\n\nTapez ${demande.numero_ticket} pour confirmer :`,
    );
    if (saisie === null) return;
    if (saisie.trim().toUpperCase() !== demande.numero_ticket) {
      window.alert('Numéro de ticket incorrect : la demande n\'a pas été supprimée.');
      return;
    }
    executer(onSupprimer);
  };

  // L'autre compte a-t-il consulté la carte depuis sa dernière modification ?
  const autre = role === 'dispatcher' ? 'la société de livraison' : 'le dispatcheur';
  const lectureAutre = demande.lectures_demandes.find(l => l.utilisateur_id !== utilisateurId);
  const autreAJour = lectureAutre && lectureAutre.vu_le >= demande.derniere_activite_le;

  const modifiable = demande.statut === 'nouvelle' || demande.statut === 'en_cours';

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label={`Demande ${demande.numero_ticket}`}
        className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl flex flex-col slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400 tracking-widest">{demande.numero_ticket}</span>
              <span
                className="text-[10px] font-700 uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ color: statut.color, background: statut.color + '18' }}
              >
                {statut.label}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Criticité mise en avant (cahier des charges, section 4) */}
          <div
            className="rounded-xl px-3 py-2 mb-3 text-sm font-700 flex items-center gap-2"
            style={{ color: criticite.color, background: criticite.bg }}
          >
            <span>{criticite.emoji}</span> {criticite.label}
          </div>

          <h2 className="text-base font-700 text-gray-900 mb-2">{demande.patient_nom}</h2>
          <div className="space-y-1.5 text-xs text-gray-600">
            <p className="flex items-start gap-2">
              <span className="mt-1 w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <span>{demande.patient_adresse}</span>
            </p>
            <p className="flex items-center gap-2">
              <span aria-hidden>📞</span>
              <a href={`tel:${demande.patient_telephone.replace(/\s/g, '')}`} className="underline decoration-gray-300 hover:text-gray-900">
                {demande.patient_telephone}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <span aria-hidden>📅</span>
              <span>Livraison prévue : <span className="font-600 text-gray-800">{formatJour(demande.jour_livraison)}</span></span>
            </p>
          </div>

          {/* Utile seulement si c'est moi qui ai fait la dernière modification. */}
          {demande.derniere_activite_par === utilisateurId && (
            <p className={`mt-3 text-[11px] flex items-center gap-1.5 ${autreAJour ? 'text-emerald-600' : 'text-gray-400'}`}>
              <span aria-hidden>👁</span>
              {autreAJour
                ? `Vue par ${autre} le ${formatHorodatage(lectureAutre!.vu_le)}`
                : lectureAutre
                  ? `Dernière modification pas encore vue par ${autre}`
                  : `Pas encore consultée par ${autre}`}
            </p>
          )}

          {demande.notes_initiales && (
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <p className="text-xs text-amber-700 leading-snug whitespace-pre-wrap">{demande.notes_initiales}</p>
            </div>
          )}
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {modifiable && !edition && (
            <button
              type="button"
              onClick={() => setEdition(true)}
              className="w-full text-xs font-600 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ✏️ Modifier les informations
            </button>
          )}
          {edition && (
            <ModificationDemande demande={demande} onAnnuler={() => setEdition(false)} onEnregistrer={onModifier} />
          )}

          <section>
            <p className={TITRE}>Médicaments ({demande.medicaments.length})</p>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              {demande.medicaments.map((m, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-b-0 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-gray-300 font-mono w-4 shrink-0">{i + 1}</span>
                    <span className="text-xs text-gray-700 font-500 truncate">{m.nom}</span>
                  </div>
                  {m.quantite && <span className="text-[11px] font-600 text-gray-400 font-mono shrink-0">{m.quantite}</span>}
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className={TITRE}>Documents ({documents.length})</p>
            <div className="divide-y divide-gray-100">
              {documents.map(doc => <LigneDocument key={doc.id} doc={doc} />)}
              {documents.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">Aucun document joint</p>}
            </div>
            {!demande.documents.some(d => d.genere) && (
              <button
                type="button"
                disabled={occupe}
                onClick={() => executer(onGenererBon)}
                className="mt-2 w-full text-xs font-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl py-2 transition-colors disabled:opacity-50"
              >
                📄 Générer le bon de livraison
              </button>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PIECES.filter(type => !demande.documents.some(d => d.type === type && !d.genere)).map(type => (
                <label
                  key={type}
                  className="text-center text-[11px] font-600 text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl px-2 py-2 cursor-pointer transition-colors"
                >
                  + {LIBELLE_PIECE[type]}
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) executer(() => onDeposer(type, f));
                    }}
                  />
                </label>
              ))}
            </div>
          </section>

          {modifiable && (
            <section>
              <p className={TITRE}>Reporter la livraison</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={nouveauJour}
                  min={aujourdhuiParis()}
                  onChange={e => setNouveauJour(e.target.value)}
                  aria-label="Nouvelle date de livraison"
                  className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400"
                />
                <button
                  type="button"
                  onClick={confirmerReport}
                  disabled={!nouveauJour || occupe}
                  className="text-xs font-600 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-30 transition-colors"
                >
                  Reporter
                </button>
              </div>
              {erreurReport && <p role="alert" className="text-[11px] text-red-600 mt-1">{erreurReport}</p>}
            </section>
          )}

          <section>
            <p className={TITRE}>Notes</p>
            <FilNotes demandeId={demande.id} />
          </section>

          <section>
            <p className={TITRE}>Historique</p>
            <HistoriqueDemande demandeId={demande.id} version={demande.mis_a_jour_le} />
          </section>
        </div>

        {/* Actions de statut */}
        <div className="shrink-0 px-6 pb-6 pt-3 border-t border-gray-100 flex flex-col gap-2">
          {demande.statut === 'nouvelle' && (
            <button
              type="button"
              disabled={occupe}
              onClick={() => executer(() => onChangerStatut('en_cours'))}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-600 text-sm py-2.5 rounded-xl transition-colors"
            >
              🚚 Passer « En cours de livraison »
            </button>
          )}

          {/* Photo de preuve : optionnelle en V1, ajoutable pendant ou après la livraison. */}
          {(demande.statut === 'en_cours' || demande.statut === 'livree') && !aPreuve && (
            <>
              <button
                type="button"
                disabled={occupe}
                onClick={() => preuveRef.current?.click()}
                className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-600 text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                📷 Ajouter une photo de preuve <span className="font-400 opacity-70">(optionnel)</span>
              </button>
              <input
                ref={preuveRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png"
                onChange={e => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) executer(() => onDeposer('preuve_livraison', f));
                }}
              />
            </>
          )}

          {demande.statut === 'en_cours' && (
            <button
              type="button"
              disabled={occupe}
              onClick={() => executer(() => onChangerStatut('livree'))}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-600 text-sm py-2.5 rounded-xl transition-colors"
            >
              ✓ Marquer comme livrée
            </button>
          )}

          {demande.statut === 'livree' && (
            <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-600 text-sm py-2.5 rounded-xl text-center">
              ✓ Livrée
            </div>
          )}

          {demande.statut === 'annulee' && role === 'dispatcher' && (
            <button
              type="button"
              disabled={occupe}
              onClick={supprimer}
              className="w-full text-xs font-600 py-2 rounded-xl bg-white text-red-600 hover:bg-red-50 border border-red-300 transition-colors disabled:opacity-50"
            >
              🗑 Supprimer définitivement
            </button>
          )}

          {demande.statut === 'annulee' && (
            <button
              type="button"
              disabled={occupe}
              onClick={() => executer(() => onChangerStatut('nouvelle'))}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-600 text-sm py-2.5 rounded-xl transition-colors"
            >
              ↩ Remettre en « Nouvelle demande »
            </button>
          )}

          {modifiable && (
            <button
              type="button"
              disabled={occupe}
              onClick={annuler}
              className="w-full text-xs font-600 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
            >
              ✕ Annuler la demande
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
