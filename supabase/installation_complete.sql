-- =============================================================================
-- MEDIDISPATCH — Installation complète d'une base NEUVE (11 migrations).
--
-- ⚠️ FICHIER GÉNÉRÉ AUTOMATIQUEMENT à partir de supabase/migrations/.
--    Ne pas le modifier à la main : lancer « npm run sql:installation ».
--
-- Usage : nouveau projet Supabase → SQL Editor → + New query → coller → Run.
-- Ne JAMAIS lancer sur une base déjà installée (la production) : les tables
-- existent déjà et le script s'arrêterait en erreur.
-- =============================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0001_schema_initial.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- MEDIDISPATCH — Schéma initial de la base de données (étape 2)
--
-- À exécuter une seule fois dans Supabase : SQL Editor → New query → coller → Run.
-- Le script est découpé en sections numérotées ; chaque section est commentée
-- pour expliquer à quoi elle sert.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Types énumérés : les seules valeurs autorisées pour certains champs.
--    La base refuse toute autre valeur, même si l'application a un bug.
-- -----------------------------------------------------------------------------

create type role_utilisateur as enum ('dispatcheur', 'livraison');

-- Cycle simplifié du cahier des charges (section 5), plus « annulée » (section 7bis).
create type statut_demande as enum ('nouvelle', 'en_cours', 'livree', 'annulee');

-- Section 7 : 🔴 Urgent, 🟠 Standard prioritaire, 🟢 Standard.
create type niveau_criticite as enum ('urgent', 'standard_prioritaire', 'standard');

create type type_document as enum ('ordonnance', 'bon_livraison', 'preuve_livraison');

create type type_evenement as enum ('creation', 'statut', 'report', 'modification');


-- -----------------------------------------------------------------------------
-- 2. Profils : relie chaque compte de connexion Supabase à un rôle et un nom.
--    V1 : deux comptes seulement (Florence + compte partagé Société de livraison).
-- -----------------------------------------------------------------------------

create table profils (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       role_utilisateur not null,
  nom        text not null,
  cree_le    timestamptz not null default now()
);

-- Vrai si la personne connectée possède un profil, donc fait partie des
-- deux comptes autorisés. Sert dans toutes les règles d'accès ci-dessous.
create function est_utilisateur_autorise()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profils where id = auth.uid());
$$;


-- -----------------------------------------------------------------------------
-- 3. Demandes de livraison (les « cartes »).
-- -----------------------------------------------------------------------------

-- Compteur qui fournit le numéro de ticket unique (MD-00001, MD-00002, …).
create sequence demandes_ticket_seq;

create table demandes (
  id                     uuid primary key default gen_random_uuid(),
  numero_ticket          text not null unique
                         default 'MD-' || lpad(nextval('demandes_ticket_seq')::text, 5, '0'),
  patient_nom            text not null check (length(trim(patient_nom)) > 0),
  patient_adresse        text not null check (length(trim(patient_adresse)) > 0),
  patient_telephone      text not null check (length(trim(patient_telephone)) > 0),
  medicaments            text not null check (length(trim(medicaments)) > 0),
  criticite              niveau_criticite not null default 'standard',
  -- Jamais de livraison le dimanche (isodow : lundi = 1 … dimanche = 7).
  jour_livraison         date not null check (extract(isodow from jour_livraison) <> 7),
  statut                 statut_demande not null default 'nouvelle',
  notes_initiales        text,
  cree_par               uuid not null default auth.uid() references profils (id),
  cree_le                timestamptz not null default now(),
  mis_a_jour_le          timestamptz not null default now(),
  -- Qui a touché la carte en dernier, et quand : sert au « vu / non vu ».
  derniere_activite_le   timestamptz not null default now(),
  derniere_activite_par  uuid default auth.uid() references profils (id),
  -- Renseigné quand une demande livrée sort du tableau actif (étape 11).
  archivee_le            timestamptz
);

create index demandes_jour_livraison_idx on demandes (jour_livraison);
create index demandes_statut_idx on demandes (statut);


