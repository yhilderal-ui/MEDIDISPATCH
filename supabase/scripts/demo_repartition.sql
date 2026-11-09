-- =============================================================================
-- MEDIDISPATCH — Livraisons d'essai pour la RÉPARTITION (logisticien).
--
-- ⚠️ BASE DE TEST UNIQUEMENT (projet medidispatch-test). Jamais en production.
-- À lancer APRÈS la migration 0016_livreurs_secteurs.sql.
--
-- Crée 6 livraisons par jour sur les 5 prochains jours de livraison (hors
-- dimanche), aujourd'hui compris s'il n'est pas dimanche : 30 cartes
-- « à classer », non attribuées, à des adresses de mairies du 77 (moitié
-- vers l'ouest, moitié vers l'est). Patients fictifs « DÉMO ».
--
-- Pour tout retirer : delete from demandes where patient_nom like 'DÉMO %';
-- =============================================================================

with jours as (
  select j::date as jour, row_number() over (order by j) as rang
  from generate_series((now() at time zone 'Europe/Paris')::date,
                       (now() at time zone 'Europe/Paris')::date + 6, interval '1 day') as j
  where extract(isodow from j) <> 7
  limit 5
),
adresses (n, ville, adresse) as (
  values
  -- plutôt ouest
  (1,  'Chelles',            'Place de la Gare, 77500 Chelles'),
  (2,  'Torcy',              'Place de l''Appel du 18 juin 1940, 77200 Torcy'),
  (3,  'Pontault-Combault',  '107 avenue de la République, 77340 Pontault-Combault'),
  (4,  'Noisiel',            '2 place Émile Menier, 77186 Noisiel'),
  (5,  'Champs-sur-Marne',   '2 rue de Paris, 77420 Champs-sur-Marne'),
  (6,  'Roissy-en-Brie',     '2 avenue du Général Leclerc, 77680 Roissy-en-Brie'),
  -- plutôt est
  (7,  'Meaux',              '2 place de l''Hôtel de Ville, 77100 Meaux'),
  (8,  'Coulommiers',        '7 rue du Général de Gaulle, 77120 Coulommiers'),
  (9,  'Lagny-sur-Marne',    '2 place de l''Hôtel de Ville, 77400 Lagny-sur-Marne'),
  (10, 'Provins',            '1 rue du Marché, 77160 Provins'),
  (11, 'Serris',             '2 place Antoine Mauny, 77700 Serris'),
  (12, 'Crécy-la-Chapelle',  '1 place du Marché, 77580 Crécy-la-Chapelle')
),
cartes as (
  -- 6 adresses par jour, en tournant dans la liste (3 « ouest » + 3 « est »)
  select j.jour, j.rang, k,
         a.ville, a.adresse
  from jours j
  cross join generate_series(1, 6) as k
  join adresses a on a.n = case when k <= 3 then ((j.rang * 3 + k) % 6) + 1
                                else ((j.rang * 3 + k) % 6) + 7 end
)
insert into demandes (patient_nom, patient_adresse, patient_telephone, medicaments, criticite, nature,
                      jour_livraison, notes_initiales, cree_par, derniere_activite_par)
select 'DÉMO ' || ville || ' ' || rang || '-' || k,
       adresse,
       '06 00 00 ' || lpad(rang::text, 2, '0') || ' ' || lpad(k::text, 2, '0'),
       '[]'::jsonb,
       (case when k = 1 then 'urgent' when k = 4 then 'standard_prioritaire' else 'standard' end)::niveau_criticite,
       (case when k = 6 then 'retour' else 'livraison' end)::nature_demande,
       jour,
       case when k = 2 then 'Digicode 1234' when k = 6 then 'Récupérer le traitement arrêté' end,
       (select id from profils where role = 'dispatcheur' limit 1),
       (select id from profils where role = 'dispatcheur' limit 1)
from cartes;

-- Vérification : 6 cartes par jour, toutes « à classer ».
select jour_livraison, count(*) as cartes,
       count(*) filter (where secteur is null) as a_classer,
       count(*) filter (where nature = 'retour') as retours
from demandes
where patient_nom like 'DÉMO %'
group by jour_livraison
order by jour_livraison;
