import { useState } from 'react';
import type { Criticite, Demande, Medicament, ModificationDemande as Champs } from '../types';
import { CRITICITE_CONFIG } from '../data';

interface Props {
  demande: Demande;
  onAnnuler: () => void;
  onEnregistrer: (champs: Champs) => Promise<boolean>;
}

const CHAMP =
  'w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all';
const ETIQUETTE = 'text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1';

// Étape 6 : corriger une demande (adresse erronée, médicament oublié…).
// Le jour de livraison se change avec « Reporter », le statut avec les boutons du bas.
export default function ModificationDemande({ demande, onAnnuler, onEnregistrer }: Props) {
  const [form, setForm] = useState({
    patient_nom: demande.patient_nom,
    patient_telephone: demande.patient_telephone,
    patient_adresse: demande.patient_adresse,
    criticite: demande.criticite,
    notes_initiales: demande.notes_initiales ?? '',
  });
  const [medicaments, setMedicaments] = useState<Medicament[]>(
    demande.medicaments.length ? demande.medicaments.map(m => ({ ...m })) : [{ nom: '', quantite: '' }],
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const majLigne = (i: number, champ: keyof Medicament, v: string) =>
    setMedicaments(ls => ls.map((l, j) => (j === i ? { ...l, [champ]: v } : l)));

  const enregistrer = async () => {
    const lignes = medicaments.map(m => ({ nom: m.nom.trim(), quantite: m.quantite.trim() })).filter(m => m.nom);
    const probleme =
      (!form.patient_nom.trim() && 'Indiquez le nom du patient.') ||
      (!form.patient_telephone.trim() && 'Indiquez le téléphone du patient.') ||
      (!form.patient_adresse.trim() && "Indiquez l'adresse de livraison.") ||
      (lignes.length === 0 && 'Ajoutez au moins un médicament.') ||
      null;
    if (probleme) {
      setErreur(probleme);
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const ok = await onEnregistrer({
      patient_nom: form.patient_nom.trim(),
      patient_telephone: form.patient_telephone.trim(),
      patient_adresse: form.patient_adresse.trim(),
      criticite: form.criticite as Criticite,
      notes_initiales: form.notes_initiales.trim() || null,
      medicaments: lignes,
    });
    setEnvoi(false);
    if (ok) onAnnuler();
  };

  return (
    <div className="space-y-3 bg-violet-50/40 border border-violet-100 rounded-2xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={ETIQUETTE} htmlFor="mod_nom">Nom du patient</label>
          <input id="mod_nom" value={form.patient_nom} onChange={set('patient_nom')} className={CHAMP} />
        </div>
        <div>
          <label className={ETIQUETTE} htmlFor="mod_tel">Téléphone</label>
          <input id="mod_tel" type="tel" value={form.patient_telephone} onChange={set('patient_telephone')} className={CHAMP} />
        </div>
      </div>
      <div>
        <label className={ETIQUETTE} htmlFor="mod_adresse">Adresse de livraison</label>
        <input id="mod_adresse" value={form.patient_adresse} onChange={set('patient_adresse')} className={CHAMP} />
      </div>
      <div>
        <label className={ETIQUETTE} htmlFor="mod_crit">Criticité</label>
        <select id="mod_crit" value={form.criticite} onChange={set('criticite')} className={CHAMP}>
          {(Object.keys(CRITICITE_CONFIG) as Criticite[]).map(c => (
            <option key={c} value={c}>{CRITICITE_CONFIG[c].label}</option>
          ))}
        </select>
      </div>
      <div>
        <span className={ETIQUETTE}>Médicaments</span>
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          {medicaments.map((m, i) => (
            <div key={i} className="flex items-center border-b border-gray-100 last:border-b-0">
              <input
                value={m.nom}
                onChange={e => majLigne(i, 'nom', e.target.value)}
                placeholder="Nom du médicament…"
                aria-label={`Médicament ${i + 1}`}
                className="flex-1 min-w-0 text-sm px-3 py-2 outline-none bg-transparent placeholder:text-gray-300"
              />
              <input
                value={m.quantite}
                onChange={e => majLigne(i, 'quantite', e.target.value)}
                placeholder="Qté"
                aria-label={`Quantité ${i + 1}`}
                className="w-20 text-sm px-2 py-2 outline-none bg-transparent text-gray-500 text-right placeholder:text-gray-300"
              />
              {medicaments.length > 1 && (
                <button
                  type="button"
                  aria-label={`Retirer le médicament ${i + 1}`}
                  onClick={() => setMedicaments(ls => ls.filter((_, j) => j !== i))}
                  className="w-8 self-stretch text-gray-300 hover:text-red-400"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setMedicaments(ls => [...ls, { nom: '', quantite: '' }])}
            className="w-full text-left text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 px-3 py-2"
          >
            + Ajouter un médicament
          </button>
        </div>
      </div>
      <div>
        <label className={ETIQUETTE} htmlFor="mod_notes">Notes</label>
        <textarea id="mod_notes" rows={2} value={form.notes_initiales} onChange={set('notes_initiales')} className={`${CHAMP} resize-none`} />
      </div>
      {erreur && <p role="alert" className="text-[11px] text-red-600">{erreur}</p>}
      <p className="text-[10px] text-gray-400">Le bon de livraison généré sera mis à jour automatiquement.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={enregistrer}
          disabled={envoi}
          className="flex-1 text-xs font-600 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {envoi ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
        <button type="button" onClick={onAnnuler} disabled={envoi} className="text-xs font-600 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50">
          Annuler
        </button>
      </div>
    </div>
  );
}
