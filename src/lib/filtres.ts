import type { Criticite, Demande, Statut } from '../types';
import { ajouterJours, aujourdhuiParis, depuisJour, lundiDeLaSemaine, versJour } from './dates';

// Recherche et filtres communs aux deux rôles (cahier des charges, section 7bis).

export type FiltreDate = 'toutes' | 'aujourdhui' | 'demain' | 'semaine' | 'jour';

export interface Filtres {
  recherche: string;
  statut: Statut | 'tous';
  criticite: Criticite | 'toutes';
  date: FiltreDate;
  jour: string; // utilisé quand date === 'jour'
}

export const FILTRES_VIDES: Filtres = { recherche: '', statut: 'tous', criticite: 'toutes', date: 'toutes', jour: '' };

export function filtresActifs(f: Filtres): boolean {
  return f.recherche.trim() !== '' || f.statut !== 'tous' || f.criticite !== 'toutes' || f.date !== 'toutes';
}

// Enlève les accents et la casse : « Hélène » se trouve en tapant « helene ».
function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function correspondDate(jourLivraison: string, f: Filtres): boolean {
  const aujourdhui = aujourdhuiParis();
  switch (f.date) {
    case 'toutes':
      return true;
    case 'aujourdhui':
      return jourLivraison === aujourdhui;
    case 'demain':
      return jourLivraison === versJour(ajouterJours(depuisJour(aujourdhui), 1));
    case 'semaine': {
      const lundi = lundiDeLaSemaine(depuisJour(aujourdhui));
      return jourLivraison >= versJour(lundi) && jourLivraison <= versJour(ajouterJours(lundi, 6));
    }
    case 'jour':
      return !f.jour || jourLivraison === f.jour;
  }
}

export function appliquerFiltres(demandes: Demande[], f: Filtres): Demande[] {
  const q = normaliser(f.recherche.trim());
  return demandes.filter(
    d =>
      (!q || normaliser(d.patient_nom).includes(q) || normaliser(d.numero_ticket).includes(q)) &&
      (f.statut === 'tous' || d.statut === f.statut) &&
      (f.criticite === 'toutes' || d.criticite === f.criticite) &&
      correspondDate(d.jour_livraison, f),
  );
}
