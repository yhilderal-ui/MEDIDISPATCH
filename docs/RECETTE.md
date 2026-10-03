# MEDIDISPATCH — Recette avant mise en service

La recette, c'est la vérification finale : on déroule des situations réelles, à deux,
et on coche ce qui fonctionne. Tout ce qui ne fonctionne pas est noté (avec une capture
d'écran) et corrigé avant la mise en service.

**Qui ?** Florence (compte Dispatcheur) sur son ordinateur, la pharmacie (compte
Pharmacie) et un livreur (compte Livreurs) sur **un téléphone**, en même temps.
**Où ?** Sur https://www.medi-dispatch.fr
**Avec quoi ?** Uniquement des **patients et documents fictifs**.
**Durée :** environ 45 minutes.

---

## 0. Préparation

- [ ] Les deux comptes se connectent (e-mail + mot de passe).
- [ ] Un mauvais mot de passe affiche « E-mail ou mot de passe incorrect ».
- [ ] Le badge en haut affiche « Dispatcheur » (Florence) et « Pharmacie ».
- [ ] Sur le téléphone : menu du navigateur → **« Ajouter à l'écran d'accueil »**. L'icône
      MediDispatch apparaît et ouvre l'application en plein écran.
- [ ] Chacun clique une fois dans la page (autorise le son) et laisse la cloche activée.

## 1. Création d'une demande (Florence)

- [ ] **+ Nouvelle demande** : nom, téléphone, adresse, date du jour, criticité Urgent,
      deux médicaments avec quantités, une note (digicode), une ordonnance fictive.
- [ ] Un **dimanche** est refusé ; une date **passée** est refusée.
- [ ] Un fichier Word est refusé ; un fichier de plus de 10 Mo est refusé.
- [ ] La carte apparaît dans « Nouvelle » avec un numéro `MD-000xx`.
- [ ] Le **bon de commande** généré s'ouvre : en-tête FLOPHARMA, patient, médicaments,
      encart Notes, zone de signature.
- [ ] Le **bon de livraison** généré s'ouvre : le même document, **sans** la liste des médicaments.

## 2. Réception côté pharmacie (téléphone)

- [ ] Sans recharger : **son**, **bandeau rouge** « Nouvelle demande », pastille « Non vue ».
- [ ] Toucher le bandeau ouvre la demande ; la pastille disparaît.
- [ ] Côté Florence, le détail indique « Vue par la pharmacie le … ».
- [ ] Le numéro de téléphone du patient est cliquable et lance l'appel.
- [ ] Les onglets Nouvelle / En cours / Livrée / Annulée affichent les bons compteurs.

## 3. Livraison (pharmacie, téléphone)

- [ ] **Passer « En cours de livraison »** → côté Florence, la carte change de colonne
      toute seule et passe en « Mise à jour ».
- [ ] **+ Carte Vitale** : l'appareil photo s'ouvre, la photo s'ajoute à la carte.
- [ ] Ajouter une **deuxième** ordonnance (verso) : acceptée.
- [ ] **Ajouter une photo de preuve** (optionnel), puis **Marquer comme livrée**.
- [ ] L'historique de la carte liste chaque étape, avec l'auteur et l'heure.

## 4. Modification et report

- [ ] Florence corrige l'adresse (**Modifier les informations**) → le bon de commande et le
      bon de livraison sont régénérés avec la nouvelle adresse ; l'historique indique « Modification : adresse ».
- [ ] La pharmacie reporte une demande au lendemain → elle change de colonne dans la
      vue semaine ; l'historique indique le report.
- [ ] Dans la vue semaine sur ordinateur, glisser une carte vers un autre jour la reporte.

## 5. Chat

- [ ] Florence écrit → côté pharmacie : son, bandeau, pastille sur le bouton du chat.
- [ ] Le chat s'ouvre en plein écran sur le téléphone ; « Vu ✓ » apparaît côté Florence.
- [ ] Le titre de l'onglet affiche « (N) MediDispatch » quand des nouveautés attendent.

## 6. Recherche, filtres, archives

- [ ] La recherche trouve un patient sans les accents, et un ticket par son numéro.
- [ ] Les filtres statut / criticité / date fonctionnent (sur téléphone : bouton « Filtres »).
- [ ] Sur une demande livrée, **Archiver maintenant** la fait passer du tableau aux **Archives**.
- [ ] Le lendemain, les demandes livrées la veille sont passées toutes seules dans les **Archives**.
- [ ] Dans les Archives, la recherche retrouve aussi une demande de plus de 30 jours (par nom sans accent ou par n° de ticket).

## 7. Annulation et suppression

- [ ] La pharmacie peut **annuler** une demande (avec confirmation).
- [ ] Seule Florence voit **Supprimer définitivement** sur une demande annulée ; une simple
      confirmation (OK / Annuler) suffit, sans retaper le numéro de ticket.
- [ ] La carte disparaît des deux écrans.

## 7 bis. Compte Livreurs (téléphone du livreur)

- [ ] À la connexion, l'écran **Tournée** s'affiche, avec le badge « Livreurs ».
- [ ] Pas de bouton **Statistiques**, pas de bulle de **chat**, pas de **+ Nouvelle demande**.
- [ ] Sur une demande : **Passer en cours**, **Ajouter une photo**, **Marquer comme livrée**,
      **Reporter** et **ajouter une note** fonctionnent.
- [ ] **Modifier les informations** et **Annuler la demande** n'apparaissent pas.
- [ ] Côté Florence : le détail indique « Vue par Pharmacie … et Livreurs … » après consultation.

## 7 ter. Retours et reliquats

- [ ] **+ Nouvelle demande** → **Retour** : « Jour de passage », « Médicaments à récupérer », aucun PDF
      généré ; la carte porte l'étiquette **Retour**.
- [ ] Côté Livreurs, la Tournée indique « à récupérer » et la liste des médicaments à reprendre ;
      **Marquer comme récupéré** passe la carte en « Récupéré ».
- [ ] Sur une livraison : **Créer un reliquat** → un médicament « Partagé » (2 + 2), un autre « Plus tard »,
      date au choix → une carte « Reliquat de MD-… » est créée et s'ouvre.
- [ ] Les deux cartes se renvoient l'une à l'autre ; les bons de la carte d'origine indiquent
      « Reliquat à suivre », ceux du reliquat « Reliquat de la commande … ».
- [ ] Le compte Livreurs ne voit pas **Créer un reliquat**.

## 7 quater. Kilomètres estimés (Statistiques)

- [ ] Sur la base de test : lancer `supabase/scripts/demo_tournee_77.sql`, puis marquer 3 ou 4 passages
      **Livrée** / **Récupéré** dans un ordre choisi.
- [ ] **Statistiques → Ce mois** : « Calcul des kilomètres… » puis la tuile **Km estimés** (et le km
      par passage) et le graphique « Kilomètres estimés ».
- [ ] Ordre de grandeur cohérent avec Google Maps / Waze pour le trajet pharmacie → adresses dans
      l'ordre des passages → retour à la pharmacie.
- [ ] Recharger la page : les kilomètres s'affichent tout de suite (calcul gardé en mémoire).
- [ ] Marquer un passage de plus : le total augmente.
- [ ] **Exporter (Excel)** : onglet **Kilomètres** (jour, passages, km, méthode) et ligne « Km estimés »
      dans la Synthèse.
- [ ] Si un message signale une adresse « non reconnue », vérifier l'orthographe de l'adresse.

## 8. Robustesse

- [ ] Recharger la page (F5) : rien n'est perdu.
- [ ] Couper le Wi-Fi du téléphone puis le rétablir : les nouveautés arrivent après
      reconnexion (sinon, recharger la page).
- [ ] Se déconnecter / se reconnecter : on retrouve tout.

---

## Avant d'utiliser de vraies données patients

Ces points ne sont **pas techniques** mais sont **bloquants** (cahier des charges, section 13) :

- [ ] **Hébergement HDS** : Supabase et Vercel ne sont pas certifiés « Hébergeur de
      Données de Santé ». Avec de vraies ordonnances, cartes Vitale ou mutuelles, il faut
      un hébergement certifié (à voir avec un professionnel).
- [ ] **RGPD** : base légale du traitement, information des patients, registre des
      traitements.
- [ ] **Durée de conservation** des demandes et documents archivés.
- [ ] **Adresses envoyées à l'extérieur** : Waze / Google Maps (bouton itinéraire) et les services
      publics de l'IGN (kilomètres estimés, sans nom de patient) ; positions gardées dans la table
      `adresses_geocodees`. À mentionner au registre des traitements.
- [ ] **Mots de passe** forts et propres à chaque compte, jamais partagés par message.

---

## 9. Remise à zéro avant la mise en service

Une fois la recette validée, on efface toutes les données de test pour démarrer propre.
**À faire une seule fois, juste avant le premier jour d'utilisation réelle.**

1. **Prévenir** Florence et la pharmacie : ne rien créer pendant les 5 minutes du nettoyage.
2. **Supabase → SQL Editor → + New query** : coller le contenu de
   `supabase/scripts/nettoyer_donnees_test.sql` → **Run** → confirmer l'avertissement
   « destructive operations ». Le tableau final doit afficher `0` partout et `comptes = 2`.
3. **Supabase → Storage → `documents`** : sélectionner tous les dossiers → **Delete**
   (ou menu ⋯ du bucket → **Empty bucket**). Ce sont les PDF et photos de test.
   ⚠️ Ne pas supprimer le bucket lui-même, seulement son contenu.
4. **Vérifier** : se connecter sur www.medi-dispatch.fr → tableau vide, chat vide ;
   créer une demande → elle porte le numéro **MD-00001** → l'annuler puis la supprimer
   (ou la garder si c'est une vraie demande).

Ce qui est conservé : les deux comptes et leurs mots de passe, les réglages, la structure
de la base.
