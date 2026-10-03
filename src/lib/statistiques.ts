import { supabase } from './supabase';
import { ajouterJours, aujourdhuiParis, depuisJour, lundiDeLaSemaine, versJour } from './dates';

// Statistiques calculées par la base (fonction `statistiques`, migration 0010).
// Les périodes sont des jours de Paris (AAAA-MM-JJ), bornes incluses.

export type Granularite = 'day' | 'week' | 'month';
export type Preset = 'semaine' | 'mois' | 'mois_precedent' | '90_jours' | 'annee' | 'perso';

export interface Chiffres {
  creees: number;
  livrees: number;
  retours: number; // retours récupérés (migration 0013)
  reportees: number;
  annulees: number;
}

export interface Statistiques {
  chiffres: Chiffres;
  precedent: Chiffres;
  livraisons: { periode: string; nombre: number }[];
  jours_semaine: { jour: number; nombre: number }[]; // 1 = lundi … 7 = dimanche
  medicaments: { nom: string; demandes: number }[];
}

export interface Periode {
  debut: string;
  fin: string;
  precDebut: string;
  precFin: string;
  comparaison: string; // « vs mois précédent »…
}

export const PRESETS: { id: Preset; libelle: string }[] = [
  { id: 'semaine', libelle: 'Cette semaine' },
  { id: 'mois', libelle: 'Ce mois' },
  { id: 'mois_precedent', libelle: 'Mois précédent' },
  { id: '90_jours', libelle: '90 derniers jours' },
  { id: 'annee', libelle: 'Cette année' },
  { id: 'perso', libelle: 'Dates au choix' },
];

// Même jour, n mois plus tôt (le 31 mars → le 28 ou 29 février).
function moisAvant(d: Date, n: number): Date {
  const cible = new Date(d.getFullYear(), d.getMonth() - n, 1);
  const dernier = new Date(cible.getFullYear(), cible.getMonth() + 1, 0).getDate();
  cible.setDate(Math.min(d.getDate(), dernier));
  return cible;
}

export function nbJours(debut: string, fin: string): number {
  return Math.round((depuisJour(fin).getTime() - depuisJour(debut).getTime()) / 86_400_000) + 1;
}

export function calculerPeriode(preset: Preset, persoDebut: string, persoFin: string): Periode {
  const aujourdhui = depuisJour(aujourdhuiParis());
  const j = versJour;

  switch (preset) {
    case 'semaine': {
      const lundi = lundiDeLaSemaine(aujourdhui);
      return {
        debut: j(lundi), fin: j(aujourdhui),
        precDebut: j(ajouterJours(lundi, -7)), precFin: j(ajouterJours(aujourdhui, -7)),
        comparaison: 'vs semaine précédente',
      };
    }
    case 'mois': {
      const premier = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
      return {
        debut: j(premier), fin: j(aujourdhui),
        precDebut: j(moisAvant(premier, 1)), precFin: j(moisAvant(aujourdhui, 1)),
        comparaison: 'vs mois précédent',
      };
    }
    case 'mois_precedent': {
      const premier = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1);
      const dernier = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 0);
      return {
        debut: j(premier), fin: j(dernier),
        precDebut: j(new Date(premier.getFullYear(), premier.getMonth() - 1, 1)),
        precFin: j(new Date(premier.getFullYear(), premier.getMonth(), 0)),
        comparaison: 'vs le mois d’avant',
      };
    }
    case '90_jours':
      return {
        debut: j(ajouterJours(aujourdhui, -89)), fin: j(aujourdhui),
        precDebut: j(ajouterJours(aujourdhui, -179)), precFin: j(ajouterJours(aujourdhui, -90)),
        comparaison: 'vs 90 jours précédents',
      };
    case 'annee': {
      const premier = new Date(aujourdhui.getFullYear(), 0, 1);
      return {
        debut: j(premier), fin: j(aujourdhui),
        precDebut: j(new Date(premier.getFullYear() - 1, 0, 1)), precFin: j(moisAvant(aujourdhui, 12)),
        comparaison: 'vs même période l’an dernier',
      };
    }
    case 'perso': {
      const n = nbJours(persoDebut, persoFin);
      return {
        debut: persoDebut, fin: persoFin,
        precDebut: j(ajouterJours(depuisJour(persoDebut), -n)), precFin: j(ajouterJours(depuisJour(persoDebut), -1)),
        comparaison: `vs ${n} jour${n > 1 ? 's' : ''} précédent${n > 1 ? 's' : ''}`,
      };
    }
  }
}

// Au-delà de 62 jours, une colonne par jour devient illisible.
export const JOURS_MAX_PAR_JOUR = 62;

export function granulariteParDefaut(p: Periode): Granularite {
  const n = nbJours(p.debut, p.fin);
  return n <= 31 ? 'day' : n <= 184 ? 'week' : 'month';
}

export async function chargerStatistiques(p: Periode, granularite: Granularite): Promise<Statistiques> {
  const { data, error } = await supabase.rpc('statistiques', {
    p_debut: p.debut,
    p_fin: p.fin,
    p_prec_debut: p.precDebut,
    p_prec_fin: p.precFin,
    p_granularite: granularite,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Période invalide.');
  return data as Statistiques;
}
