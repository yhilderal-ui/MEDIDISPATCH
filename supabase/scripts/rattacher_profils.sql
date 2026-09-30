-- =============================================================================
-- MEDIDISPATCH — Rattacher les comptes de connexion à leur rôle.
--
-- À exécuter APRÈS avoir créé les utilisateurs dans
-- Supabase → Authentication → Users → Add user.
-- Remplacez les adresses e-mail ci-dessous par celles que vous avez choisies.
-- =============================================================================

insert into profils (id, role, nom)
select id, 'dispatcheur', 'Florence'
from auth.users
where email = 'EMAIL_DE_FLORENCE@exemple.fr';

insert into profils (id, role, nom)
select id, 'livraison', 'Pharmacie'
from auth.users
where email = 'EMAIL_DE_LA_SOCIETE@exemple.fr';

-- Compte partagé des livreurs (migration 0012) : voir aussi ajouter_compte_livreurs.sql.
insert into profils (id, role, nom)
select id, 'livreur', 'Livreurs'
from auth.users
where email = 'EMAIL_DES_LIVREURS@exemple.fr';

-- Vérification : doit afficher 3 lignes.
select p.nom, p.role, u.email
from profils p
join auth.users u on u.id = p.id;
