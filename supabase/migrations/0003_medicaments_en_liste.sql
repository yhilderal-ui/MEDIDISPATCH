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
