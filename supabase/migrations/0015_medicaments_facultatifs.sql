-- =============================================================================
-- MEDIDISPATCH — Médicaments facultatifs (décision du 04/11).
--
-- La liste des médicaments est masquée dans l'application : une demande peut
-- désormais être créée sans médicament (liste vide). Si une liste est donnée,
-- chaque ligne doit toujours avoir un nom. Les demandes existantes ne changent pas.
--
-- Sans danger si on le relance.
-- =============================================================================

create or replace function medicaments_valides(liste jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(liste) = 'array'
     and not exists (
       select 1 from jsonb_array_elements(liste) as ligne
       where jsonb_typeof(ligne) <> 'object'
          or length(trim(coalesce(ligne ->> 'nom', ''))) = 0
     );
$$;
