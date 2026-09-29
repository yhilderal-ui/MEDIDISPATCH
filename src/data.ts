import type { Criticite, Statut, TypeDocument, TypePiece } from './types';

// Section 7 du cahier des charges.
export const CRITICITE_CONFIG: Record<Criticite, { label: string; emoji: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', emoji: '🔴', color: '#dc2626', bg: '#fef2f2' },
  standard_prioritaire: { label: 'Standard prioritaire', emoji: '🟠', color: '#ea580c', bg: '#fff7ed' },
  standard: { label: 'Standard', emoji: '🟢', color: '#16a34a', bg: '#f0fdf4' },
};

export const CRITICITE_ORDRE: Record<Criticite, number> = {
  urgent: 0,
  standard_prioritaire: 1,
  standard: 2,
};

// Section 5 : Nouvelle demande → En cours de livraison → Livrée (+ Annulée).
export const STATUT_CONFIG: Record<Statut, { label: string; court: string; color: string; emoji: string }> = {
  nouvelle: { label: 'Nouvelle demande', court: 'Nouvelle', color: '#7c3aed', emoji: '📋' },
  en_cours: { label: 'En cours de livraison', court: 'En cours', color: '#0891b2', emoji: '🚚' },
  livree: { label: 'Livrée', court: 'Livrée', color: '#059669', emoji: '✅' },
  annulee: { label: 'Annulée', court: 'Annulée', color: '#ef4444', emoji: '✕' },
};

export const DOC_CONFIG: Record<TypeDocument, { icon: string; color: string; bg: string; label: string }> = {
  ordonnance: { icon: '📄', color: '#7c3aed', bg: '#f5f3ff', label: 'Ordonnance' },
  bon_livraison: { icon: '📋', color: '#0891b2', bg: '#ecfeff', label: 'Bon de livraison' },
  preuve_livraison: { icon: '📷', color: '#059669', bg: '#f0fdf4', label: 'Preuve de livraison' },
  carte_vitale: { icon: '💳', color: '#16a34a', bg: '#f0fdf4', label: 'Carte Vitale' },
  mutuelle: { icon: '🛡️', color: '#2563eb', bg: '#eff6ff', label: 'Mutuelle' },
};

export const PIECES: TypePiece[] = ['ordonnance', 'carte_vitale', 'mutuelle', 'bon_livraison'];

export const LIBELLE_PIECE: Record<TypePiece, string> = {
  ordonnance: 'Ordonnance',
  carte_vitale: 'Carte Vitale',
  mutuelle: 'Mutuelle',
  bon_livraison: 'Bon de livraison complémentaire',
};
