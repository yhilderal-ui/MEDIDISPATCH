-- =============================================================================
-- MEDIDISPATCH — Recherche dans toutes les archives (option B, décision du 29/09).
--
-- La vue « Archives » affiche par défaut les 30 derniers jours. Pour retrouver
-- une demande plus ancienne, on cherche par nom de patient ou n° de ticket ;
-- la recherche est faite par la base, sans tenir compte des accents
-- (« helene » trouve « Hélène »). Aucune donnée n'est supprimée.
-- =============================================================================

-- Extension fournie par Supabase qui retire les accents (é → e).
create extension if not exists unaccent with schema extensions;

-- Les droits d'accès (RLS) s'appliquent : la fonction s'exécute avec les
-- droits du compte connecté.
create function rechercher_archives(p_recherche text, p_minuit timestamptz)
returns setof demandes
language sql
stable
set search_path = public, extensions
as $$
  select d.*
  from demandes d
  where d.statut = 'livree'
    and (d.archivee_le is not null or d.livree_le < p_minuit)
    and (
      unaccent(lower(d.patient_nom)) like '%' || unaccent(lower(trim(p_recherche))) || '%'
      or lower(d.numero_ticket) like '%' || lower(trim(p_recherche)) || '%'
    )
  order by d.livree_le desc
  limit 200;
$$;
