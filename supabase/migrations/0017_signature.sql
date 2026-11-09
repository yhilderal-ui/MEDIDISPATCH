-- =============================================================================
-- MEDIDISPATCH — Signature du patient à la livraison (décision du 09/11).
--
-- Facultative, pour les livraisons comme pour les retours. Le livreur fait
-- signer au doigt sur son téléphone ; la signature est rangée dans la carte
-- comme un document (image PNG), avec le nom de la personne qui a signé
-- (le patient, ou un proche qui réceptionne). Pour une livraison, elle est
-- aussi incrustée dans le bon de commande PDF, à l'emplacement prévu.
--
-- ⚠️ Donnée personnelle : uniquement des patients FICTIFS tant que
--    l'hébergement HDS et les questions RGPD ne sont pas réglés.
--
-- Sans danger si on le relance.
-- =============================================================================

alter type type_document add value if not exists 'signature';
alter type type_evenement add value if not exists 'signature';

-- Nom de la personne qui a signé (seulement pour une signature).
alter table documents add column if not exists signataire text
  check (signataire is null or length(trim(signataire)) between 1 and 80);

-- Une signature est toujours une image PNG, avec le nom de la personne.
-- (Comparaison en texte, pour la même raison que ci-dessous.)
alter table documents drop constraint if exists documents_signature_check;
alter table documents add constraint documents_signature_check
  check (type::text <> 'signature' or (type_mime = 'image/png' and signataire is not null));

-- Historique : « Signature : Mme Durand ».
-- (Comparaison en texte : la nouvelle valeur ci-dessus n'est utilisable
-- qu'après la fin de ce script.)
create or replace function tracer_signature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type::text = 'signature' then
    insert into historique (demande_id, auteur, evenement, nouvelle_valeur)
    values (new.demande_id, auth.uid(), 'signature', coalesce(new.signataire, 'signataire non précisé'));
  end if;
  return new;
end;
$$;

drop trigger if exists documents_tracer_signature on documents;
create trigger documents_tracer_signature
  after insert on documents
  for each row execute function tracer_signature();
