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
