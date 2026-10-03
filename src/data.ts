import type { LucideIcon } from 'lucide-react';
import { Camera, CircleCheck, CircleX, ClipboardList, CreditCard, FileText, PackageCheck, ShieldCheck, ShoppingBag, Truck, Undo2 } from 'lucide-react';
import type { Criticite, Demande, Nature, Statut, TypeDocument, TypePiece } from './types';

// Section 7 du cahier des charges.
export const CRITICITE_CONFIG: Record<Criticite, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: '#dc2626', bg: '#fef2f2' },
  standard_prioritaire: { label: 'Standard prioritaire', color: '#ea580c', bg: '#fff7ed' },
  standard: { label: 'Standard', color: '#16a34a', bg: '#f0fdf4' },
};

export const CRITICITE_ORDRE: Record<Criticite, number> = {
  urgent: 0,
  standard_prioritaire: 1,
  standard: 2,
};

// Section 5 : Nouvelle demande → En cours de livraison → Livrée (+ Annulée).
export const STATUT_CONFIG: Record<Statut, { label: string; court: string; color: string; Icone: LucideIcon }> = {
  nouvelle: { label: 'Nouvelle demande', court: 'Nouvelle', color: '#7c3aed', Icone: ClipboardList },
  en_cours: { label: 'En cours de livraison', court: 'En cours', color: '#0891b2', Icone: Truck },
  livree: { label: 'Livrée', court: 'Livrée', color: '#059669', Icone: CircleCheck },
  annulee: { label: 'Annulée', court: 'Annulée', color: '#ef4444', Icone: CircleX },
};

export const DOC_CONFIG: Record<TypeDocument, { Icone: LucideIcon; color: string; bg: string; label: string }> = {
  ordonnance: { Icone: FileText, color: '#7c3aed', bg: '#f5f3ff', label: 'Ordonnance' },
  bon_commande: { Icone: ShoppingBag, color: '#b45309', bg: '#fffbeb', label: 'Bon de commande' },
  bon_livraison: { Icone: ClipboardList, color: '#0891b2', bg: '#ecfeff', label: 'Bon de livraison' },
  preuve_livraison: { Icone: Camera, color: '#059669', bg: '#f0fdf4', label: 'Preuve de livraison' },
  carte_vitale: { Icone: CreditCard, color: '#16a34a', bg: '#f0fdf4', label: 'Carte Vitale' },
  mutuelle: { Icone: ShieldCheck, color: '#2563eb', bg: '#eff6ff', label: 'Mutuelle' },
};

export const PIECES: TypePiece[] = ['ordonnance', 'carte_vitale', 'mutuelle', 'bon_livraison'];

export const LIBELLE_PIECE: Record<TypePiece, string> = {
  ordonnance: 'Ordonnance',
  carte_vitale: 'Carte Vitale',
  mutuelle: 'Mutuelle',
  bon_livraison: 'Bon de livraison complémentaire',
};

// Livraison ou retour (décision du 03/10).
export const NATURE_CONFIG: Record<Nature, { label: string; Icone: LucideIcon; color: string; bg: string }> = {
  livraison: { label: 'Livraison', Icone: PackageCheck, color: '#0f766e', bg: '#f0fdfa' },
  retour: { label: 'Retour', Icone: Undo2, color: '#b45309', bg: '#fffbeb' },
};

// Statut tel qu'affiché : pour un retour, « En cours de récupération » puis
// « Récupéré » au lieu de « En cours de livraison » et « Livrée ».
export function statutAffiche(d: Pick<Demande, 'statut' | 'nature'>) {
  const cfg = STATUT_CONFIG[d.statut];
  if (d.nature !== 'retour') return cfg;
  if (d.statut === 'livree') return { ...cfg, label: 'Récupéré', court: 'Récupéré' };
  if (d.statut === 'en_cours') return { ...cfg, label: 'En cours de récupération' };
  return cfg;
}
