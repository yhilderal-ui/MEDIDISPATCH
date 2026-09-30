-- =============================================================================
-- MEDIDISPATCH — Données de démonstration pour les statistiques.
--
-- ⚠️ BASE DE TEST UNIQUEMENT (projet medidispatch-test). Jamais en production.
--
-- Crée environ 350 demandes FICTIVES sur les 4 derniers mois (hors dimanches),
-- avec livraisons, reports et annulations, pour voir la page Statistiques
-- avec des graphiques réalistes. Toutes portent un nom commençant par « DÉMO ».
--
-- Pour les retirer : lancer la dernière requête de ce fichier (tout en bas),
-- seule, en la sélectionnant avant de cliquer sur Run.
-- =============================================================================

do $$
declare
  dispatcheur uuid := (select id from profils where role = 'dispatcheur' limit 1);
  catalogue text[] := array[
    'DOLIPRANE 1000 mg, comprimé', 'DOLIPRANE 500 mg, gélule', 'KARDEGIC 75 mg, poudre pour solution buvable en sachet-dose',
    'LEVOTHYROX 75 microgrammes, comprimé sécable', 'METFORMINE BIOGARAN 850 mg, comprimé pelliculé',
    'AMOXICILLINE BIOGARAN 1 g, comprimé dispersible', 'INEXIUM 20 mg, comprimé gastro-résistant',
    'ELIQUIS 5 mg, comprimé pelliculé', 'TAHOR 20 mg, comprimé pelliculé', 'SPASFON, comprimé enrobé',
    'SMECTA 3 g, poudre pour suspension buvable en sachet', 'XARELTO 20 mg, comprimé pelliculé',
    'VENTOLINE 100 microgrammes/dose, suspension pour inhalation', 'LOVENOX 4000 UI (40 mg)/0,4 mL, solution injectable',
    'FORLAX 10 g, poudre pour solution buvable en sachet', 'BISOPROLOL BIOGARAN 5 mg, comprimé pelliculé sécable',
    'IMODIUM 2 mg, gélule', 'EFFERALGAN 1 g, comprimé effervescent'
  ];
  prenoms text[] := array['Hélène', 'Paul', 'Léa', 'Karim', 'Jeanne', 'Marc', 'Sofia', 'Yves', 'Nadia', 'Louis'];
  noms text[] := array['Durand', 'Martin', 'Petit', 'Belkacem', 'Moreau', 'Fontaine', 'Garcia', 'Lemoine', 'Rousseau', 'Diallo'];
  villes text[] := array['75013 Paris', '94300 Vincennes', '92100 Boulogne-Billancourt', '93100 Montreuil', '75016 Paris'];
  jour date;
  livraison date;
  n int;
  i int;
  id_demande uuid;
  cree timestamptz;
  livre timestamptz;
  meds jsonb;
  tirage float;
begin
  if dispatcheur is null then
    raise exception 'Aucun compte Dispatcheur : lancez d''abord rattacher_profils.sql.';
  end if;

  -- Les demandes de démonstration sont dans le passé : la règle « pas de date
  -- passée » est suspendue le temps du script (et rétablie à la fin, même en
  -- cas d'erreur, car tout le bloc est annulé).
  alter table demandes disable trigger demandes_verifier_jour;

  for jour in select d::date from generate_series(current_date - 120, current_date - 1, interval '1 day') as d loop
    continue when extract(isodow from jour) = 7;
    -- Un peu plus de demandes en début de semaine, moins le samedi.
    n := floor(random() * (case extract(isodow from jour) when 1 then 10 when 6 then 5 else 8 end))::int;

    for i in 1 .. n loop
      cree := (jour + time '08:00' + random() * interval '4 hours') at time zone 'Europe/Paris';
      livraison := case when random() < 0.6 then jour else jour + 1 end;
      if extract(isodow from livraison) = 7 then livraison := livraison + 1; end if;

      select jsonb_agg(jsonb_build_object('nom', m, 'quantite', (1 + floor(random() * 3))::int || ' boîte(s)'))
      into meds
      from (select catalogue[1 + floor(random() * array_length(catalogue, 1))::int] as m
            from generate_series(1, 1 + floor(random() * 3)::int)) as t;

      insert into demandes (patient_nom, patient_adresse, patient_telephone, medicaments, criticite,
                            jour_livraison, cree_par, derniere_activite_par)
      values (
        'DÉMO ' || prenoms[1 + floor(random() * 10)::int] || ' ' || noms[1 + floor(random() * 10)::int],
        (1 + floor(random() * 120)::int) || ' rue de la Démo, ' || villes[1 + floor(random() * 5)::int],
        '06 00 00 00 00',
        meds,
        (array['urgent', 'standard_prioritaire', 'standard', 'standard'])[1 + floor(random() * 4)::int]::niveau_criticite,
        livraison,
        dispatcheur,
        dispatcheur
      )
      returning id into id_demande;

      tirage := random();
      if tirage < 0.12 then
        -- Reportée d'un jour, puis livrée.
        livraison := livraison + case when extract(isodow from livraison) = 6 then 2 else 1 end;
        update demandes set jour_livraison = livraison where id = id_demande;
      end if;

      if tirage < 0.94 and livraison < current_date then
        livre := greatest(
          (livraison + time '10:00' + random() * interval '9 hours') at time zone 'Europe/Paris',
          cree + interval '1 hour');
        update demandes set statut = 'en_cours' where id = id_demande;
        update demandes set statut = 'livree' where id = id_demande;
        update demandes set livree_le = livre, archivee_le = livre, cree_le = cree,
                            mis_a_jour_le = livre, derniere_activite_le = livre
        where id = id_demande;
      elsif tirage >= 0.94 then
        livre := null;
        update demandes set statut = 'annulee' where id = id_demande;
        update demandes set cree_le = cree, mis_a_jour_le = cree + interval '2 hours',
                            derniere_activite_le = cree + interval '2 hours'
        where id = id_demande;
      else
        livre := null;
        update demandes set cree_le = cree, derniere_activite_le = cree where id = id_demande;
      end if;

      -- L'historique a été écrit « maintenant » : on le remet aux bonnes dates.
      update historique h set cree_le = case
          when h.evenement = 'creation' then cree
          when h.evenement = 'report' then cree + interval '1 hour'
          when h.nouvelle_valeur = 'en_cours' then coalesce(livre - interval '1 hour', cree + interval '1 hour')
          when h.nouvelle_valeur = 'livree' then livre
          when h.nouvelle_valeur = 'annulee' then cree + interval '2 hours'
          else h.cree_le
        end
      where h.demande_id = id_demande;
    end loop;
  end loop;

  alter table demandes enable trigger demandes_verifier_jour;
end;
$$;

-- Vérification : nombre de demandes de démonstration par statut.
select statut, count(*) from demandes where patient_nom like 'DÉMO %' group by statut order by statut;


-- -----------------------------------------------------------------------------
-- Pour RETIRER les données de démonstration (sélectionner cette ligne, Run) :
-- delete from demandes where patient_nom like 'DÉMO %';
-- -----------------------------------------------------------------------------
