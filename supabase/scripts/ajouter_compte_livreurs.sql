-- =============================================================================
-- MEDIDISPATCH — Rattacher le compte « Livreurs » à son rôle.
--
-- À exécuter APRÈS :
--   1. la migration 0012_compte_livreurs.sql ;
--   2. la création de l'utilisateur dans Supabase → Authentication → Users →
--      Add user (e-mail + mot de passe fort, « Auto Confirm User » coché).
-- Remplacez l'adresse e-mail ci-dessous par celle que vous avez choisie.
-- =============================================================================

insert into profils (id, role, nom)
select id, 'livreur', 'Livreurs'
from auth.users
where email = 'EMAIL_DES_LIVREURS@exemple.fr'
on conflict (id) do update set role = excluded.role, nom = excluded.nom;

-- Vérification : doit afficher 3 lignes (Florence, Pharmacie, Livreurs).
select p.nom, p.role, u.email
from profils p
join auth.users u on u.id = p.id
order by p.cree_le;
