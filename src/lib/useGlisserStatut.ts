import { useState } from 'react';
import type { DragEvent } from 'react';
import type { Demande, Statut } from '../types';

// Glisser-déposer d'une carte d'une colonne de statut à la suivante (décision
// du 03/10). Seules les étapes des boutons de la fiche sont permises :
// Nouvelle → En cours → Livrée. Sur ordinateur seulement : sur téléphone, les
// colonnes sont des onglets et les boutons de la fiche restent le moyen normal.
export const ETAPE_SUIVANTE: Partial<Record<Statut, Statut>> = {
  nouvelle: 'en_cours',
  en_cours: 'livree',
};

export function useGlisserStatut(onDeposer?: (demande: Demande, statut: Statut) => void) {
  const [glisse, setGlisse] = useState<Demande | null>(null);
  const [survol, setSurvol] = useState<Statut | null>(null);

  const finir = () => {
    setGlisse(null);
    setSurvol(null);
  };

  // Propriétés à poser sur l'élément qui entoure une carte.
  const carte = (d: Demande) =>
    onDeposer && ETAPE_SUIVANTE[d.statut]
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', d.numero_ticket);
            setGlisse(d);
          },
          onDragEnd: finir,
        }
      : {};

  // État et propriétés d'une colonne : `possible` si la carte en cours de
  // déplacement peut y être déposée, `survolee` si elle est juste au-dessus.
  const colonne = (statut: Statut) => {
    const possible = !!glisse && ETAPE_SUIVANTE[glisse.statut] === statut;
    return {
      possible,
      survolee: possible && survol === statut,
      props: {
        onDragOver: (e: DragEvent) => {
          if (!possible) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (survol !== statut) setSurvol(statut);
        },
        onDragLeave: (e: DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol(null);
        },
        onDrop: (e: DragEvent) => {
          if (!possible || !glisse) return;
          e.preventDefault();
          onDeposer?.(glisse, statut);
          finir();
        },
      },
    };
  };

  return { glisse, carte, colonne };
}
