-- =============================================================================
-- MEDIDISPATCH — Livreurs, secteurs Est / Ouest et logisticien (décision du 08/11).
--
-- À partir de janvier : 30 à 40 livraisons par jour, deux secteurs, quatre
-- livreurs. Le LOGISTICIEN (compte personnel, nouveau rôle) classe chaque
-- livraison en Est ou Ouest et l'attribue à l'un des livreurs. Les autres
-- livreurs gardent le compte partagé « Livreurs » et choisissent leur prénom
-- en arrivant ; ils ne voient que les livraisons qui leur sont attribuées.
--
-- Droits du logisticien : classer, attribuer, reporter, annuler, statistiques.
-- Pas de création de demande, pas de modification du patient, pas de chat,
-- pas de suppression. Florence peut aussi classer et attribuer (en secours).
--
-- Sans danger si on le relance.
-- =============================================================================

alter type role_utilisateur add value if not exists 'logisticien';
alter type type_evenement add value if not exists 'affectation';

do $$
begin
  create type secteur as enum ('est', 'ouest');
exception
  when duplicate_object then null;
end;
$$;

-- Vrai si la personne connectée est le logisticien. (Comparaison en texte : la
-- nouvelle valeur ci-dessus n'est utilisable qu'après la fin de ce script.)
create or replace function est_logisticien()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profils where id = auth.uid() and role::text = 'logisticien');
$$;

-- Qui peut classer et attribuer : le logisticien et Florence.
create or replace function peut_repartir()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profils where id = auth.uid() and role::text in ('logisticien', 'dispatcheur'));
$$;


-- -----------------------------------------------------------------------------
-- 1. Les livreurs (prénoms proposés au compte partagé « Livreurs »).
--    Pas de suppression : un livreur qui part est désactivé, son nom reste
--    dans l'historique et les statistiques.
-- -----------------------------------------------------------------------------

create table if not exists livreurs (
  id       uuid primary key default gen_random_uuid(),
  nom      text not null check (length(trim(nom)) between 1 and 40),
  actif    boolean not null default true,
  ordre    int not null default 0,
  cree_le  timestamptz not null default now()
);
create unique index if not exists livreurs_nom_unique on livreurs (lower(trim(nom)));

alter table livreurs enable row level security;

drop policy if exists "livreurs_lecture" on livreurs;
create policy "livreurs_lecture" on livreurs
  for select to authenticated using (est_utilisateur_autorise());
drop policy if exists "livreurs_ajout" on livreurs;
create policy "livreurs_ajout" on livreurs
  for insert to authenticated with check (est_utilisateur_autorise() and peut_repartir());
drop policy if exists "livreurs_maj" on livreurs;
create policy "livreurs_maj" on livreurs
  for update to authenticated using (est_utilisateur_autorise() and peut_repartir())
  with check (est_utilisateur_autorise() and peut_repartir());

do $$
begin
  alter publication supabase_realtime add table livreurs;
exception
  when duplicate_object then null;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. Secteur et livreur attribué, sur chaque demande.
-- -----------------------------------------------------------------------------

alter table demandes add column if not exists secteur secteur;
alter table demandes add column if not exists livreur_id uuid references livreurs (id) on delete set null;
create index if not exists demandes_livreur_idx on demandes (livreur_id, jour_livraison);

-- Classer et attribuer : réservé au logisticien et à Florence.
create or replace function limiter_repartition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.secteur, new.livreur_id) is distinct from (old.secteur, old.livreur_id) and not peut_repartir() then
    raise exception 'Seuls le logisticien et Florence peuvent classer et attribuer les livraisons.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists demandes_limiter_repartition on demandes;
create trigger demandes_limiter_repartition
  before update on demandes
  for each row execute function limiter_repartition();


-- -----------------------------------------------------------------------------
-- 3. Garde-fou du logisticien : pas de modification des informations de la
--    demande (patient, médicaments, criticité, notes, nature, reliquat).
--    Statut (annulation comprise), date, secteur, livreur et archivage : oui.
-- -----------------------------------------------------------------------------

