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
      une note (digicode), une ordonnance fictive, un bon de livraison fictif. Il n'y a **pas** de
      liste de médicaments (masquée depuis le 04/11, voir `src/config/fonctionnalites.ts`).
- [ ] Un **dimanche** est refusé ; une date **passée** est refusée.
- [ ] Un fichier Word est refusé ; un fichier de plus de 10 Mo est refusé.
- [ ] La carte apparaît **en tête** de « Nouvelle » avec un numéro `MD-000xx`, même si sa date de
      livraison est plus lointaine (côté Pharmacie : tri « Récentes », choisi par défaut).
- [ ] Le **bon de commande** généré s'ouvre : en-tête FLOPHARMA, patient (sans liste de médicaments),
      encart Notes, zone de signature.
- [ ] Le bon de livraison n'est **pas** généré : celui joint à la création (logiciel de Florence)
      apparaît dans les documents, marqué « joint ». On peut aussi en joindre un après coup
      depuis la fiche (**+ Bon de livraison**).

## 2. Réception côté pharmacie (téléphone)

- [ ] Sans recharger : **son**, **bandeau rouge** « Nouvelle demande », pastille « Non vue ».
- [ ] Toucher le bandeau ouvre la demande ; la pastille disparaît.
- [ ] Côté Florence, le détail indique « Vue par la pharmacie le … ».
- [ ] Le numéro de téléphone du patient est cliquable et lance l'appel.
- [ ] Les onglets Nouvelle / Livrée / Annulée affichent les bons compteurs (plus d'« En cours » depuis le 09/11).

## 3. Livraison (pharmacie, téléphone)

- [ ] **Marquer comme livrée** → côté Florence, la carte change de colonne toute seule et passe
      en « Mise à jour ». Il n'y a plus d'étape « En cours de livraison ».
- [ ] **+ Carte Vitale** : l'appareil photo s'ouvre, la photo s'ajoute à la carte.
- [ ] Ajouter une **deuxième** ordonnance (verso) : acceptée.
- [ ] **Ajouter une photo de preuve** (optionnel), puis **Marquer comme livrée**.
- [ ] L'historique de la carte liste chaque étape, avec l'auteur et l'heure.
- [ ] Sur **ordinateur**, glisser une carte de « Nouvelle » vers « Livrée » : la colonne d'arrivée
      s'entoure de pointillés et la carte change de statut. Pas de retour en arrière.

## 4. Modification et report

- [ ] Florence corrige l'adresse (**Modifier les informations**) → le bon de commande est
      régénéré avec la nouvelle adresse ; l'historique indique « Modification : adresse ».
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
- [ ] Sur une demande : **Ajouter une photo**, **Marquer comme livrée**,
      **Reporter** et **ajouter une note** fonctionnent.
- [ ] **Modifier les informations** et **Annuler la demande** n'apparaissent pas.
- [ ] Côté Florence : le détail indique « Vue par Pharmacie … et Livreurs … » après consultation.

## 7 ter. Retours et reliquats

- [ ] **+ Nouvelle demande** → **Retour** : « Jour de passage », ce qu'il faut récupérer noté dans les **Notes**, aucun PDF
      généré ; la carte porte l'étiquette **Retour**.
- [ ] Côté Livreurs, la Tournée indique « à récupérer » et la note de la carte ;
      **Marquer comme récupéré** passe la carte en « Récupéré ».
- [ ] Sur une livraison : **Créer un reliquat** → seule la date est demandée → une carte « Reliquat de MD-… »
      est créée et s'ouvre ; y joindre le bon de livraison correspondant.
- [ ] **+ Nouvelle demande** → cocher **Livrer en deux fois**, choisir un second jour après le premier →
      deux cartes sont créées : la demande et son « Reliquat de MD-… », chacune avec son bon de commande.
      Un second jour égal ou antérieur au premier est refusé ; la case n'apparaît pas pour un retour.
- [ ] Les deux cartes se renvoient l'une à l'autre ; le bon de commande de la carte d'origine
      indique « Reliquat à suivre », celui du reliquat « Reliquat de la commande … ».
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

## 7 quinquies. Sélection de plusieurs cartes

- [ ] **Sélectionner** (au-dessus des cartes, sous les filtres) : une case apparaît sur chaque carte ; un clic coche
      la carte au lieu d'ouvrir sa fiche. **Échap** ou **✕** quitte le mode sélection.
- [ ] **Tout sélectionner** coche une colonne (ou un jour dans la vue semaine).
- [ ] La barre indique pour chaque action le nombre de cartes concernées, par ex. « Archiver (1) ».
- [ ] **Reporter au…** : toutes les cartes cochées passent au jour choisi ; leur bon de commande est mis à jour.
- [ ] **Annuler** et **Supprimer** demandent une confirmation listant les tickets.
- [ ] Pharmacie : pas de **Supprimer**. Livreurs : seulement **Marquer livrées**
      (la Tournée bascule sur le tableau en mode sélection).

## 7 sexies. Livreurs, secteurs et logisticien

- [ ] Créer le compte du logisticien (Authentication → Add user), puis lancer
      `supabase/scripts/ajouter_compte_logisticien.sql` (e-mail et prénom remplacés).
- [ ] Logisticien : boutons Tableau / **Répartition** / Statistiques ; pas de « Nouvelle demande » ni de chat.
- [ ] Répartition → **Livreurs** : ajouter 3 prénoms, en renommer un, en désactiver un puis le réactiver.
- [ ] Choisir seulement le secteur d'une carte : elle reste « À classer » (« Choisissez aussi le livreur »).
      Choisir ensuite le livreur : elle passe en Est, chez ce livreur ; message « Est · Karim ».
- [ ] Compte Livreurs **sur téléphone**, vue tableau et Tournée : l'écran défile au doigt jusqu'à la dernière carte.
- [ ] **Sélectionner** → Tout sélectionner (À classer) → **Secteur Ouest**, puis **Attribuer à…** un livreur.
- [ ] Le résumé du jour indique le nombre de passages par livreur ; « à classer » disparaît quand tout est classé.
- [ ] Tous les comptes : sur une carte « Nouvelle », la fiche propose directement **Marquer comme livrée** ;
      Faire signer et la photo sont disponibles dès « Nouvelle ».
- [ ] Tournée : chaque carte a **Waze** et **Livrée** (ou **Récupéré**) ; une confirmation est demandée, puis la
      carte passe dans « Terminées aujourd'hui ».
- [ ] Compte **Livreurs** (téléphone) : « Qui livre aujourd'hui ? » → choisir un prénom → la Tournée ne montre
      que ses livraisons ; **changer** permet de prendre un autre prénom ; le choix est gardé au rechargement.
- [ ] Logisticien : la barre du haut a 4 boutons, Tableau / **Tournée** / Répartition / Statistiques ; « Tournée »
      ouvre sa tournée du jour depuis n'importe quel écran (téléphone compris).
- [ ] Logisticien qui livre : s'attribuer des cartes ; dans **Tournée**, « Tournée de : » propose d'abord sa
      propre tournée (livreur portant le même prénom que son compte) ; « Tous les livreurs » ou un autre prénom
      pour suivre l'équipe ; le choix est gardé au rechargement.
- [ ] Florence : étiquettes « Est · Karim », filtres Secteur et Livreur ; **pas** de Répartition ni de menus
      Secteur / Livreur dans la fiche (décision du 09/11, migration 0019).
- [ ] Pharmacie : Tableau / **Répartition** / Statistiques ; elle peut classer, attribuer et gérer les livreurs.
- [ ] La fiche d'une carte répartie montre « Répartition : Est · Karim » dans l'historique.

## 7 septies. Signature du patient (téléphone du livreur)

- [ ] Sur une carte « Nouvelle » ou « Livrée » : **Faire signer** → encart plein écran ; « Signé par » prérempli avec le patient.
- [ ] Signer au doigt : la page ne bouge pas ; **Effacer** recommence ; **Valider** est grisé tant que rien n'est signé.
- [ ] Modifier « Signé par » (ex. « Mme Durand (sa fille) ») → message « Signature … enregistrée et ajoutée au bon de commande ».
- [ ] Dans la fiche : document **Signature**, historique « Signature de … » ; le bouton devient **Refaire signer**.
- [ ] Ouvrir le **bon de commande** : « Reçu le JJ/MM/AAAA à HH h MM », le nom du signataire et la signature dans le cadre.
- [ ] Sur un **retour** : la signature est enregistrée, sans PDF.

## 7 octies. Statuts simplifiés (migration 0018)

- [ ] Après 0018, plus aucune carte « En cours » ; les anciennes sont revenues en « Nouvelle » (historique).
- [ ] Une carte livrée ne peut plus repasser en « Nouvelle » ni être annulée ; une carte archivée ne change plus
      de statut ; une carte annulée peut être remise en « Nouvelle ».

## 8. Robustesse

- [ ] Sur téléphone, une alerte (nouvelle demande, mise à jour, message) ou un bandeau de confirmation /
      d'erreur se ferme en le **balayant du doigt** vers la gauche ou la droite ; un petit glissement le
      laisse en place ; le bouton × marche toujours, et un appui sur l'alerte ouvre la demande.

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
