import { createClient } from '@supabase/supabase-js';

// Ces deux valeurs viennent des variables d'environnement (fichier .env.local
// en local, réglages « Environment Variables » sur Vercel). La clé publique
// peut être visible dans le navigateur : ce sont les règles RLS de la base
// qui protègent les données, pas le secret de cette clé.
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();

// On ne garde que « https://xxxx.supabase.co » : l'adresse copiée depuis
// Supabase contient parfois un suffixe (/rest/v1/) qui casse la connexion.
function projectOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

const url = projectOrigin(rawUrl);

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key');
