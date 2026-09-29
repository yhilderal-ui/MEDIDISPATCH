-- =============================================================================
-- MEDIDISPATCH — Bon de livraison généré et historique détaillé (étape 6).
--
-- Décisions du 29/09 :
--   * un bon de livraison PDF est généré automatiquement à partir de la carte,
--     en complément d'un éventuel bon joint ;
--   * quand la carte est modifiée, le nouveau bon REMPLACE l'ancien.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Repérer le bon généré parmi les documents (un seul par carte).
-- -----------------------------------------------------------------------------

alter table documents add column genere boolean not null default false;

create unique index documents_un_bon_genere_par_demande
  on documents (demande_id) where genere;

-- Seul le bon généré peut être mis à jour (remplacé) ; les autres documents
-- restent intouchables une fois ajoutés.
create policy "documents_remplacement_bon_genere" on documents
  for update to authenticated
  using (est_utilisateur_autorise() and genere)
  with check (est_utilisateur_autorise() and genere);

-- Le fichier du bon généré porte toujours le même nom : on l'écrase.
create policy "fichiers_remplacement_bon_genere" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and name like '%/bon-genere.pdf' and public.est_utilisateur_autorise())
  with check (bucket_id = 'documents' and name like '%/bon-genere.pdf' and public.est_utilisateur_autorise());


-- -----------------------------------------------------------------------------
-- 2. Historique : pour une modification, noter QUELS champs ont changé.
-- -----------------------------------------------------------------------------

create or replace function tracer_demande()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  champs text[] := '{}';
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

  if new.patient_nom is distinct from old.patient_nom then champs := array_append(champs, 'nom du patient'); end if;
  if new.patient_adresse is distinct from old.patient_adresse then champs := array_append(champs, 'adresse'); end if;
  if new.patient_telephone is distinct from old.patient_telephone then champs := array_append(champs, 'téléphone'); end if;
  if new.medicaments is distinct from old.medicaments then champs := array_append(champs, 'médicaments'); end if;
  if new.criticite is distinct from old.criticite then champs := array_append(champs, 'criticité'); end if;
  if new.notes_initiales is distinct from old.notes_initiales then champs := array_append(champs, 'notes'); end if;

  if array_length(champs, 1) > 0 then
    insert into historique (demande_id, auteur, evenement, nouvelle_valeur)
    values (new.id, auth.uid(), 'modification', array_to_string(champs, ', '));
  end if;

  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. Temps réel : l'historique d'une carte ouverte se met à jour tout seul.
--    (La table est déjà publiée depuis 0001 ; rien à ajouter.)
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 4. Nouvelles pièces jointes (demande du 29/09) : carte Vitale et mutuelle,
--    en plus de l'ordonnance et du bon de livraison.
--    ⚠️ Données de santé sensibles : uniquement des documents FICTIFS tant
--    que l'hébergement HDS et les questions RGPD ne sont pas réglés.
-- -----------------------------------------------------------------------------

alter type type_document add value if not exists 'carte_vitale';
alter type type_document add value if not exists 'mutuelle';
