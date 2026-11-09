-- =============================================================================
-- MEDIDISPATCH — Suppression de l'étape « En cours » (décision du 09/11).
--
-- C'est toujours le livreur qui marque la carte « Livrée » : l'étape
-- intermédiaire « En cours de livraison » n'apporte rien. Désormais :
--
--     NOUVELLE ──► LIVRÉE        (« Récupéré » pour un retour)
--        │  ▲
--        ▼  │  remettre en Nouvelle
--     ANNULÉE ──► supprimée      (Florence)
--
-- 1. Les cartes encore « En cours » repassent en « Nouvelle ».
-- 2. La base n'accepte plus que ces changements de statut (jusqu'ici, seule
--    l'interface les limitait) ; une carte archivée ne change plus de statut.
--
-- La valeur « en_cours » reste connue de la base, pour l'historique des
-- anciennes cartes. Sans danger si on le relance.
-- =============================================================================

-- 1. Cartes encore « En cours » → « Nouvelle » (l'historique le note).
update demandes set statut = 'nouvelle' where statut = 'en_cours';

-- 2. Changements de statut autorisés.
create or replace function verifier_transition_statut()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Une nouvelle demande commence toujours « Nouvelle ».
  if tg_op = 'INSERT' then
    if new.statut <> 'nouvelle' then
      raise exception 'Une nouvelle demande commence toujours « Nouvelle ».'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.statut is not distinct from old.statut then
    return new;
  end if;

  if old.archivee_le is not null then
    raise exception 'Cette demande est archivée : son statut ne peut plus changer.'
      using errcode = 'check_violation';
  end if;

  if new.statut = 'en_cours' then
    raise exception 'L''étape « En cours » n''existe plus : marquez directement la demande « Livrée ».'
      using errcode = 'check_violation';
  end if;

  if not (
       (old.statut in ('nouvelle', 'en_cours') and new.statut in ('livree', 'annulee', 'nouvelle'))
    or (old.statut = 'annulee' and new.statut = 'nouvelle')
  ) then
    raise exception 'Changement de statut impossible : % → %.', old.statut, new.statut
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists demandes_verifier_transition on demandes;
create trigger demandes_verifier_transition
  before insert or update on demandes
  for each row execute function verifier_transition_statut();
