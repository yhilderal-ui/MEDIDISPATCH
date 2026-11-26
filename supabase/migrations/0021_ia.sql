-- =============================================================================
-- MEDIDISPATCH — Assistant d'aide par IA (décision du 12/11).
--
-- L'assistant (bouton « ? ») répond aux questions sur l'utilisation de
-- l'application. Il est servi par la fonction « assistant » (Edge Function
-- Supabase, dossier supabase/functions/assistant) qui appelle l'IA avec la clé
-- ANTHROPIC_API_KEY rangée dans les secrets de Supabase.
--
-- Cette migration ajoute seulement le SUIVI D'UTILISATION :
--   * une ligne par question (compte, date, nombre de « tokens ») ;
--   * le TEXTE des questions et des réponses n'est JAMAIS enregistré ;
--   * chacun ne voit que ses propres lignes ; personne ne peut les modifier
--     ni les effacer depuis l'application ;
--   * ia_questions_aujourdhui() sert à la limite de questions par jour.
--
-- Sans danger si on le relance.
-- =============================================================================

create table if not exists ia_utilisation (
  id             bigint generated always as identity primary key,
  utilisateur    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type           text not null check (type in ('assistant', 'bilan')),
  cree_le        timestamptz not null default now(),
  tokens_entree  integer not null default 0 check (tokens_entree >= 0),
  tokens_sortie  integer not null default 0 check (tokens_sortie >= 0)
);

create index if not exists ia_utilisation_utilisateur_idx on ia_utilisation (utilisateur, cree_le);

alter table ia_utilisation enable row level security;

drop policy if exists ia_utilisation_lecture on ia_utilisation;
create policy ia_utilisation_lecture on ia_utilisation
  for select to authenticated
  using (utilisateur = auth.uid());

drop policy if exists ia_utilisation_ajout on ia_utilisation;
create policy ia_utilisation_ajout on ia_utilisation
  for insert to authenticated
  with check (utilisateur = auth.uid() and est_utilisateur_autorise());

-- Nombre de questions posées à l'assistant aujourd'hui (jour de Paris) par la
-- personne connectée.
create or replace function ia_questions_aujourdhui()
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
  from ia_utilisation
  where utilisateur = auth.uid()
    and type = 'assistant'
    and cree_le >= debut_jour_paris((now() at time zone 'Europe/Paris')::date);
$$;
