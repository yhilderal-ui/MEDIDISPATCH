import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { messageErreur } from './demandes';
import type { MessageChat } from '../types';

// Chat global unique entre les deux comptes (cahier des charges, section 6).

const LIMITE = 300;

async function listerMessages(): Promise<MessageChat[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, contenu, cree_le, auteur, profils(nom, role)')
    .order('cree_le', { ascending: false })
    .limit(LIMITE);
  if (error) throw new Error(messageErreur(error));
  return (data ?? [])
    .map(m => {
      const p = m.profils as unknown as { nom: string; role: MessageChat['auteur_role'] } | null;
      return {
        id: m.id,
        contenu: m.contenu,
        cree_le: m.cree_le,
        auteur: m.auteur,
        auteur_nom: p?.nom ?? '—',
        auteur_role: p?.role ?? 'dispatcheur',
      };
    })
    .reverse();
}

async function listerLectures(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('lectures_chat').select('utilisateur_id, vu_jusqu_au');
  if (error) throw new Error(messageErreur(error));
  return Object.fromEntries((data ?? []).map(l => [l.utilisateur_id, l.vu_jusqu_au]));
}

export function useChat(utilisateurId: string | null) {
  const [messages, setMessages] = useState<MessageChat[]>([]);
  const [lectures, setLectures] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  // Vrai une fois l'historique chargé : sert à ne pas alerter pour les anciens messages.
  const [charge, setCharge] = useState(false);

  const recharger = useCallback(async () => {
    try {
      const [m, l] = await Promise.all([listerMessages(), listerLectures()]);
      setMessages(m);
      setLectures(l);
      setErreur(null);
      setCharge(true);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!utilisateurId) return;
    recharger();
    const canal = supabase
      .channel('chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, recharger)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lectures_chat' }, recharger)
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [utilisateurId, recharger]);

  const envoyer = async (contenu: string): Promise<string | null> => {
    const { error } = await supabase.from('messages').insert({ contenu });
    if (error) return messageErreur(error);
    await recharger();
    return null;
  };

  const marquerLu = useCallback(async () => {
    const { error } = await supabase.rpc('marquer_chat_lu');
    if (!error) await recharger();
  }, [recharger]);

  const monVuJusquau = utilisateurId ? lectures[utilisateurId] : undefined;
  const nonLus = messages.filter(m => m.auteur !== utilisateurId && (!monVuJusquau || m.cree_le > monVuJusquau)).length;
  const autreId = Object.keys(lectures).find(id => id !== utilisateurId);
  const autreVuJusquau = autreId ? lectures[autreId] : undefined;

  return { messages, nonLus, autreVuJusquau, erreur, envoyer, marquerLu, charge };
}
