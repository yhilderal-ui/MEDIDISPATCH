import { Headset, Pill, Truck, type LucideIcon } from 'lucide-react';
import type { Role } from './useAuth';

// Les trois comptes (décision du 30/09 pour « Livreurs ») : libellés, icônes,
// couleurs et droits dans l'interface. La base applique les mêmes limites
// (migration 0012) : l'interface ne fait que masquer ce qui serait refusé.

export const LIBELLE_ROLE: Record<Role, string> = {
  dispatcher: 'Dispatcheur',
  pharmacie: 'Pharmacie',
  livreur: 'Livreurs',
};

export const ICONE_ROLE: Record<Role, LucideIcon> = {
  dispatcher: Headset,
  pharmacie: Pill,
  livreur: Truck,
};

export const COULEUR_ROLE: Record<Role, { fond: string; texte: string }> = {
  dispatcher: { fond: '#f3f4f6', texte: '#111827' },
  pharmacie: { fond: '#f5f3ff', texte: '#7c3aed' },
  livreur: { fond: '#ecfeff', texte: '#0e7490' },
};

export interface Droits {
  creer: boolean; // nouvelle demande
  annuler: boolean; // annuler ou réactiver une demande
  modifierInfos: boolean; // patient, médicaments, criticité, notes initiales
  supprimer: boolean; // suppression définitive d'une demande annulée
  reliquat: boolean; // créer un reliquat (livraison en deux fois)
  chat: boolean;
  statistiques: boolean;
}

export function droits(role: Role): Droits {
  return {
    creer: role === 'dispatcher',
    annuler: role !== 'livreur',
    modifierInfos: role !== 'livreur',
    supprimer: role === 'dispatcher',
    reliquat: role !== 'livreur',
    chat: role !== 'livreur',
    statistiques: role !== 'livreur',
  };
}
