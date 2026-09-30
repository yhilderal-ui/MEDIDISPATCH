-- =============================================================================
-- MEDIDISPATCH — Tournée d'essai en Seine-et-Marne (12 livraisons pour AUJOURD'HUI).
--
-- ⚠️ BASE DE TEST UNIQUEMENT (projet medidispatch-test). Jamais en production.
--
-- Adresses de mairies (lieux publics), patients fictifs « DÉMO ». Pour les
-- retirer : delete from demandes where patient_nom like 'DÉMO %';
-- (retire aussi les données de démonstration des statistiques).
-- =============================================================================

insert into demandes (patient_nom, patient_adresse, patient_telephone, medicaments, criticite,
                      jour_livraison, notes_initiales, cree_par, derniere_activite_par)
select 'DÉMO Tournée ' || n, adresse, '06 00 00 00 ' || lpad(n::text, 2, '0'),
       '[{"nom": "DOLIPRANE 1000 mg, comprimé", "quantite": "1 boîte"}]'::jsonb,
       criticite::niveau_criticite, (now() at time zone 'Europe/Paris')::date, notes,
       (select id from profils where role = 'dispatcheur' limit 1),
       (select id from profils where role = 'dispatcheur' limit 1)
from (values
  (1,  '2 place de l''Hôtel de Ville, 77100 Meaux',                 'standard',             null),
  (2,  '40 rue Grande, 77300 Fontainebleau',                        'urgent',               'Sonner chez la gardienne'),
  (3,  '16 rue Paul Doumer, 77000 Melun',                           'standard',             null),
  (4,  '107 avenue de la République, 77340 Pontault-Combault',      'standard_prioritaire', null),
  (5,  '41 quai Victor Hugo, 77140 Nemours',                        'standard',             null),
  (6,  '2 place de l''Hôtel de Ville, 77400 Lagny-sur-Marne',       'standard',             null),
  (7,  '1 place François Mitterrand, 77176 Savigny-le-Temple',      'urgent',               'Digicode 1234'),
  (8,  '7 rue du Général de Gaulle, 77120 Coulommiers',             'standard',             null),
  (9,  'Place de l''Appel du 18 juin 1940, 77200 Torcy',            'standard',             null),
  (10, 'Rue Jean Jaurès, 77130 Montereau-Fault-Yonne',              'standard_prioritaire', null),
  (11, '1 rue du Marché, 77160 Provins',                            'standard',             null),
  (12, 'Place de la Gare, 77500 Chelles',                           'standard',             null)
) as t (n, adresse, criticite, notes)
where extract(isodow from (now() at time zone 'Europe/Paris')::date) <> 7; -- pas de livraison le dimanche

select numero_ticket, patient_nom, patient_adresse from demandes where patient_nom like 'DÉMO Tournée %' order by numero_ticket;
