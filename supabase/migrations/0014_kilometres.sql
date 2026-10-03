-- =============================================================================
-- MEDIDISPATCH — Kilomètres estimés (décision du 03/10).
--
-- Pour chaque jour, le trajet est reconstitué : pharmacie → adresses des
-- passages terminés (livraisons et retours), dans l'ordre où ils ont été
-- marqués « Livrée » / « Récupéré » → retour à la pharmacie. Le calcul est
-- fait par l'application (services publics de l'IGN) ; la base garde deux
-- caches, pour ne pas refaire le travail :
--   * adresses_geocodees : position de chaque adresse (aucun nom de patient) ;
--   * kilometres_jour    : résultat de chaque journée.
-- Rien n'est écrit dans « demandes » : les cartes ne sont pas marquées
-- « Mise à jour » par ce calcul.
--
-- Sans danger si on le relance.
-- =============================================================================

create table if not exists adresses_geocodees (
  adresse     text primary key,            -- adresse normalisée (minuscules, espaces simples)
  latitude    double precision,
  longitude   double precision,
  trouvee     boolean not null,            -- faux : adresse non reconnue (pas de nouvel essai inutile)
  calcule_le  timestamptz not null default now()
);

create table if not exists kilometres_jour (
  jour         date primary key,
  km           numeric(7, 1) not null check (km >= 0),
  nb_passages  int not null,
  methode      text not null check (methode in ('route', 'vol_oiseau')),
  signature    text not null,              -- passages du jour, dans l'ordre : s'il change, on recalcule
  calcule_le   timestamptz not null default now()
);

alter table adresses_geocodees enable row level security;
alter table kilometres_jour enable row level security;

drop policy if exists "adresses_geocodees_lecture" on adresses_geocodees;
create policy "adresses_geocodees_lecture" on adresses_geocodees
  for select to authenticated using (est_utilisateur_autorise());
drop policy if exists "adresses_geocodees_ajout" on adresses_geocodees;
create policy "adresses_geocodees_ajout" on adresses_geocodees
  for insert to authenticated with check (est_utilisateur_autorise());
drop policy if exists "adresses_geocodees_maj" on adresses_geocodees;
create policy "adresses_geocodees_maj" on adresses_geocodees
  for update to authenticated using (est_utilisateur_autorise()) with check (est_utilisateur_autorise());

drop policy if exists "kilometres_jour_lecture" on kilometres_jour;
create policy "kilometres_jour_lecture" on kilometres_jour
  for select to authenticated using (est_utilisateur_autorise());
drop policy if exists "kilometres_jour_ajout" on kilometres_jour;
create policy "kilometres_jour_ajout" on kilometres_jour
  for insert to authenticated with check (est_utilisateur_autorise());
drop policy if exists "kilometres_jour_maj" on kilometres_jour;
create policy "kilometres_jour_maj" on kilometres_jour
  for update to authenticated using (est_utilisateur_autorise()) with check (est_utilisateur_autorise());
