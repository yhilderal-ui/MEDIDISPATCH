-- =============================================================================
-- MEDIDISPATCH — Troisième compte « Livreurs » (décision du 30/09).
--
-- Compte partagé entre les livreurs, distinct du compte Pharmacie (comptoir).
-- Droits limités à la livraison : passer une demande « En cours » puis
-- « Livrée », ajouter photo et documents, écrire des notes, reporter,
-- archiver. Pas d'annulation, pas de modification des informations, pas de
-- chat (la messagerie reste entre Florence et la Pharmacie).
--
-- Sans danger si on le relance.
-- =============================================================================

alter type role_utilisateur add value if not exists 'livreur';

-- Vrai si la personne connectée utilise le compte Livreurs.
-- (Comparaison en texte : la nouvelle valeur ci-dessus n'est utilisable
-- qu'après la fin de ce script.)
create or replace function est_livreur()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profils where id = auth.uid() and role::text = 'livreur');
$$;


-- -----------------------------------------------------------------------------
-- 1. Garde-fou : ce que le compte Livreurs ne peut pas modifier.
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
      new.criticite, new.notes_initiales)
     is distinct from
     (old.patient_nom, old.patient_adresse, old.patient_telephone, old.medicaments,
      old.criticite, old.notes_initiales) then
    raise exception 'Le compte Livreurs ne peut pas modifier les informations de la demande.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists demandes_limiter_livreurs on demandes;
create trigger demandes_limiter_livreurs
  before update on demandes
  for each row execute function limiter_livreurs();


-- -----------------------------------------------------------------------------
-- 2. Chat : réservé à Florence et à la Pharmacie.
-- -----------------------------------------------------------------------------

drop policy if exists "messages_lecture" on messages;
create policy "messages_lecture" on messages
  for select to authenticated using (est_utilisateur_autorise() and not est_livreur());

drop policy if exists "messages_envoi" on messages;
create policy "messages_envoi" on messages
  for insert to authenticated with check (est_utilisateur_autorise() and not est_livreur() and auteur = auth.uid());


-- -----------------------------------------------------------------------------
-- 3. Création de demandes : pas pour le compte Livreurs.
-- -----------------------------------------------------------------------------

drop policy if exists "demandes_creation" on demandes;
create policy "demandes_creation" on demandes
  for insert to authenticated with check (est_utilisateur_autorise() and not est_livreur() and cree_par = auth.uid());
