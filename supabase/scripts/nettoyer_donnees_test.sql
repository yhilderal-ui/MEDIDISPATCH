-- =============================================================================
-- MEDIDISPATCH — Remise à zéro avant la mise en service réelle.
--
-- ⚠️ SUPPRIME DÉFINITIVEMENT TOUTES LES DEMANDES ET TOUS LES MESSAGES.
--    À lancer UNE SEULE FOIS, après la recette et AVANT que Florence et la
--    pharmacie commencent à travailler avec de vraies demandes.
--
-- Ce qui est supprimé :
--   * toutes les demandes, et avec elles (automatiquement) leurs documents,
--     notes, historique et marques « vu / non vu » ;
--   * tous les messages du chat et leurs marques « lu » ;
--   * le journal des suppressions de test ;
--   * les kilomètres estimés et les positions d'adresses gardées en cache
--     (migration 0014 ; à retirer de ce script si 0014 n'est pas installée).
-- Ce qui est conservé :
--   * les comptes (Florence, Pharmacie, Livreurs) et leurs mots de passe ;
--   * la structure de la base, les règles et les réglages.
-- Le compteur de tickets repart à zéro : la première vraie demande sera MD-00001.
--
-- Les FICHIERS (PDF, photos) ne sont pas dans ces tables : ils se vident
-- séparément depuis Supabase → Storage → documents (voir le guide).
-- =============================================================================

begin;

delete from demandes;               -- documents, notes, historique, lectures_demandes suivent
delete from messages;
delete from lectures_chat;
delete from journal_suppressions;   -- après les demandes : leur suppression y écrit une ligne
delete from kilometres_jour;
delete from adresses_geocodees;

alter sequence demandes_ticket_seq restart with 1;

commit;

-- Vérification : toutes les valeurs doivent être à 0, sauf « comptes » (nombre de comptes).
select
  (select count(*) from demandes)              as demandes,
  (select count(*) from documents)             as documents,
  (select count(*) from notes)                 as notes,
  (select count(*) from historique)            as historique,
  (select count(*) from messages)              as messages,
  (select count(*) from lectures_demandes)     as lectures_demandes,
  (select count(*) from lectures_chat)         as lectures_chat,
  (select count(*) from journal_suppressions)  as journal_suppressions,
  (select count(*) from kilometres_jour)       as kilometres_jour,
  (select count(*) from adresses_geocodees)    as adresses_geocodees,
  (select count(*) from profils)               as comptes;
