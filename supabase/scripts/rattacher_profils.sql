-- =============================================================================
-- MEDIDISPATCH — Rattacher les deux comptes de connexion à leur rôle.
--
-- À exécuter APRÈS avoir créé les deux utilisateurs dans
-- Supabase → Authentication → Users → Add user.
-- Remplacez les deux adresses e-mail ci-dessous par celles que vous avez choisies.
-- =============================================================================

insert into profils (id, role, nom)
select id, 'dispatcheur', 'Florence'
from auth.users
where email = 'EMAIL_DE_FLORENCE@exemple.fr';

insert into profils (id, role, nom)
select id, 'livraison', 'Pharmacie'
from auth.users
where email = 'EMAIL_DE_LA_SOCIETE@exemple.fr';

-- Vérification : doit afficher 2 lignes.
select p.nom, p.role, u.email
from profils p
join auth.users u on u.id = p.id;
