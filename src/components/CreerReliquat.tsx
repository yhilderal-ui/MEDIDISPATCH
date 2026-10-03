import { useState } from 'react';
import { Split } from 'lucide-react';
import type { Demande, Medicament } from '../types';
import { aujourdhuiParis, erreurJourLivraison } from '../lib/dates';

interface Props {
  demande: Demande;
  onAnnuler: () => void;
  onEnregistrer: (restants: Medicament[], reliquat: Medicament[], jour: string) => Promise<boolean>;
}

// Pour chaque médicament : tout part maintenant, tout part plus tard, ou la
// quantité est partagée entre les deux livraisons.
type Choix = 'maintenant' | 'plus_tard' | 'partage';

interface Ligne {
  choix: Choix;
  maintenant: string;
  plusTard: string;
}

const CHOIX: [Choix, string][] = [
  ['maintenant', 'Maintenant'],
  ['plus_tard', 'Plus tard'],
  ['partage', 'Partagé'],
];

const CHAMP = 'w-full text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-sky-400';

// Reliquat (décision du 03/10) : la carte garde ce qui part maintenant, une
// carte liée « Reliquat de … » est créée pour le reste, au jour choisi.
export default function CreerReliquat({ demande, onAnnuler, onEnregistrer }: Props) {
  const [lignes, setLignes] = useState<Ligne[]>(
    demande.medicaments.map(m => ({ choix: 'maintenant', maintenant: m.quantite, plusTard: '' })),
  );
  const [jour, setJour] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const maj = (i: number, champs: Partial<Ligne>) => setLignes(ls => ls.map((l, j) => (j === i ? { ...l, ...champs } : l)));

  const enregistrer = async () => {
    const restants: Medicament[] = [];
    const reliquat: Medicament[] = [];
    for (const [i, l] of lignes.entries()) {
      const nom = demande.medicaments[i].nom;
      if (l.choix === 'maintenant') restants.push({ nom, quantite: l.maintenant.trim() });
      if (l.choix === 'plus_tard') reliquat.push({ nom, quantite: demande.medicaments[i].quantite });
      if (l.choix === 'partage') {
        if (!l.maintenant.trim() || !l.plusTard.trim()) {
          setErreur(`« ${nom} » est partagé : indiquez la quantité livrée maintenant et celle livrée plus tard.`);
          return;
        }
        restants.push({ nom, quantite: l.maintenant.trim() });
        reliquat.push({ nom, quantite: l.plusTard.trim() });
      }
    }
    const probleme =
      (reliquat.length === 0 && 'Rien ne part plus tard : choisissez « Plus tard » ou « Partagé » pour au moins un médicament.') ||
      (restants.length === 0 && 'Tout part plus tard : reportez plutôt la demande (bouton « Reporter »).') ||
      erreurJourLivraison(jour);
    if (probleme) {
      setErreur(probleme);
      return;
    }
    setErreur(null);
    setEnvoi(true);
    const ok = await onEnregistrer(restants, reliquat, jour);
    setEnvoi(false);
    if (ok) onAnnuler();
  };

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-3 space-y-3">
      <div>
        <p className="text-sm font-700 text-sky-900 flex items-center gap-1.5">
          <Split size={15} aria-hidden /> Créer un reliquat
        </p>
        <p className="text-[11px] text-sky-800/80 mt-0.5">
          Indiquez ce qui part maintenant et ce qui sera livré plus tard. Une carte « Reliquat de {demande.numero_ticket} » sera
          créée pour le reste, avec ses propres bons.
        </p>
      </div>

      <div className="space-y-2">
        {demande.medicaments.map((m, i) => {
          const l = lignes[i];
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-2.5">
              <p className="text-xs font-600 text-gray-800 leading-snug">
                {m.nom}
                {m.quantite && <span className="font-400 text-gray-400"> — {m.quantite}</span>}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1 bg-gray-100 p-0.5 rounded-lg" role="radiogroup" aria-label={`Livraison de ${m.nom}`}>
                {CHOIX.map(([c, libelle]) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={l.choix === c}
                    onClick={() => maj(i, { choix: c })}
                    className={`text-[11px] font-600 py-1.5 rounded-md transition-all ${l.choix === c ? 'bg-white text-sky-800 shadow-sm' : 'text-gray-500'}`}
                  >
                    {libelle}
                  </button>
                ))}
              </div>
              {l.choix === 'partage' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-gray-500">
                    Maintenant
                    <input value={l.maintenant} onChange={e => maj(i, { maintenant: e.target.value })} placeholder="ex. 2 boîtes" className={CHAMP} />
                  </label>
                  <label className="text-[10px] text-gray-500">
                    Plus tard
                    <input value={l.plusTard} onChange={e => maj(i, { plusTard: e.target.value })} placeholder="ex. 2 boîtes" className={CHAMP} />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <label className="block text-[10px] font-600 uppercase tracking-widest text-gray-500">
        Livraison du reliquat
        <input type="date" value={jour} min={aujourdhuiParis()} onChange={e => setJour(e.target.value)} className={`${CHAMP} mt-1 text-sm py-2`} />
      </label>

      {erreur && (
        <p role="alert" className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
          {erreur}
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onAnnuler} className="flex-1 text-xs font-600 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
          Annuler
        </button>
        <button
          type="button"
          onClick={enregistrer}
          disabled={envoi}
          className="flex-1 text-xs font-600 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white disabled:opacity-50"
        >
          {envoi ? 'Création…' : 'Créer le reliquat'}
        </button>
      </div>
    </section>
  );
}
