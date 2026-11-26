import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Role } from './useAuth';

// Assistant d'aide (décision du 12/11) : la fonction « assistant » (Edge
// Function Supabase) répond aux questions sur l'utilisation de l'application.
// Elle ne reçoit ni demande ni donnée patient ; la conversation n'est gardée
// qu'en mémoire, dans l'onglet.

export interface MessageAssistant {
  role: 'user' | 'assistant';
  texte: string;
}

// Questions proposées à l'ouverture, selon le compte.
export const SUGGESTIONS: Record<Role, string[]> = {
  dispatcher: [
    'Comment livrer une commande en deux fois ?',
    'Comment supprimer une demande annulée ?',
    'Comment reporter plusieurs demandes d’un coup ?',
  ],
  pharmacie: [
    'Comment répartir les livraisons du jour ?',
    'Comment faire signer le patient ?',
    'Comment créer un reliquat ?',
  ],
  livreur: [
    'Comment choisir mon prénom ?',
    'Comment faire signer le patient ?',
    'Le patient est absent, que faire ?',
  ],
  logisticien: [
    'Comment répartir les livraisons du jour ?',
    'Comment ajouter un livreur ?',
    'Comment voir ma tournée ?',
  ],
};

// Envoie la question avec les derniers échanges ; renvoie la réponse, ou
// lève une Error dont le message est prêt à être affiché.
export async function demanderAssistant(question: string, historique: MessageAssistant[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke('assistant', {
    body: { question, historique: historique.slice(-12) },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const reponse = error.context as Response;
      let message: string | undefined;
      try {
        message = (await reponse.json())?.message;
      } catch {
        // corps vide ou non JSON
      }
      if (reponse.status === 404) throw new Error("L'assistant n'est pas encore installé. Prévenez l'administratrice.");
      throw new Error(message ?? "L'assistant est momentanément indisponible. Réessayez dans un instant.");
    }
    throw new Error("Impossible de joindre l'assistant. Vérifiez la connexion internet.");
  }
  const texte = typeof data?.reponse === 'string' ? data.reponse.trim() : '';
  if (!texte) throw new Error("L'assistant n'a pas répondu. Réessayez dans un instant.");
  return texte;
}
