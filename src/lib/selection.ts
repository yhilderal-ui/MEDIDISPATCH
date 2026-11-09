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

export type ActionGroupee =
  | 'livree'
  | 'reporter'
  | 'archiver'
  | 'annuler'
  | 'supprimer'
  | 'secteur_est'
  | 'secteur_ouest'
  | 'attribuer'; // les trois dernières : répartition (décision du 08/11)

// Mêmes règles que les boutons de la fiche, appliquées carte par carte ; les
// actions réservées sont limitées aux comptes qui y ont droit.
export function actionPossible(action: ActionGroupee, d: Demande, role: Role): boolean {
  const peut = droits(role);
  const active = d.statut === 'nouvelle' || d.statut === 'en_cours';
  switch (action) {
    case 'livree':
      return active; // « En cours » n'existe plus (09/11) : Nouvelle → Livrée
    case 'reporter':
      return role !== 'livreur' && active;
    case 'archiver':
      return role !== 'livreur' && d.statut === 'livree' && !d.archivee_le;
    case 'annuler':
      return peut.annuler && active;
    case 'supprimer':
      return peut.supprimer && d.statut === 'annulee';
    case 'secteur_est':
      return peut.repartir && d.statut !== 'annulee' && d.secteur !== 'est';
    case 'secteur_ouest':
      return peut.repartir && d.statut !== 'annulee' && d.secteur !== 'ouest';
    case 'attribuer':
      return peut.repartir && d.statut !== 'annulee';
  }
}

// Actions affichées pour un compte, dans l'ordre de la barre.
export function actionsDuRole(role: Role): ActionGroupee[] {
  const toutes: ActionGroupee[] = ['secteur_est', 'secteur_ouest', 'attribuer', 'livree', 'reporter', 'archiver', 'annuler', 'supprimer'];
  const peut = droits(role);
  return toutes.filter(a => {
    switch (a) {
      case 'reporter':
      case 'archiver':
        return role !== 'livreur';
      case 'annuler':
        return peut.annuler;
      case 'supprimer':
        return peut.supprimer;
      case 'secteur_est':
      case 'secteur_ouest':
      case 'attribuer':
        return peut.repartir;
      default:
        return true;
    }
  });
}