create or replace function limiter_logisticien()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not est_logisticien() then
    return new;
  end if;

  if (new.patient_nom, new.patient_adresse, new.patient_telephone, new.medicaments,
      new.criticite, new.notes_initiales, new.nature, new.reliquat_de)
     is distinct from
     (old.patient_nom, old.patient_adresse, old.patient_telephone, old.medicaments,
      old.criticite, old.notes_initiales, old.nature, old.reliquat_de) then
    raise exception 'Le logisticien ne peut pas modifier les informations de la demande.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists demandes_limiter_logisticien on demandes;
create trigger demandes_limiter_logisticien
  before update on demandes
  for each row execute function limiter_logisticien();


-- -----------------------------------------------------------------------------
-- 4. Création de demandes et chat : ni le compte Livreurs, ni le logisticien.
-- -----------------------------------------------------------------------------

drop policy if exists "demandes_creation" on demandes;
create policy "demandes_creation" on demandes
  for insert to authenticated
  with check (est_utilisateur_autorise() and not est_livreur() and not est_logisticien() and cree_par = auth.uid());

drop policy if exists "messages_lecture" on messages;
create policy "messages_lecture" on messages
  for select to authenticated using (est_utilisateur_autorise() and not est_livreur() and not est_logisticien());

drop policy if exists "messages_envoi" on messages;
create policy "messages_envoi" on messages
  for insert to authenticated
  with check (est_utilisateur_autorise() and not est_livreur() and not est_logisticien() and auteur = auth.uid());


-- -----------------------------------------------------------------------------
-- 5. Historique : une ligne « affectation » quand le secteur ou le livreur
--    change, par ex. « Est · Karim » (reprend tracer_demande de 0007).
-- -----------------------------------------------------------------------------

create or replace function tracer_demande()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  champs text[] := '{}';
  libelle text;
begin
  if tg_op = 'INSERT' then
    insert into historique (demande_id, auteur, evenement, nouvelle_valeur)
    values (new.id, auth.uid(), 'creation', new.statut::text);
    return new;
  end if;

  if new.statut is distinct from old.statut then
    insert into historique (demande_id, auteur, evenement, ancienne_valeur, nouvelle_valeur)
    values (new.id, auth.uid(), 'statut', old.statut::text, new.statut::text);
  end if;

  if new.jour_livraison is distinct from old.jour_livraison then
    insert into historique (demande_id, auteur, evenement, ancienne_valeur, nouvelle_valeur)
    values (new.id, auth.uid(), 'report', old.jour_livraison::text, new.jour_livraison::text);
  end if;

  if (new.secteur, new.livreur_id) is distinct from (old.secteur, old.livreur_id) then
    libelle := concat_ws(' · ',
      case new.secteur when 'est' then 'Est' when 'ouest' then 'Ouest' end,
      (select nom from livreurs where id = new.livreur_id));
    insert into historique (demande_id, auteur, evenement, nouvelle_valeur)
    values (new.id, auth.uid(), 'affectation', coalesce(nullif(libelle, ''), 'non attribuée'));
  end if;

  if new.patient_nom is distinct from old.patient_nom then champs := array_append(champs, 'nom du patient'); end if;
  if new.patient_adresse is distinct from old.patient_adresse then champs := array_append(champs, 'adresse'); end if;
  if new.patient_telephone is distinct from old.patient_telephone then champs := array_append(champs, 'téléphone'); end if;
  if new.medicaments is distinct from old.medicaments then champs := array_append(champs, 'médicaments'); end if;
  if new.criticite is distinct from old.criticite then champs := array_append(champs, 'criticité'); end if;
  if new.notes_initiales is distinct from old.notes_initiales then champs := array_append(champs, 'notes'); end if;

  if array_length(champs, 1) > 0 then
    insert into historique (demande_id, auteur, evenement, nouvelle_valeur)
    values (new.id, auth.uid(), 'modification', array_to_string(champs, ', '));
  end if;

  return new;
end;
$$;
