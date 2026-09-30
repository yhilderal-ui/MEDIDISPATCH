-- =============================================================================
-- MEDIDISPATCH — Bon de commande et bon de livraison générés (décision du 30/09).
--
-- Le document généré jusqu'ici (avec la liste des médicaments) est le BON DE
-- COMMANDE : il va dans le carton, pour le patient. S'y ajoute le BON DE
-- LIVRAISON : même document, sans la liste des médicaments.
-- Les deux sont générés à partir de la carte et REMPLACÉS à chaque modification.
--
-- Sans danger si on le relance.
-- =============================================================================

-- Nouveau type de document.
alter type type_document add value if not exists 'bon_commande';

-- Un document généré par type et par demande (au lieu d'un seul par demande).
drop index if exists documents_un_bon_genere_par_demande;
create unique index if not exists documents_un_bon_genere_par_type
  on documents (demande_id, type) where genere;

-- Les fichiers générés portent un nom fixe : on les écrase à chaque mise à jour.
-- (bon-genere.pdf : ancien nom, gardé pour les demandes déjà créées.)
drop policy if exists "fichiers_remplacement_bon_genere" on storage.objects;
create policy "fichiers_remplacement_bon_genere" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (name like '%/bon-genere.pdf' or name like '%/bon-commande.pdf' or name like '%/bon-livraison.pdf')
    and public.est_utilisateur_autorise()
  )
  with check (
    bucket_id = 'documents'
    and (name like '%/bon-genere.pdf' or name like '%/bon-commande.pdf' or name like '%/bon-livraison.pdf')
    and public.est_utilisateur_autorise()
  );
