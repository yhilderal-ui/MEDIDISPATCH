-- =============================================================================
-- MEDIDISPATCH — Statistiques (décision du 30/09).
--
-- Visibles par les deux comptes : chiffres clés (avec la période précédente),
-- livraisons par jour / semaine / mois, livraisons selon le jour de la
-- semaine, top 10 des médicaments livrés.
--
-- Les périodes sont des jours en heure de Paris, bornes incluses.
-- Définitions :
--   * créée    : date de création de la demande ;
--   * livrée   : date à laquelle elle a été marquée « Livrée » ;
--   * reportée : au moins un report dans la période (historique) ;
--   * annulée  : passée à « Annulée » dans la période (historique).
-- Une demande supprimée définitivement ne compte plus nulle part.
-- =============================================================================

create index if not exists demandes_cree_le_idx on demandes (cree_le);
create index if not exists historique_evenement_idx on historique (evenement, cree_le);

-- Jour de Paris → instant de début (minuit, heure d'été / d'hiver comprise).
create function debut_jour_paris(p_jour date)
returns timestamptz
language sql
immutable
as $$
  select p_jour::timestamp at time zone 'Europe/Paris';
$$;

-- Les quatre chiffres clés d'une période.
create function chiffres_periode(p_debut date, p_fin date)
returns jsonb
language sql
stable
set search_path = public
as $$
  with b as (select debut_jour_paris(p_debut) as de, debut_jour_paris(p_fin + 1) as a)
  select jsonb_build_object(
    'creees', (select count(*) from demandes, b where cree_le >= b.de and cree_le < b.a),
    'livrees', (select count(*) from demandes, b where statut = 'livree' and livree_le >= b.de and livree_le < b.a),
    'reportees', (select count(distinct demande_id) from historique, b
                  where evenement = 'report' and cree_le >= b.de and cree_le < b.a),
    'annulees', (select count(distinct demande_id) from historique, b
                 where evenement = 'statut' and nouvelle_valeur = 'annulee' and cree_le >= b.de and cree_le < b.a)
  );
$$;

-- Toutes les statistiques d'une période, en un seul appel.
-- p_granularite : 'day', 'week' (semaines du lundi) ou 'month'.
-- Les droits d'accès (RLS) s'appliquent : la fonction s'exécute avec les
-- droits du compte connecté.
create function statistiques(
  p_debut date,
  p_fin date,
  p_prec_debut date,
  p_prec_fin date,
  p_granularite text
)
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  with
  b as (select debut_jour_paris(p_debut) as de, debut_jour_paris(p_fin + 1) as a),
  -- Granularité acceptée, sinon null (et donc aucun résultat).
  u as (select case when p_granularite in ('day', 'week', 'month') then p_granularite end as g),
  livrees as (
    select d.*, (d.livree_le at time zone 'Europe/Paris')::date as jour
    from demandes d, b
    where d.statut = 'livree' and d.livree_le >= b.de and d.livree_le < b.a
  ),
  periodes as (
    select g::date as periode
    from generate_series(
      date_trunc((select g from u), p_debut::timestamp),
      p_fin::timestamp,
      ('1 ' || (select g from u))::interval
    ) as g
  ),
  par_periode as (
    select date_trunc((select g from u), jour::timestamp)::date as periode, count(*) as nombre
    from livrees
    group by 1
  ),
  par_jour_semaine as (
    select extract(isodow from jour)::int as jour_semaine, count(*) as nombre
    from livrees
    group by 1
  ),
  medicaments as (
    select mode() within group (order by trim(m ->> 'nom')) as nom, count(distinct l.id) as demandes
    from livrees l, jsonb_array_elements(l.medicaments) as m
    where trim(coalesce(m ->> 'nom', '')) <> ''
    group by unaccent(lower(trim(m ->> 'nom')))
    order by 2 desc, 1
    limit 10
  )
  select jsonb_build_object(
    'chiffres', chiffres_periode(p_debut, p_fin),
    'precedent', chiffres_periode(p_prec_debut, p_prec_fin),
    'livraisons', (
      select coalesce(jsonb_agg(jsonb_build_object('periode', p.periode, 'nombre', coalesce(pp.nombre, 0)) order by p.periode), '[]')
      from periodes p left join par_periode pp using (periode)
    ),
    'jours_semaine', (
      select jsonb_agg(jsonb_build_object('jour', j, 'nombre', coalesce(pj.nombre, 0)) order by j)
      from generate_series(1, 7) as j left join par_jour_semaine pj on pj.jour_semaine = j
    ),
    'medicaments', (
      select coalesce(jsonb_agg(jsonb_build_object('nom', nom, 'demandes', demandes) order by demandes desc, nom), '[]')
      from medicaments
    )
  )
  where p_granularite in ('day', 'week', 'month')
    and p_debut <= p_fin
    and p_fin - p_debut <= 1100;
$$;

-- Réservé aux comptes connectés.
revoke execute on function statistiques(date, date, date, date, text) from public, anon;
revoke execute on function chiffres_periode(date, date) from public, anon;
grant execute on function statistiques(date, date, date, date, text) to authenticated;
grant execute on function chiffres_periode(date, date) to authenticated;
