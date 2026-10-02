import { supabase } from './supabase';
import { minuitParisISO } from './dates';
import type { Demande, DocumentJoint, EtatVu, EvenementHistorique, ModificationDemande, NouvelleDemande, Note, Pieces, Statut, TypeDocument, TypePiece } from '../types';

// Toutes les lectures et écritures des demandes passent par ce fichier.
// Les règles (date, preuve de livraison, droits) sont vérifiées par la base ;
// ici on traduit ses refus en messages compréhensibles.

const AVEC_DOCUMENTS = '*, documents(*), lectures_demandes(utilisateur_id, vu_le)';

export const TYPES_FICHIERS_ACCEPTES = ['application/pdf', 'image/jpeg', 'image/png'];
export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;

interface ErreurSupabase {
  message: string;
  code?: string;
}

export function messageErreur(err: unknown): string {
  const e = err as ErreurSupabase;
  const msg = e?.message ?? String(err);
  if (msg.includes('demandes_jour_livraison_check')) return 'Pas de livraison le dimanche : choisissez un autre jour.';
  if (msg.includes('demandes_medicaments_check')) return 'Ajoutez au moins un médicament, avec son nom.';
  if (msg.includes('documents_type_mime_check')) return 'Format de fichier refusé : PDF, JPEG ou PNG uniquement.';
  if (msg.includes('documents_taille_octets_check')) return 'Fichier trop lourd : 10 Mo maximum.';
  if (msg.includes('row-level security')) return "Action refusée : votre compte n'a pas les droits nécessaires.";
  if (msg.toLowerCase().includes('failed to fetch')) return 'Connexion au serveur impossible. Vérifiez votre accès internet.';
  // Les règles écrites dans la base renvoient déjà un message en français.
  return msg;
}

function echouer(err: unknown): never {
  throw new Error(messageErreur(err));
}

export function erreurFichier(fichier: File): string | null {
  if (!TYPES_FICHIERS_ACCEPTES.includes(fichier.type)) return 'Format refusé : PDF, JPEG ou PNG uniquement.';
  if (fichier.size > TAILLE_MAX_OCTETS) return 'Fichier trop lourd : 10 Mo maximum.';
  if (fichier.size === 0) return 'Ce fichier est vide.';
  return null;
}

// Décision du 29/09 (révisée) : une demande livrée reste dans le tableau le
// jour de sa livraison, puis bascule dans les Archives à minuit (heure de
// Paris). On peut aussi l'archiver tout de suite (bouton « Archiver maintenant »).

// Tableau actif : tout sauf les demandes archivées à la main, et les livrées
// avant aujourd'hui.
export async function listerDemandes(): Promise<Demande[]> {
  const { data, error } = await supabase
    .from('demandes')
    .select(AVEC_DOCUMENTS)
    .is('archivee_le', null)
    .or(`statut.neq.livree,livree_le.gte."${minuitParisISO()}",livree_le.is.null`)
    .order('jour_livraison', { ascending: true })
    .order('cree_le', { ascending: false });
  if (error) echouer(error);
  return (data ?? []) as Demande[];
}

// Option B (décision du 29/09) : la vue Archives montre les 30 derniers jours ;
// les demandes plus anciennes restent en base et se retrouvent par la recherche.
export const JOURS_ARCHIVES_AFFICHES = 30;

