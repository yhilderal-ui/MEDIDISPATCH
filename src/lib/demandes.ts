import { supabase } from './supabase';
import type { Demande, DocumentJoint, NouvelleDemande, Note, Statut, TypeDocument } from '../types';

// Toutes les lectures et écritures des demandes passent par ce fichier.
// Les règles (date, preuve de livraison, droits) sont vérifiées par la base ;
// ici on traduit ses refus en messages compréhensibles.

const AVEC_DOCUMENTS = '*, documents(*)';

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

export async function listerDemandes(): Promise<Demande[]> {
  const { data, error } = await supabase
    .from('demandes')
    .select(AVEC_DOCUMENTS)
    .is('archivee_le', null)
    .order('jour_livraison', { ascending: true })
    .order('cree_le', { ascending: false });
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

// Crée la demande puis envoie le bon de livraison. Si l'envoi du fichier
// échoue, la demande est quand même enregistrée (rien ne se perd) et on
// renvoie l'erreur pour que l'utilisateur ajoute le fichier ensuite.
export async function creerDemande(
  demande: NouvelleDemande,
  bonLivraison: File,
): Promise<{ numeroTicket: string; erreurFichier: string | null }> {
  const { data, error } = await supabase.from('demandes').insert(demande).select('id, numero_ticket').single();
  if (error) echouer(error);
  try {
    await deposerDocument(data.id, 'bon_livraison', bonLivraison);
    return { numeroTicket: data.numero_ticket, erreurFichier: null };
  } catch (e) {
    return { numeroTicket: data.numero_ticket, erreurFichier: (e as Error).message };
  }
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

// Temps réel : la base prévient à chaque changement ; on recharge alors la liste.
export function surveillerDemandes(auChangement: () => void): () => void {
  const canal = supabase
    .channel('demandes-et-documents')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, auChangement)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, auChangement)
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
