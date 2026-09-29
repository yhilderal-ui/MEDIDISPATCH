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