export async function listerArchives(): Promise<Demande[]> {
  const depuis = new Date(Date.now() - JOURS_ARCHIVES_AFFICHES * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('demandes')
    .select(AVEC_DOCUMENTS)
    .eq('statut', 'livree')
    .or(`archivee_le.not.is.null,livree_le.lt."${minuitParisISO()}"`)
    .gte('livree_le', depuis)
    .order('livree_le', { ascending: false })
    .limit(1000);
  if (error) echouer(error);
  return (data ?? []) as Demande[];
}

// Recherche dans TOUTES les archives, sans limite de date, faite par la base
// (sans tenir compte des accents) : voir la migration 0009.
export async function rechercherArchives(recherche: string): Promise<Demande[]> {
  const { data, error } = await supabase
    .rpc('rechercher_archives', { p_recherche: recherche, p_minuit: minuitParisISO() })
    .select(AVEC_DOCUMENTS);
  if (error) echouer(error);
  return (data ?? []) as Demande[];
}

export async function deposerDocument(demandeId: string, type: TypeDocument, fichier: File): Promise<DocumentJoint> {
  const refus = erreurFichier(fichier);
  if (refus) throw new Error(refus);

  const extension = fichier.type === 'application/pdf' ? 'pdf' : fichier.type === 'image/png' ? 'png' : 'jpg';
  const chemin = `${demandeId}/${type}-${crypto.randomUUID()}.${extension}`;

  const envoi = await supabase.storage
    .from('documents')
    .upload(chemin, fichier, { contentType: fichier.type, upsert: false });
  if (envoi.error) echouer(envoi.error);

  const { data, error } = await supabase
    .from('documents')
    .insert({
      demande_id: demandeId,
      type,
      chemin_fichier: chemin,
      nom_fichier: fichier.name,
      taille_octets: fichier.size,
      type_mime: fichier.type,
    })
    .select()
    .single();
  if (error) echouer(error);
  return data as DocumentJoint;
}

// Crée la demande puis envoie les pièces jointes. Si l'envoi d'un fichier
// échoue, la demande est quand même enregistrée (rien ne se perd) et on
// renvoie les erreurs pour que l'utilisateur ajoute les fichiers ensuite.
// Les bons PDF générés (commande et livraison) sont produits ensuite (voir bonsGeneres.ts).
export async function creerDemande(
  demande: NouvelleDemande,
  pieces: Pieces,
): Promise<{ id: string; numeroTicket: string; erreursFichiers: string[] }> {
  const { data, error } = await supabase.from('demandes').insert(demande).select('id, numero_ticket').single();
  if (error) echouer(error);
  const erreursFichiers: string[] = [];
  for (const [type, fichier] of Object.entries(pieces) as [TypePiece, File][]) {
    try {
      await deposerDocument(data.id, type, fichier);
    } catch (e) {
      erreursFichiers.push(`${fichier.name} : ${(e as Error).message}`);
    }
  }
  return { id: data.id as string, numeroTicket: data.numero_ticket as string, erreursFichiers };
}

// Étape 6 : corriger les informations d'une demande (les deux rôles).
export async function modifierDemande(id: string, champs: ModificationDemande): Promise<void> {
  const { error } = await supabase.from('demandes').update(champs).eq('id', id);
  if (error) echouer(error);
}

export async function listerHistorique(demandeId: string): Promise<EvenementHistorique[]> {
  const { data, error } = await supabase
    .from('historique')
    .select('id, evenement, ancienne_valeur, nouvelle_valeur, cree_le, profils(nom)')
    .eq('demande_id', demandeId)
    .order('cree_le', { ascending: true });
  if (error) echouer(error);
  return (data ?? []).map(h => {
    const p = h.profils as unknown as { nom: string } | null;
    return { ...h, auteur_nom: p?.nom ?? '—' } as EvenementHistorique;
  });
}

export async function changerStatut(id: string, statut: Statut): Promise<void> {
  const { error } = await supabase.from('demandes').update({ statut }).eq('id', id);
  if (error) echouer(error);
}

export async function reporter(id: string, jour: string): Promise<void> {
  const { error } = await supabase.from('demandes').update({ jour_livraison: jour }).eq('id', id);
  if (error) echouer(error);
}

// Les fichiers sont privés : on génère un lien temporaire (5 minutes).
export async function lienDocument(chemin: string): Promise<string> {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(chemin, 300);
  if (error) echouer(error);
  return data.signedUrl;
}

export async function listerNotes(demandeId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, contenu, cree_le, profils(nom)')
    .eq('demande_id', demandeId)
    .order('cree_le', { ascending: true });
  if (error) echouer(error);
  return (data ?? []).map(n => {
    const profil = n.profils as unknown as { nom: string } | null;
    return { id: n.id, contenu: n.contenu, cree_le: n.cree_le, auteur_nom: profil?.nom ?? '—' };
  });
}

export async function ajouterNote(demandeId: string, contenu: string): Promise<void> {
  const { error } = await supabase.from('notes').insert({ demande_id: demandeId, contenu });
  if (error) echouer(error);
}

// Archivage manuel d'une demande livrée (les deux comptes).
export async function archiverDemande(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('demandes')
    .update({ archivee_le: new Date().toISOString() })
    .eq('id', id)
    .eq('statut', 'livree')
    .select('id');
  if (error) echouer(error);
  if (!data || data.length === 0) throw new Error('Seule une demande livrée peut être archivée.');
}

// Vu / non vu, du point de vue de l'utilisateur connecté.
export function etatVu(demande: Demande, utilisateurId: string): EtatVu {
  if (demande.derniere_activite_par === utilisateurId) return null;
  const maLecture = demande.lectures_demandes.find(l => l.utilisateur_id === utilisateurId);
  if (!maLecture) return 'nouvelle';
  return maLecture.vu_le < demande.derniere_activite_le ? 'maj' : null;
}

export async function marquerVue(demandeId: string): Promise<void> {
  const { error } = await supabase.rpc('marquer_demande_vue', { p_demande_id: demandeId });
  if (error) echouer(error);
}

// Suppression définitive (Dispatcheur, demande annulée uniquement : la base
// refuse sinon). On supprime d'abord la carte, puis ses fichiers.
export async function supprimerDemande(demande: Demande): Promise<void> {
  const { data, error } = await supabase.from('demandes').delete().eq('id', demande.id).select('id');
  if (error) echouer(error);
  if (!data || data.length === 0) {
    throw new Error('Suppression refusée : seule une demande annulée peut être supprimée, par le compte Dispatcheur.');
  }
  const chemins = demande.documents.map(d => d.chemin_fichier);
  if (chemins.length > 0) {
    // Si cette étape échoue, il ne reste que des fichiers privés orphelins, sans conséquence.
    await supabase.storage.from('documents').remove(chemins);
  }
}

// Temps réel : la base prévient à chaque changement ; on recharge alors la liste.
export function surveillerDemandes(auChangement: () => void): () => void {
  const canal = supabase
    .channel('demandes-et-documents')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, auChangement)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, auChangement)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lectures_demandes' }, auChangement)
    .subscribe();
  return () => {
    supabase.removeChannel(canal);
  };
}

export function surveillerNotes(demandeId: string, auChangement: () => void): () => void {
  const canal = supabase
    .channel(`notes-${demandeId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes', filter: `demande_id=eq.${demandeId}` }, auChangement)
    .subscribe();
  return () => {
    supabase.removeChannel(canal);
  };
}
