import type { Demande } from '../types';
import type { Role } from './useAuth';
import { droits } from './roles';

// Sélection de plusieurs cartes (décision du 04/11) : en mode sélection, un
// clic sur une carte la coche au lieu d'ouvrir sa fiche.
export interface Selection {
  actif: boolean;
  ids: ReadonlySet<string>;
  basculer: (id: string) => void;
  // Coche tout le groupe, ou le décoche s'il l'est déjà en entier.
  basculerGroupe: (ids: string[]) => void;
}

export type ActionGroupee = 'en_cours' | 'livree' | 'reporter' | 'archiver' | 'annuler' | 'supprimer';

// Mêmes règles que les boutons de la fiche, appliquées carte par carte ; les
// actions réservées sont limitées aux comptes qui y ont droit.
export function actionPossible(action: ActionGroupee, d: Demande, role: Role): boolean {
  const peut = droits(role);
  const active = d.statut === 'nouvelle' || d.statut === 'en_cours';
  switch (action) {
    case 'en_cours':
      return d.statut === 'nouvelle';
    case 'livree':
      return d.statut === 'en_cours';
    case 'reporter':
      return role !== 'livreur' && active;
    case 'archiver':
      return role !== 'livreur' && d.statut === 'livree' && !d.archivee_le;
    case 'annuler':
      return peut.annuler && active;
    case 'supprimer':
      return peut.supprimer && d.statut === 'annulee';
  }
}

// Actions affichées pour un compte, dans l'ordre de la barre.
export function actionsDuRole(role: Role): ActionGroupee[] {
  const toutes: ActionGroupee[] = ['en_cours', 'livree', 'reporter', 'archiver', 'annuler', 'supprimer'];
  const peut = droits(role);
  return toutes.filter(a =>
    a === 'reporter' || a === 'archiver' ? role !== 'livreur' : a === 'annuler' ? peut.annuler : a === 'supprimer' ? peut.supprimer : true,
  );
}
