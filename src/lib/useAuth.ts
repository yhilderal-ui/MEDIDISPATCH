import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Rôles côté interface (hérités de la maquette) ↔ rôles en base.
export type Role = 'dispatcher' | 'livreur';

const ROLE_FROM_DB: Record<string, Role> = {
  dispatcheur: 'dispatcher',
  livraison: 'livreur',
};

export interface CurrentUser {
  id: string;
  role: Role;
  name: string;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out'; error?: string }
  | { status: 'signed_in'; user: CurrentUser };

export function useAuth() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Le rôle ne vient jamais du navigateur : il est lu dans la table « profils ».
  const userId = session?.user.id;
  useEffect(() => {
    if (session === undefined) return;
    if (!userId) {
      setState(s => (s.status === 'signed_out' ? s : { status: 'signed_out' }));
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    supabase
      .from('profils')
      .select('role, nom')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        const role = data ? ROLE_FROM_DB[data.role] : undefined;
        if (error || !data || !role) {
          supabase.auth.signOut();
          setState({
            status: 'signed_out',
            error: "Ce compte n'est pas autorisé sur MediDispatch. Contactez l'administrateur.",
          });
          return;
        }
        setState({ status: 'signed_in', user: { id: userId, role, name: data.nom } });
      });
    return () => {
      cancelled = true;
    };
  }, [session, userId]);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return null;
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return 'E-mail ou mot de passe incorrect.';
    }
    return `Connexion impossible : ${error.message}`;
  };

  const signOut = () => supabase.auth.signOut();

  return { state, signIn, signOut };
}
