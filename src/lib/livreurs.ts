import { supabase } from './supabase';
import { echouer } from './demandes';
import type { Livreur, Secteur } from '../types';

// Livreurs, secteurs Est / Ouest et attribution (décision du 08/11,
// migration 0016). Classer et attribuer : logisticien et Florence.

export const SECTEURS: Record<Secteur, { label: string; color: string; bg: string }> = {
  est: { label: 'Est', color: '#b45309', bg: '#fffbeb' },
  ouest: { label: 'Ouest', color: '#1d4ed8', bg: '#eff6ff' },
};

export async function listerLivreurs(): Promise<Livreur[]> {
  const { data, error } = await supabase.from('livreurs').select('id, nom, actif, ordre').order('ordre').order('nom');
  if (error) echouer(error);
  return (data ?? []) as Livreur[];
}

export async function ajouterLivreur(nom: string, ordre: number): Promise<void> {
  const { error } = await supabase.from('livreurs').insert({ nom: nom.trim(), ordre });
  if (error) echouer(error);
}

export async function modifierLivreur(id: string, champs: Partial<Pick<Livreur, 'nom' | 'actif'>>): Promise<void> {
  const { error } = await supabase.from('livreurs').update(champs).eq('id', id);
  if (error) echouer(error);
}

// Secteur et/ou livreur d'une demande ; null pour retirer.
export async function repartir(id: string, champs: { secteur?: Secteur | null; livreur_id?: string | null }): Promise<void> {
  const { error } = await supabase.from('demandes').update(champs).eq('id', id);
  if (error) echouer(error);
}

// Prénom choisi sur ce téléphone par le compte partagé « Livreurs ».
// Mémorisé sur l'appareil seulement ; sans stockage, la question est reposée.
const CLE = 'medidispatch.livreur';
export function lirePrenomChoisi(): string | null {
  try {
    return localStorage.getItem(CLE);
  } catch {
    return null;
  }
}
export function memoriserPrenomChoisi(id: string | null) {
  try {
    if (id) localStorage.setItem(CLE, id);
    else localStorage.removeItem(CLE);
  } catch {
    // stockage indisponible (navigation privée) : rien à faire
  }
}
