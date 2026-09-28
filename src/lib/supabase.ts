import { createClient } from '@supabase/supabase-js';

// Ces deux valeurs viennent des variables d'environnement (fichier .env.local
// en local, réglages « Environment Variables » sur Vercel). La clé publique
// peut être visible dans le navigateur : ce sont les règles RLS de la base
// qui protègent les données, pas le secret de cette clé.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key');
