import { Headset, Network, Pill, Truck, type LucideIcon } from 'lucide-react';
import type { Role } from './useAuth';

// Les comptes (« Livreurs » le 30/09, « Logisticien » le 08/11) : libellés,
// icônes, couleurs et droits dans l'interface. La base applique les mêmes
// limites (migrations 0012 et 0016) : l'interface ne fait que masquer ce qui
// serait refusé.

export const LIBELLE_ROLE: Record<Role, string> = {
  dispatcher: 'Dispatcheur',
  pharmacie: 'Pharmacie',
  livreur: 'Livreurs',
  logisticien: 'Logisticien',
};

export const ICONE_ROLE: Record<Role, LucideIcon> = {
  dispatcher: Headset,
  pharmacie: Pill,
  livreur: Truck,
  logisticien: Network,
};

export const COULEUR_ROLE: Record<Role, { fond: string; texte: string }> = {
  dispatcher: { fond: '#f3f4f6', texte: '#111827' },
  pharmacie: { fond: '#f5f3ff', texte: '#7c3aed' },
  livreur: { fond: '#ecfeff', texte: '#0e7490' },
  logisticien: { fond: '#fff7ed', texte: '#c2410c' },
};

export interface Droits {
  creer: boolean; // nouvelle demande
  annuler: boolean; // annuler ou réactiver une demande
  modifierInfos: boolean; // patient, médicaments, criticité, notes initiales
  supprimer: boolean; // suppression définitive d'une demande annulée
  reliquat: boolean; // créer un reliquat (livraison en deux fois)
  chat: boolean;
  statistiques: boolean;
  repartir: boolean; // classer Est / Ouest et attribuer à un livreur (décision du 08/11)
  // Marquer « Livrée » directement depuis « Nouvelle », sans l'étape « En cours »
  // (décision du 09/11 : une étape de moins pour ceux qui livrent).
  livraisonDirecte: boolean;
}

export function droits(role: Role): Droits {
  return {
    creer: role === 'dispatcher',
    annuler: role !== 'livreur',
    modifierInfos: role === 'dispatcher' || role === 'pharmacie',
    supprimer: role === 'dispatcher',
    reliquat: role === 'dispatcher' || role === 'pharmacie',
    chat: role === 'dispatcher' || role === 'pharmacie',
    statistiques: role !== 'livreur',
    // Le logisticien répartit ; Florence peut le remplacer.
    repartir: role === 'logisticien' || role === 'dispatcher',
    livraisonDirecte: role === 'livreur' || role === 'logisticien',
  };
}