-- -----------------------------------------------------------------------------
-- 4. Documents joints : ordonnance, bon de livraison, preuve de livraison.
--    Le fichier lui-même est dans le stockage Supabase (section 9) ;
--    cette table garde sa fiche (type, nom, taille, qui l'a ajouté).
-- -----------------------------------------------------------------------------

create table documents (
  id             uuid primary key default gen_random_uuid(),
  demande_id     uuid not null references demandes (id) on delete cascade,
  type           type_document not null,
  chemin_fichier text not null unique,
  nom_fichier    text not null,
  taille_octets  integer not null check (taille_octets > 0 and taille_octets <= 10 * 1024 * 1024),
  type_mime      text not null check (type_mime in ('application/pdf', 'image/jpeg', 'image/png')),
  ajoute_par     uuid not null default auth.uid() references profils (id),
  ajoute_le      timestamptz not null default now()
);

create index documents_demande_idx on documents (demande_id);


-- -----------------------------------------------------------------------------
-- 5. Fil de notes sur chaque carte (horodatées, avec auteur).
-- -----------------------------------------------------------------------------

create table notes (
  id          uuid primary key default gen_random_uuid(),
  demande_id  uuid not null references demandes (id) on delete cascade,
  auteur      uuid not null default auth.uid() references profils (id),
  contenu     text not null check (length(trim(contenu)) > 0),
  cree_le     timestamptz not null default now()
);

create index notes_demande_idx on notes (demande_id, cree_le);


-- -----------------------------------------------------------------------------
-- 6. Historique : trace de chaque action (création, statut, report, modification).
--    Rempli automatiquement par la base (section 8) : l'application ne peut
--    ni l'oublier, ni le falsifier.
-- -----------------------------------------------------------------------------

create table historique (
  id               uuid primary key default gen_random_uuid(),
  demande_id       uuid not null references demandes (id) on delete cascade,
  auteur           uuid references profils (id),
  evenement        type_evenement not null,
  ancienne_valeur  text,
  nouvelle_valeur  text,
  cree_le          timestamptz not null default now()
);

create index historique_demande_idx on historique (demande_id, cree_le);


-- -----------------------------------------------------------------------------
-- 7. Chat global et suivi « vu / non vu ».
-- -----------------------------------------------------------------------------

create table messages (
  id       uuid primary key default gen_random_uuid(),
  auteur   uuid not null default auth.uid() references profils (id),
  contenu  text not null check (length(trim(contenu)) > 0),
  cree_le  timestamptz not null default now()
);

create index messages_cree_le_idx on messages (cree_le);

-- Dernière consultation de chaque carte par chaque compte.
-- Une carte est « non vue » si l'AUTRE compte y a touché depuis cette date.
create table lectures_demandes (
  demande_id      uuid not null references demandes (id) on delete cascade,
  utilisateur_id  uuid not null default auth.uid() references profils (id),
  vu_le           timestamptz not null default now(),
  primary key (demande_id, utilisateur_id)
);

-- Jusqu'où chaque compte a lu le chat.
create table lectures_chat (
  utilisateur_id  uuid primary key default auth.uid() references profils (id),
  vu_jusqu_au     timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 8. Règles métier appliquées par la base elle-même (déclencheurs / triggers).
-- -----------------------------------------------------------------------------

-- 8a. Date de livraison : aujourd'hui ou plus tard (jamais un jour passé), heure de Paris.
--     Le jour même est autorisé : Florence crée souvent le matin les demandes du jour.
--     Vérifiée à la création et à chaque report, pas quand on change seulement
--     le statut (sinon une demande d'hier ne pourrait plus passer « Livrée »).
create function verifier_jour_livraison()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT' or new.jour_livraison is distinct from old.jour_livraison)
     and new.jour_livraison < (now() at time zone 'Europe/Paris')::date then
    raise exception 'La date de livraison ne peut pas être dans le passé (reçu : %).', new.jour_livraison
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger demandes_verifier_jour
  before insert or update on demandes
  for each row execute function verifier_jour_livraison();

-- 8b. Passage à « Livrée » : une photo de preuve de livraison est obligatoire.
create function verifier_preuve_livraison()
returns trigger
language plpgsql
as $$
begin
  if new.statut = 'livree' and old.statut is distinct from 'livree'
     and not exists (
       select 1 from documents
       where demande_id = new.id and type = 'preuve_livraison'
     ) then
    raise exception 'Ajoutez la photo de preuve de livraison avant de passer la demande en « Livrée ».'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger demandes_verifier_preuve
  before update on demandes
  for each row execute function verifier_preuve_livraison();

-- 8c. Horodatage automatique des modifications et de la dernière activité.
create function horodater_demande()
returns trigger
language plpgsql
as $$
begin
  new.mis_a_jour_le := now();
  new.derniere_activite_le := now();
  new.derniere_activite_par := auth.uid();
  return new;
end;
$$;

create trigger demandes_horodater
  before update on demandes
  for each row execute function horodater_demande();

-- 8d. Historique automatique de la carte.
create function tracer_demande()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  if (new.patient_nom, new.patient_adresse, new.patient_telephone, new.medicaments,
      new.criticite, new.notes_initiales)
     is distinct from
     (old.patient_nom, old.patient_adresse, old.patient_telephone, old.medicaments,
      old.criticite, old.notes_initiales) then
    insert into historique (demande_id, auteur, evenement)
    values (new.id, auth.uid(), 'modification');
  end if;

  return new;
end;
$$;

create trigger demandes_tracer
  after insert or update on demandes
  for each row execute function tracer_demande();

-- 8e. Une nouvelle note ou un nouveau document compte comme une activité sur
--     la carte : elle redevient « non vue » pour l'autre compte.
create function signaler_activite_demande()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update demandes
     set derniere_activite_le = now(),
         derniere_activite_par = auth.uid()
   where id = new.demande_id;
  return new;
end;
$$;

create trigger notes_signaler_activite
  after insert on notes
  for each row execute function signaler_activite_demande();

create trigger documents_signaler_activite
  after insert on documents
  for each row execute function signaler_activite_demande();


-- -----------------------------------------------------------------------------
-- 9. Stockage des fichiers : un « bucket » privé, 10 Mo max, PDF/JPEG/PNG.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png']);


-- -----------------------------------------------------------------------------
-- 10. Sécurité au niveau des lignes (Row Level Security, RLS).
--     Par défaut, TOUT est interdit. On n'ouvre que ce qui est nécessaire,
--     et uniquement aux deux comptes autorisés.
--     Aucune règle de suppression : une demande ne peut jamais « se perdre ».
-- -----------------------------------------------------------------------------

alter table profils            enable row level security;
alter table demandes           enable row level security;
alter table documents          enable row level security;
alter table notes              enable row level security;
alter table historique         enable row level security;
alter table messages           enable row level security;
alter table lectures_demandes  enable row level security;
alter table lectures_chat      enable row level security;

-- Profils : lecture seule (pour afficher les noms des auteurs).
create policy "profils_lecture" on profils
  for select to authenticated using (est_utilisateur_autorise());

-- Demandes : les deux rôles lisent, créent et modifient (décision section 7bis).
create policy "demandes_lecture" on demandes
  for select to authenticated using (est_utilisateur_autorise());
create policy "demandes_creation" on demandes
  for insert to authenticated with check (est_utilisateur_autorise() and cree_par = auth.uid());
create policy "demandes_modification" on demandes
  for update to authenticated using (est_utilisateur_autorise()) with check (est_utilisateur_autorise());

-- Documents : lecture et ajout, en son propre nom.
create policy "documents_lecture" on documents
  for select to authenticated using (est_utilisateur_autorise());
create policy "documents_ajout" on documents
  for insert to authenticated with check (est_utilisateur_autorise() and ajoute_par = auth.uid());

-- Notes : lecture et ajout, en son propre nom. Pas de modification a posteriori.
create policy "notes_lecture" on notes
  for select to authenticated using (est_utilisateur_autorise());
create policy "notes_ajout" on notes
  for insert to authenticated with check (est_utilisateur_autorise() and auteur = auth.uid());

-- Historique : lecture seule (il est écrit uniquement par la base, section 8d).
create policy "historique_lecture" on historique
  for select to authenticated using (est_utilisateur_autorise());

-- Chat : lecture et envoi, en son propre nom.
create policy "messages_lecture" on messages
  for select to authenticated using (est_utilisateur_autorise());
create policy "messages_envoi" on messages
  for insert to authenticated with check (est_utilisateur_autorise() and auteur = auth.uid());

-- Lectures : chacun ne gère que ses propres marqueurs « vu », mais voit ceux
-- de l'autre (utile pour afficher « vu par la pharmacie »).
create policy "lectures_demandes_lecture" on lectures_demandes
  for select to authenticated using (est_utilisateur_autorise());
create policy "lectures_demandes_ajout" on lectures_demandes
  for insert to authenticated with check (utilisateur_id = auth.uid() and est_utilisateur_autorise());
create policy "lectures_demandes_maj" on lectures_demandes
  for update to authenticated using (utilisateur_id = auth.uid()) with check (utilisateur_id = auth.uid());

create policy "lectures_chat_lecture" on lectures_chat
  for select to authenticated using (est_utilisateur_autorise());
create policy "lectures_chat_ajout" on lectures_chat
  for insert to authenticated with check (utilisateur_id = auth.uid() and est_utilisateur_autorise());
create policy "lectures_chat_maj" on lectures_chat
  for update to authenticated using (utilisateur_id = auth.uid()) with check (utilisateur_id = auth.uid());

-- Fichiers du bucket « documents » : lecture et dépôt par les comptes autorisés.
create policy "fichiers_lecture" on storage.objects
  for select to authenticated using (bucket_id = 'documents' and public.est_utilisateur_autorise());
create policy "fichiers_depot" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents' and public.est_utilisateur_autorise());


-- -----------------------------------------------------------------------------
-- 11. Temps réel : la base prévient les navigateurs ouverts à chaque changement
--     (nouvelles cartes, notes, messages…), sans rafraîchir la page.
--     Les règles RLS ci-dessus s'appliquent aussi à ces notifications.
-- -----------------------------------------------------------------------------

alter publication supabase_realtime
  add table demandes, documents, notes, historique, messages, lectures_demandes, lectures_chat;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0002_autoriser_livraison_jour_meme.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- MEDIDISPATCH — Autorise une livraison le jour même.
--
-- Changement de règle demandé après la rédaction du cahier des charges :
-- Florence crée souvent le matin des demandes à livrer dans la journée.
-- Règle : aujourd'hui ou plus tard (heure de Paris), jamais le dimanche.
--
-- À exécuter uniquement si 0001_schema_initial.sql a déjà été lancé
-- dans sa première version. Sans danger si on le relance.
-- =============================================================================

create or replace function verifier_jour_livraison()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT' or new.jour_livraison is distinct from old.jour_livraison)
     and new.jour_livraison < (now() at time zone 'Europe/Paris')::date then
    raise exception 'La date de livraison ne peut pas être dans le passé (reçu : %).', new.jour_livraison
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0003_medicaments_en_liste.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- MEDIDISPATCH — Médicaments sous forme de liste (nom + quantité).
--
-- Décision du 29/09 : la liste de la maquette est conservée.
-- Exemple de valeur : [{"nom": "Doliprane 1g", "quantite": "2 boîtes"}]
-- Les demandes déjà créées sont converties : leur texte devient une ligne.
-- =============================================================================

alter table demandes drop constraint demandes_medicaments_check;

alter table demandes
  alter column medicaments type jsonb
  using jsonb_build_array(jsonb_build_object('nom', medicaments, 'quantite', ''));

-- Une liste non vide, dont chaque ligne a un nom.
create function medicaments_valides(liste jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(liste) = 'array'
     and jsonb_array_length(liste) > 0
     and not exists (
       select 1 from jsonb_array_elements(liste) as ligne
       where jsonb_typeof(ligne) <> 'object'
          or length(trim(coalesce(ligne ->> 'nom', ''))) = 0
     );
$$;

alter table demandes
  add constraint demandes_medicaments_check check (medicaments_valides(medicaments));


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0004_preuve_livraison_optionnelle.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- MEDIDISPATCH — La photo de preuve de livraison devient optionnelle (V1).
--
-- Décision du 29/09 : on peut passer une demande en « Livrée » sans photo.
-- La photo reste possible (type de document « preuve_livraison »).
-- Pour rendre la photo à nouveau obligatoire plus tard, il suffira de recréer
-- ce déclencheur (voir section 8b de 0001_schema_initial.sql).
-- =============================================================================

drop trigger if exists demandes_verifier_preuve on demandes;
drop function if exists verifier_preuve_livraison();


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0005_vu_chat_suppression.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- MEDIDISPATCH — Vu / non vu (étape 8), chat (étape 9), suppression de cartes.
--
-- ⚠️ Supabase affichera l'avertissement « destructive operations » : ce script
-- AUTORISE la suppression de cartes (nouvelle règle d'accès), il ne supprime
-- lui-même aucune donnée.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Marquer une carte ou le chat comme « vu ».
--    L'heure est celle du serveur (now()), pas celle du téléphone ou de
--    l'ordinateur, pour que les comparaisons soient fiables.
-- -----------------------------------------------------------------------------

create function marquer_demande_vue(p_demande_id uuid)
returns void
language sql
as $$
  insert into lectures_demandes (demande_id, utilisateur_id, vu_le)
  values (p_demande_id, auth.uid(), now())
  on conflict (demande_id, utilisateur_id) do update set vu_le = now();
$$;

create function marquer_chat_lu()
returns void
language sql
as $$
  insert into lectures_chat (utilisateur_id, vu_jusqu_au)
  values (auth.uid(), now())
  on conflict (utilisateur_id) do update set vu_jusqu_au = now();
$$;


-- -----------------------------------------------------------------------------
-- 2. Suppression définitive d'une carte.
--    Garde-fous : réservée au compte Dispatcheur, et uniquement pour une
--    demande déjà « Annulée » (il faut donc d'abord l'annuler).
--    Chaque suppression laisse une trace dans le journal ci-dessous.
-- -----------------------------------------------------------------------------

create function est_dispatcheur()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profils where id = auth.uid() and role = 'dispatcheur');
$$;

create table journal_suppressions (
  id             uuid primary key default gen_random_uuid(),
  numero_ticket  text not null,
  supprime_par   uuid references profils (id),
  supprime_le    timestamptz not null default now()
);

alter table journal_suppressions enable row level security;

create policy "journal_suppressions_lecture" on journal_suppressions
  for select to authenticated using (est_utilisateur_autorise());

create function journaliser_suppression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into journal_suppressions (numero_ticket, supprime_par)
  values (old.numero_ticket, auth.uid());
  return old;
end;
$$;

create trigger demandes_journaliser_suppression
  before delete on demandes
  for each row execute function journaliser_suppression();

create policy "demandes_suppression" on demandes
  for delete to authenticated
  using (est_dispatcheur() and statut = 'annulee');

-- Les fichiers de la carte (bon de livraison, photo) sont supprimés avec elle.
create policy "fichiers_suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.est_dispatcheur());


-- -----------------------------------------------------------------------------
-- 3. Temps réel : prévenir les écrans quand une carte ou le chat est lu,
--    et quand une carte est supprimée (sans cela, l'événement de suppression
--    ne contient pas l'identifiant de la carte).
-- -----------------------------------------------------------------------------

alter table demandes replica identity full;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0006_archivage_livrees.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- MEDIDISPATCH — Archivage des demandes livrées après 30 jours (étape 11).
--
-- Décision du 29/09 : une demande livrée sort du tableau actif 30 jours après
-- sa livraison, et reste consultable dans la vue « Archives ».
-- On enregistre donc la date de livraison ; l'application compare ensuite
-- cette date à « aujourd'hui − 30 jours ». Aucune tâche planifiée n'est
-- nécessaire : l'archivage est automatique et ne peut pas « oublier » de passer.
-- =============================================================================

alter table demandes add column livree_le timestamptz;

-- Demandes déjà livrées : on reprend la date du passage à « Livrée » dans
-- l'historique (à défaut, la date de dernière mise à jour).
update demandes d
   set livree_le = coalesce(
     (select max(h.cree_le) from historique h
       where h.demande_id = d.id and h.evenement = 'statut' and h.nouvelle_valeur = 'livree'),
     d.mis_a_jour_le)
 where d.statut = 'livree';

-- Renseignée automatiquement au passage à « Livrée », effacée si on en sort.
create function dater_livraison()
returns trigger
language plpgsql
as $$
begin
  if new.statut = 'livree' and old.statut is distinct from 'livree' then
    new.livree_le := now();
  elsif new.statut <> 'livree' then
    new.livree_le := null;
  end if;
  return new;
end;
$$;

create trigger demandes_dater_livraison
  before update on demandes
  for each row execute function dater_livraison();

create index demandes_livree_le_idx on demandes (livree_le) where statut = 'livree';


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0007_bon_genere_et_historique.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- MEDIDISPATCH — Bon de livraison généré et historique détaillé (étape 6).
--
-- Décisions du 29/09 :
--   * un bon de livraison PDF est généré automatiquement à partir de la carte,
--     en complément d'un éventuel bon joint ;
--   * quand la carte est modifiée, le nouveau bon REMPLACE l'ancien.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Repérer le bon généré parmi les documents (un seul par carte).
-- -----------------------------------------------------------------------------

alter table documents add column genere boolean not null default false;

create unique index documents_un_bon_genere_par_demande
  on documents (demande_id) where genere;

-- Seul le bon généré peut être mis à jour (remplacé) ; les autres documents
-- restent intouchables une fois ajoutés.
create policy "documents_remplacement_bon_genere" on documents
  for update to authenticated
  using (est_utilisateur_autorise() and genere)
  with check (est_utilisateur_autorise() and genere);

-- Le fichier du bon généré porte toujours le même nom : on l'écrase.
create policy "fichiers_remplacement_bon_genere" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and name like '%/bon-genere.pdf' and public.est_utilisateur_autorise())
  with check (bucket_id = 'documents' and name like '%/bon-genere.pdf' and public.est_utilisateur_autorise());


-- -----------------------------------------------------------------------------
-- 2. Historique : pour une modification, noter QUELS champs ont changé.
-- -----------------------------------------------------------------------------

create or replace function tracer_demande()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  champs text[] := '{}';
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


-- -----------------------------------------------------------------------------
-- 3. Temps réel : l'historique d'une carte ouverte se met à jour tout seul.
--    (La table est déjà publiée depuis 0001 ; rien à ajouter.)
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 4. Nouvelles pièces jointes (demande du 29/09) : carte Vitale et mutuelle,
--    en plus de l'ordonnance et du bon de livraison.
--    ⚠️ Données de santé sensibles : uniquement des documents FICTIFS tant
--    que l'hébergement HDS et les questions RGPD ne sont pas réglés.
-- -----------------------------------------------------------------------------

alter type type_document add value if not exists 'carte_vitale';
alter type type_document add value if not exists 'mutuelle';


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0008_renommer_pharmacie.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- MEDIDISPATCH — Le compte « Société de livraison » s'appelle désormais
-- « Pharmacie » (décision du 29/09).
--
-- Seul le nom affiché change (badge, chat, auteur des notes et de
-- l'historique). Le rôle technique reste « livraison » : aucune règle
-- d'accès n'est modifiée.
-- =============================================================================

update profils set nom = 'Pharmacie' where role = 'livraison';


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0009_recherche_archives.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0010_statistiques.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0011_bon_de_commande.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- MEDIDISPATCH — Bon de commande et bon de livraison générés (décision du 30/09).
--
-- Le document généré jusqu'ici (avec la liste des médicaments) est le BON DE
-- COMMANDE : il va dans le carton, pour le patient. S'y ajoute le BON DE
-- LIVRAISON : même document, sans la liste des médicaments.
-- Les deux sont générés à partir de la carte et REMPLACÉS à chaque modification.
--
-- Sans danger si on le relance.
-- =============================================================================

-- Nouveau type de document.
alter type type_document add value if not exists 'bon_commande';

-- Un document généré par type et par demande (au lieu d'un seul par demande).
drop index if exists documents_un_bon_genere_par_demande;
create unique index if not exists documents_un_bon_genere_par_type
  on documents (demande_id, type) where genere;

-- Les fichiers générés portent un nom fixe : on les écrase à chaque mise à jour.
-- (bon-genere.pdf : ancien nom, gardé pour les demandes déjà créées.)
drop policy if exists "fichiers_remplacement_bon_genere" on storage.objects;
create policy "fichiers_remplacement_bon_genere" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (name like '%/bon-genere.pdf' or name like '%/bon-commande.pdf' or name like '%/bon-livraison.pdf')
    and public.est_utilisateur_autorise()
  )
  with check (
    bucket_id = 'documents'
    and (name like '%/bon-genere.pdf' or name like '%/bon-commande.pdf' or name like '%/bon-livraison.pdf')
    and public.est_utilisateur_autorise()
  );
