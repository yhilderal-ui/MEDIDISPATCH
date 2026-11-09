-- =============================================================================
-- MEDIDISPATCH — Répartition : le logisticien et la Pharmacie (décision du 09/11).
--
-- Jusqu'ici (migration 0016), le logisticien et FLORENCE pouvaient classer les
-- livraisons (Est / Ouest), les attribuer et gérer la liste des livreurs.
-- Désormais : le logisticien et la PHARMACIE. Florence voit toujours le
-- secteur et le livreur de chaque carte, mais ne les modifie plus.
--
-- Sans danger si on le relance.
-- =============================================================================

-- (« livraison » est, en base, le rôle du compte Pharmacie.)
create or replace function peut_repartir()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profils where id = auth.uid() and role::text in ('logisticien', 'livraison'));
$$;

create or replace function limiter_repartition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.secteur, new.livreur_id) is distinct from (old.secteur, old.livreur_id) and not peut_repartir() then
    raise exception 'Seuls le logisticien et la Pharmacie peuvent classer et attribuer les livraisons.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
