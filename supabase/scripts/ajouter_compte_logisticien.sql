-- =============================================================================
-- MEDIDISPATCH — Rattacher le compte du LOGISTICIEN à son rôle (décision du 08/11).
--
-- À exécuter APRÈS :
--   1. la migration 0016_livreurs_secteurs.sql ;
--   2. la création de l'utilisateur dans Supabase → Authentication → Users →
--      Add user (e-mail + mot de passe fort, « Auto Confirm User » coché).
-- Remplacez l'adresse e-mail et le prénom ci-dessous.
--
-- Ce compte est PERSONNEL : il classe les livraisons (Est / Ouest), les
-- attribue aux livreurs et gère la liste des livreurs. Ne le partagez pas.
-- =============================================================================

insert into profils (id, role, nom)
select id, 'logisticien', 'PRÉNOM DU LOGISTICIEN'
from auth.users
where email = 'EMAIL_DU_LOGISTICIEN@exemple.fr'
on conflict (id) do update set role = excluded.role, nom = excluded.nom;

-- Vérification : le logisticien doit apparaître avec le rôle « logisticien ».
select p.nom, p.role, u.email
from profils p
join auth.users u on u.id = p.id
order by p.cree_le;
