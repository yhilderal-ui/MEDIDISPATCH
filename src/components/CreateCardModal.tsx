import { useState, useRef, useEffect } from 'react';
import type { Criticite, Medicament, NouvelleDemande, Pieces } from '../types';
import { CRITICITE_CONFIG, DOC_CONFIG, LIBELLE_PIECE, PIECES } from '../data';
import ChampPiece from './ChampPiece';
import { aujourdhuiParis, erreurJourLivraison } from '../lib/dates';

interface Props {
  onClose: () => void;
  onSubmit: (demande: NouvelleDemande, pieces: Pieces) => Promise<string | null>;
}

interface LigneMedicament extends Medicament {
  cle: number;
}

const CHAMP =
  'w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300';
const ETIQUETTE = 'text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1';

let prochaineCle = 1;

export default function CreateCardModal({ onClose, onSubmit }: Props) {
  const [form, setForm] = useState({
    patient_nom: '',
    patient_telephone: '',
    patient_adresse: '',
    jour_livraison: '',
    criticite: 'standard' as Criticite,
    notes_initiales: '',
  });
  const [medicaments, setMedicaments] = useState<LigneMedicament[]>([{ cle: prochaineCle++, nom: '', quantite: '' }]);
  const [pieces, setPieces] = useState<Pieces>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const nomRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Ligne à placer sous le curseur après le prochain affichage.
  const [aFocaliser, setAFocaliser] = useState<number | null>(null);

  useEffect(() => {
    if (aFocaliser === null) return;
    nomRefs.current[aFocaliser]?.focus();
    setAFocaliser(null);
  }, [aFocaliser, medicaments]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const ajouterLigne = (apres: number) => {
    setMedicaments(ls => {
      const suite = [...ls];
      suite.splice(apres + 1, 0, { cle: prochaineCle++, nom: '', quantite: '' });
      return suite;
    });
    setAFocaliser(apres + 1);
  };

  const retirerLigne = (i: number) => setMedicaments(ls => ls.filter((_, j) => j !== i));

  const majLigne = (i: number, champ: keyof Medicament, valeur: string) =>
    setMedicaments(ls => ls.map((l, j) => (j === i ? { ...l, [champ]: valeur } : l)));

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    const lignes = medicaments
      .map(l => ({ nom: l.nom.trim(), quantite: l.quantite.trim() }))
      .filter(l => l.nom);

    const probleme =
      (!form.patient_nom.trim() && 'Indiquez le nom du patient.') ||
      (!form.patient_telephone.trim() && 'Indiquez le téléphone du patient.') ||
      (!form.patient_adresse.trim() && "Indiquez l'adresse de livraison.") ||
      erreurJourLivraison(form.jour_livraison) ||
      (lignes.length === 0 && 'Ajoutez au moins un médicament.') ||
      null;
    if (probleme) {
      setErreur(probleme);
      return;
    }

    setEnvoi(true);
    setErreur(null);
    const echec = await onSubmit(
      {
        patient_nom: form.patient_nom.trim(),
        patient_telephone: form.patient_telephone.trim(),
        patient_adresse: form.patient_adresse.trim(),
        jour_livraison: form.jour_livraison,
        criticite: form.criticite,
        medicaments: lignes,
        notes_initiales: form.notes_initiales.trim() || null,
      },
      pieces,
    );
    setEnvoi(false);
    if (echec) setErreur(echec);
    else onClose();
  };

  const nbMedicaments = medicaments.filter(l => l.nom.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg slide-in max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-700 text-gray-900">Nouvelle demande</h2>
            <p className="text-xs text-gray-400 mt-0.5">Un numéro de ticket sera attribué automatiquement</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500 text-lg leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <form onSubmit={soumettre} noValidate className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Patient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={ETIQUETTE} htmlFor="patient_nom">Nom du patient</label>
              <input id="patient_nom" value={form.patient_nom} onChange={set('patient_nom')} placeholder="M. Bernard Fontaine" className={CHAMP} />
            </div>
            <div>
              <label className={ETIQUETTE} htmlFor="patient_telephone">Téléphone</label>
              <input id="patient_telephone" type="tel" value={form.patient_telephone} onChange={set('patient_telephone')} placeholder="06 12 34 56 78" className={CHAMP} />
            </div>
          </div>

          <div>
            <label className={ETIQUETTE} htmlFor="patient_adresse">Adresse de livraison</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-400" />
              <input
                id="patient_adresse"
                value={form.patient_adresse}
                onChange={set('patient_adresse')}
                placeholder="88 avenue Kléber, 75016 Paris"
                className={`${CHAMP} pl-7`}
              />
            </div>
          </div>

          {/* Date + criticité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={ETIQUETTE} htmlFor="jour_livraison">Jour de livraison</label>
              <input
                id="jour_livraison"
                type="date"
                value={form.jour_livraison}
                onChange={set('jour_livraison')}
                min={aujourdhuiParis()}
                className={CHAMP}
              />
              <p className="text-[10px] text-gray-400 mt-1">Aujourd'hui ou plus tard, hors dimanche</p>
            </div>
            <div>
              <label className={ETIQUETTE} htmlFor="criticite">Criticité</label>
              <select id="criticite" value={form.criticite} onChange={set('criticite')} className={`${CHAMP} appearance-none`}>
                {(Object.keys(CRITICITE_CONFIG) as Criticite[]).map(c => (
                  <option key={c} value={c}>
                    {CRITICITE_CONFIG[c].emoji} {CRITICITE_CONFIG[c].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Médicaments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={ETIQUETTE.replace(' block mb-1', '')}>Médicaments</span>
              <span className="text-[10px] text-gray-400 font-mono">
                {nbMedicaments} article{nbMedicaments !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              {medicaments.map((ligne, i) => (
                <div key={ligne.cle} className="flex items-center border-b border-gray-100 last:border-b-0 group">
                  <span className="pl-3 text-[11px] text-gray-300 font-mono w-6 shrink-0">{i + 1}</span>
                  <input
                    ref={el => { nomRefs.current[i] = el; }}
                    value={ligne.nom}
                    onChange={e => majLigne(i, 'nom', e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        ajouterLigne(i);
                      }
                      if (e.key === 'Backspace' && ligne.nom === '' && medicaments.length > 1) {
                        e.preventDefault();
                        retirerLigne(i);
                        setAFocaliser(Math.max(0, i - 1));
                      }
                    }}
                    placeholder="Nom du médicament…"
                    aria-label={`Médicament ${i + 1}`}
                    className="flex-1 min-w-0 text-sm px-3 py-2.5 outline-none bg-transparent placeholder:text-gray-300"
                  />
                  <input
                    value={ligne.quantite}
                    onChange={e => majLigne(i, 'quantite', e.target.value)}
                    placeholder="Qté"
                    aria-label={`Quantité ${i + 1}`}
                    className="w-20 text-sm px-2 py-2.5 outline-none bg-transparent text-gray-500 placeholder:text-gray-300 text-right"
                  />
                  {medicaments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => retirerLigne(i)}
                      aria-label={`Retirer le médicament ${i + 1}`}
                      className="w-8 self-stretch flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => ajouterLigne(medicaments.length - 1)}
                className="w-full text-left text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors px-4 py-2.5 flex items-center gap-2"
              >
                <span className="text-base leading-none">+</span> Ajouter un médicament
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={ETIQUETTE} htmlFor="notes_initiales">Notes (optionnel)</label>
            <textarea
              id="notes_initiales"
              value={form.notes_initiales}
              onChange={set('notes_initiales')}
              placeholder="Digicode, étage, horaires de présence…"
              rows={2}
              className={`${CHAMP} resize-none`}
            />
          </div>

          {/* Pièces jointes (toutes optionnelles) */}
          <div>
            <span className={ETIQUETTE}>Pièces jointes (optionnelles)</span>
            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-2">
              📄 Un bon de livraison PDF sera généré automatiquement à partir de ces informations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PIECES.map(type => (
                <ChampPiece
                  key={type}
                  libelle={LIBELLE_PIECE[type]}
                  icone={DOC_CONFIG[type].icon}
                  fichier={pieces[type]}
                  onChange={f => setPieces(p => ({ ...p, [type]: f }))}
                  onErreur={setErreur}
                />
              ))}
            </div>
          </div>

          {erreur && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={envoi}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-600 text-sm py-3 rounded-xl transition-colors"
          >
            {envoi ? 'Enregistrement…' : 'Créer la demande →'}
          </button>
        </form>
      </div>
    </div>
  );
}
