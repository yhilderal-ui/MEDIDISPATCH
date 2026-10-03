-- =============================================================================
-- MEDIDISPATCH — Retours et reliquats (décisions du 03/10).
--
-- * RETOUR : à la création, on choisit « Livraison » ou « Retour » (aller
--   récupérer des médicaments chez le patient). Pas de PDF pour un retour ;
--   l'étape finale s'affiche « Récupéré ».
-- * RELIQUAT : une commande livrée en deux fois. Florence ou la Pharmacie
--   crée une carte liée « Reliquat de MD-xxxxx » pour la partie restante.
--
-- Sans danger si on le relance.
-- =============================================================================

do $$
begin
  create type nature_demande as enum ('livraison', 'retour');
exception
  when duplicate_object then null;
end;
$$;

alter table demandes add column if not exists nature nature_demande not null default 'livraison';
alter table demandes add column if not exists reliquat_de uuid references demandes (id) on delete set null;
create index if not exists demandes_reliquat_de_idx on demandes (reliquat_de);


-- -----------------------------------------------------------------------------
-- 1. Garde-fou Livreurs (migration 0012) : ni la nature ni le lien de
--    reliquat ne peuvent être modifiés par ce compte.
-- -----------------------------------------------------------------------------

create or replace function limiter_livreurs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not est_livreur() then
    return new;
  end if;

  if new.statut is distinct from old.statut and (new.statut = 'annulee' or old.statut = 'annulee') then
    raise exception 'Le compte Livreurs ne peut pas annuler ni réactiver une demande.'
      using errcode = 'insufficient_privilege';
  end if;

  if (new.patient_nom, new.patient_adresse, new.patient_telephone, new.medicaments,
      new.criticite, new.notes_initiales, new.nature, new.reliquat_de)
     is distinct from
     (old.patient_nom, old.patient_adresse, old.patient_telephone, old.medicaments,
      old.criticite, old.notes_initiales, old.nature, old.reliquat_de) then
    raise exception 'Le compte Livreurs ne peut pas modifier les informations de la demande.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. Créer un reliquat : en une seule opération, la carte liée reçoit les
--    médicaments qui partiront plus tard, la carte d'origine garde le reste.
--    Les règles habituelles s'appliquent : droits d'accès (le compte Livreurs
--    ne peut pas créer de demande), au moins un médicament de chaque côté,
--    date ni passée ni un dimanche.
-- -----------------------------------------------------------------------------

create or replace function creer_reliquat(p_demande uuid, p_restants jsonb, p_reliquat jsonb, p_jour date)
returns table (nouvel_id uuid, nouveau_ticket text)
language plpgsql
set search_path = public
as $$
declare
  origine demandes%rowtype;
begin
  select * into origine from demandes d where d.id = p_demande;
  if not found then
    raise exception 'Demande introuvable.';
  end if;
  if origine.nature <> 'livraison' then
    raise exception 'Un reliquat ne concerne qu''une livraison.';
  end if;
  if origine.statut = 'annulee' then
    raise exception 'Une demande annulée ne peut pas avoir de reliquat.';
  end if;

  update demandes set medicaments = p_restants where id = p_demande;

  return query
  insert into demandes as n (patient_nom, patient_adresse, patient_telephone, medicaments, criticite,
                             jour_livraison, notes_initiales, nature, reliquat_de)
  values (origine.patient_nom, origine.patient_adresse, origine.patient_telephone, p_reliquat, origine.criticite,
          p_jour, origine.notes_initiales, 'livraison', origine.id)
  returning n.id, n.numero_ticket;
end;
$$;

revoke execute on function creer_reliquat(uuid, jsonb, jsonb, date) from public, anon;
grant execute on function creer_reliquat(uuid, jsonb, jsonb, date) to authenticated;


-- -----------------------------------------------------------------------------
-- 3. Statistiques (migration 0010) : les créations, livraisons, graphiques et
--    médicaments ne comptent que les LIVRAISONS ; nouveau chiffre « retours »
--    (retours récupérés dans la période). Reports et annulations : tous types.
-- -----------------------------------------------------------------------------

create or replace function chiffres_periode(p_debut date, p_fin date)
returns jsonb
language sql
stable
set search_path = public
as $$
  with b as (select debut_jour_paris(p_debut) as de, debut_jour_paris(p_fin + 1) as a)
  select jsonb_build_object(
    'creees', (select count(*) from demandes, b where nature = 'livraison' and cree_le >= b.de and cree_le < b.a),
    'livrees', (select count(*) from demandes, b
                where nature = 'livraison' and statut = 'livree' and livree_le >= b.de and livree_le < b.a),
    'retours', (select count(*) from demandes, b
                where nature = 'retour' and statut = 'livree' and livree_le >= b.de and livree_le < b.a),
    'reportees', (select count(distinct demande_id) from historique, b
                  where evenement = 'report' and cree_le >= b.de and cree_le < b.a),
    'annulees', (select count(distinct demande_id) from historique, b
                 where evenement = 'statut' and nouvelle_valeur = 'annulee' and cree_le >= b.de and cree_le < b.a)
  );
$$;

create or replace function statistiques(
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
    where d.nature = 'livraison' and d.statut = 'livree' and d.livree_le >= b.de and d.livree_le < b.a
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
