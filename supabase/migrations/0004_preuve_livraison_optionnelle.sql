-- =============================================================================
-- MEDIDISPATCH — La photo de preuve de livraison devient optionnelle (V1).
--
-- Décision du 29/09 : on peut passer une demande en « Livrée » sans photo.
-- La photo reste possible (type de document « preuve_livraison »).
-- Pour rendre la photo à nouveau obligatoire plus tard, il suffira de recréer
-- ce déclencheur (voir section 8b de 0001_schema_initial.sql).
-- =============================================================================

drop trigger if exists demandes_verifier_preuve on demandes;
drop function if exists verifier_preuve_livraison();
