import { useEffect, useState } from 'react';
import type { EvenementHistorique, Nature, Statut } from '../types';
import { statutAffiche, STATUT_CONFIG } from '../data';
import { formatHorodatage, formatJour } from '../lib/dates';
import { listerHistorique, messageErreur } from '../lib/demandes';

interface Props {
  demandeId: string;
  // Change à chaque mise à jour de la carte : on recharge alors l'historique.
  version: string;
  nature: Nature; // un retour terminé s'affiche « Récupéré »
}

function libelleStatut(s: string | null, nature: Nature) {
  return s && s in STATUT_CONFIG ? statutAffiche({ statut: s as Statut, nature }).label : s ?? '';
}

function decrire(e: EvenementHistorique, nature: Nature): string {
  switch (e.evenement) {
    case 'creation':
      return nature === 'retour' ? 'Retour créé' : 'Demande créée';
    case 'statut':
      return `Statut : ${libelleStatut(e.ancienne_valeur, nature)} → ${libelleStatut(e.nouvelle_valeur, nature)}`;
    case 'report':
      return `Report : ${e.ancienne_valeur ? formatJour(e.ancienne_valeur) : '?'} → ${e.nouvelle_valeur ? formatJour(e.nouvelle_valeur) : '?'}`;
    case 'modification':
      return e.nouvelle_valeur ? `Modification : ${e.nouvelle_valeur}` : 'Modification des informations';
  }
}

// Traçabilité (cahier des charges, section 9) : qui a fait quoi, et quand.
export default function HistoriqueDemande({ demandeId, version, nature }: Props) {
  const [evenements, setEvenements] = useState<EvenementHistorique[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    listerHistorique(demandeId)
      .then(h => actif && setEvenements(h))
      .catch(e => actif && setErreur(messageErreur(e)));
    return () => {
      actif = false;
    };
  }, [demandeId, version]);

  if (erreur) return <p className="text-[11px] text-red-600">{erreur}</p>;

  return (
    <ol className="relative border-l border-gray-200 ml-1.5 space-y-3">
      {evenements.map(e => (
        <li key={e.id} className="pl-4 relative">
          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white" aria-hidden />
          <p className="text-xs text-gray-700">{decrire(e, nature)}</p>
          <p className="text-[10px] text-gray-400 font-mono">
            {formatHorodatage(e.cree_le)} · {e.auteur_nom}
          </p>
        </li>
      ))}
    </ol>
  );
}
