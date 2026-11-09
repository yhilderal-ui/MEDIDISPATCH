-- =============================================================================
-- MEDIDISPATCH — Moins de « Mise à jour » (décision du 09/11).
--
-- Jusqu'ici, TOUTE modification d'une carte la marquait « Mise à jour » chez
-- les autres comptes et déclenchait une alerte. Avec 30 à 40 cartes réparties
-- chaque matin, cela faisait des dizaines d'alertes inutiles.
--
-- Désormais, la RÉPARTITION (secteur, livreur) et l'ARCHIVAGE ne comptent plus
-- comme une activité : la carte garde son état « vu », aucune alerte ne part.
-- Tout le reste (statut, report, modification, notes, documents, signature)
-- continue de compter. La date de modification technique (mis_a_jour_le) est
-- toujours mise à jour.
--
-- Sans danger si on le relance.
-- =============================================================================

create or replace function horodater_demande()
returns trigger
language plpgsql
as $$
declare
  -- Colonnes dont le changement ne compte pas comme une activité.
  ignorees constant text[] := array[
    'secteur', 'livreur_id', 'archivee_le',
    'mis_a_jour_le', 'derniere_activite_le', 'derniere_activite_par'
  ];
begin
  new.mis_a_jour_le := now();
  -- Sinon, l'activité reste celle d'avant ; une note ou un document l'avancent
  -- explicitement (signaler_activite_demande), ce qui est conservé tel quel.
  if (to_jsonb(new) - ignorees) is distinct from (to_jsonb(old) - ignorees) then
    new.derniere_activite_le := now();
    new.derniere_activite_par := auth.uid();
  end if;
  return new;
end;
$$;
