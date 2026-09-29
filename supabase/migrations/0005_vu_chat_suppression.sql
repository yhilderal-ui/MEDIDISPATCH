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
