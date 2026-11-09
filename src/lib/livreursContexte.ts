import { createContext, useContext } from 'react';
import type { Livreur } from '../types';

// Liste des livreurs, partagée par toute l'application (étiquettes des cartes,
// filtres, répartition) sans la passer de composant en composant.
export const LivreursContexte = createContext<Livreur[]>([]);

export function useLivreurs(): Livreur[] {
  return useContext(LivreursContexte);
}

export function nomLivreur(livreurs: Livreur[], id: string | null): string | null {
  return id ? (livreurs.find(l => l.id === id)?.nom ?? null) : null;
}
