-- =============================================================================
-- MEDIDISPATCH — Le compte « Société de livraison » s'appelle désormais
-- « Pharmacie » (décision du 29/09).
--
-- Seul le nom affiché change (badge, chat, auteur des notes et de
-- l'historique). Le rôle technique reste « livraison » : aucune règle
-- d'accès n'est modifiée.
-- =============================================================================

update profils set nom = 'Pharmacie' where role = 'livraison';
