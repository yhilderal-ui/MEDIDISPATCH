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
