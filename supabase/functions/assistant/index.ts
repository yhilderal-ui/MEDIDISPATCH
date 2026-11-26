// =============================================================================
// MEDIDISPATCH — Assistant d'aide (Edge Function Supabase « assistant »).
//
// Répond aux questions sur l'UTILISATION de MediDispatch, à partir du guide
// docs/GUIDE_UTILISATION.md (recopié plus bas). L'assistant n'a accès à AUCUNE
// demande ni donnée patient : il ne reçoit que la question, les derniers
// échanges de la conversation et le type de compte connecté.
//
// ⚠️ FICHIER EN PARTIE GÉNÉRÉ : le guide est recopié par « npm run ia:fonctions ».
//    Modifier docs/GUIDE_UTILISATION.md, puis relancer cette commande.
//
// Déploiement : Supabase → Edge Functions → Deploy a new function → Via Editor
// → nom « assistant » → coller ce fichier → Deploy (voir docs/ENVIRONNEMENTS.md).
// Secret nécessaire : ANTHROPIC_API_KEY (Edge Functions → Secrets).
// =============================================================================

import Anthropic from 'npm:@anthropic-ai/sdk@1.14.0';
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

const MODELE = 'claude-opus-5-5';
const QUESTIONS_PAR_JOUR = 40;
const LONGUEUR_MAX_QUESTION = 1000;
const LONGUEUR_MAX_MESSAGE = 4000;
const MESSAGES_HISTORIQUE_MAX = 12; // 6 échanges

// Libellés et droits des comptes, repris de src/lib/roles.ts (à garder en phase).
const COMPTES: Record<string, { libelle: string; droits: string }> = {
  dispatcheur: {
    libelle: 'Dispatcheur (Florence)',
    droits:
      'Peut : créer des demandes, modifier les informations, créer des reliquats, reporter, annuler, supprimer une demande annulée, marquer livrée, faire signer, chat, statistiques. Ne peut pas : répartir (secteur Est / Ouest, livreur).',
  },
  livraison: {
    libelle: 'Pharmacie',
    droits:
      'Peut : modifier les informations, créer des reliquats, reporter, annuler, marquer livrée, faire signer, chat, statistiques, répartition et gestion des livreurs. Ne peut pas : créer une demande, supprimer définitivement.',
  },
  livreur: {
    libelle: 'Livreurs (compte partagé)',
    droits:
      'Peut : voir sa Tournée, marquer livrée ou récupéré, reporter, ajouter une note ou une photo, faire signer. Ne peut pas : créer, modifier les informations, annuler, supprimer, chat, statistiques, répartition.',
  },
  logisticien: {
    libelle: 'Logisticien (Angel)',
    droits:
      'Peut : répartition et gestion des livreurs, sa Tournée, reporter, annuler, marquer livrée, faire signer, statistiques. Ne peut pas : créer une demande, modifier les informations du patient, chat, supprimer.',
  },
};

const CONSIGNES = `Tu es l'assistant d'aide de MediDispatch, une application de suivi des livraisons de médicaments et de matériel médical entre une dispatcheuse (Florence), une pharmacie, des livreurs et un logisticien (Angel).

Règles :
- Réponds en français, simplement et brièvement : quelques phrases ou une courte liste d'étapes.
- Appuie-toi uniquement sur le guide d'utilisation ci-dessous. N'invente jamais de bouton, d'écran ni de fonction.
- Si la réponse n'est pas dans le guide, dis-le honnêtement et propose de contacter l'administratrice de l'application.
- Tiens compte du compte connecté : si l'action demandée lui est interdite, dis-le et indique quel compte peut la faire.
- Tu n'as accès à aucune demande ni à aucune donnée de l'application : tu ne peux ni consulter, ni rechercher, ni modifier une carte.
- Si la personne écrit un nom ou une information sur un patient, ne la répète pas et rappelle gentiment de ne pas en écrire ici.
- Aucun conseil médical.
- Mise en forme : texte simple ; listes avec « - » ou « 1. » ; **gras** autorisé ; pas de titres, pas de tableaux, pas de liens.`;

// <<GUIDE — généré par « npm run ia:fonctions » à partir de docs/GUIDE_UTILISATION.md
const GUIDE = `# MediDispatch — Guide d'utilisation

MediDispatch sert à suivre les demandes de livraison de médicaments et de matériel médical
entre Florence (la dispatcheuse), la pharmacie, les livreurs et le logisticien.

Ce guide sert aussi de base à l'**assistant d'aide** (bouton « ? » en bas à gauche de l'écran) :
s'il change, régénérer l'assistant avec \`npm run ia:fonctions\`.

---

## 1. Les comptes

| Compte | Qui | Ce qu'il peut faire |
|---|---|---|
| **Dispatcheur** | Florence | Créer les demandes, modifier les informations du patient, créer des reliquats, reporter, annuler, supprimer définitivement une demande annulée, chat, statistiques. Pas de répartition Est / Ouest. |
| **Pharmacie** | la pharmacie | Modifier les informations, créer des reliquats, reporter, annuler, marquer livrée, chat, statistiques, **répartition** (remplace le logisticien). Ne crée pas de demande et ne supprime pas. |
| **Livreurs** | compte partagé par les livreurs | Voir **ses** livraisons du jour (Tournée), marquer livrée ou récupéré, reporter, ajouter une note ou une photo, faire signer le patient. Pas de chat, pas de statistiques, pas de modification des informations, pas d'annulation. |
| **Logisticien** | Angel | **Répartition** (secteur Est / Ouest et livreur), sa propre **Tournée**, reporter, annuler, marquer livrée, statistiques. Ne crée pas de demande, ne modifie pas les informations du patient, pas de chat. |

Se connecter : e-mail et mot de passe. Les mots de passe sont personnels et ne s'envoient jamais par message.
Se déconnecter : bouton **Déconnexion** en haut à droite (ne déconnecte que cet appareil).

Sur téléphone, on peut installer l'application : menu du navigateur → **Ajouter à l'écran d'accueil**.

---

## 2. Les écrans

- **Tableau** : toutes les demandes en cours.
  - **Vue par statut** : une colonne par statut (Nouvelle, Livrée, Annulée). Sur téléphone, les colonnes
    deviennent des onglets avec un compteur.
  - **Vue semaine** : une colonne par jour, du lundi au samedi ; flèches pour changer de semaine.
  - Les cartes les plus récentes sont en tête de colonne.
- **Tournée** : les livraisons du jour d'un livreur, dans l'ordre, avec les boutons **Waze** et **Livrée**.
  C'est l'écran d'accueil du compte Livreurs ; le logisticien y accède par le bouton **Tournée**.
- **Répartition** (logisticien et pharmacie) : classer les livraisons du jour en Est / Ouest et les attribuer.
- **Statistiques** (tous sauf Livreurs) : chiffres de la période, graphiques, kilomètres estimés, export Excel.
- **Archives** (bouton **Archives** à droite des filtres) : les demandes livrées et archivées.
- Un clic sur le logo **MediDispatch** ramène au tableau de départ.

---

## 3. Les demandes

### Statuts
Il n'y a que trois statuts :

- **Nouvelle** → **Livrée** (pour un retour de matériel : **Récupéré**) ;
- **Nouvelle** → **Annulée** ; une demande annulée peut être **remise en Nouvelle** ;
- une demande livrée ne peut plus être annulée ni repasser en Nouvelle ;
- l'étape « En cours de livraison » n'existe plus (supprimée le 09/11).

### Criticité
**Urgent** (rouge), **Standard prioritaire** (orange), **Standard** (vert).

### Créer une demande (Florence)
1. Bouton **+ Nouvelle demande**.
2. Choisir **Livraison** ou **Retour** (matériel à récupérer chez le patient).
3. Remplir : nom du patient, téléphone, adresse, jour de livraison, criticité, notes (digicode, étage…).
4. Joindre si besoin : ordonnance, carte Vitale, mutuelle, **bon de livraison** (celui du logiciel de Florence).
   Formats acceptés : PDF et photos, 10 Mo maximum. Les fichiers Word sont refusés.
5. **Créer**. La carte apparaît en tête de la colonne « Nouvelle » avec un numéro \`MD-00001\`, \`MD-00002\`…

Règles : pas de livraison le **dimanche**, pas de date **passée**.
Le **bon de commande** (PDF) est généré automatiquement pour une livraison ; rien n'est généré pour un retour.
La liste des médicaments n'est pas demandée pour l'instant (masquée).

### Livrer en deux fois (reliquat)
- **À la création** : cocher **Livrer en deux fois** et choisir un second jour, **après** le premier.
  Deux cartes sont créées : la demande et son « Reliquat de MD-… ».
- **Après coup** : dans la fiche d'une livraison, **Créer un reliquat** → choisir la date.
- Les deux cartes se renvoient l'une à l'autre ; le bon de commande indique « Reliquat à suivre ».
- Réservé à Florence et à la pharmacie.

### Ouvrir une demande (la fiche)
Un clic sur une carte ouvre sa fiche : informations, documents, notes, historique.
- **Marquer comme livrée** (ou **Marquer comme récupéré** pour un retour), avec confirmation.
- **Reporter** : choisir un autre jour. Sur ordinateur, on peut aussi glisser la carte vers un autre jour
  dans la vue semaine.
- **Modifier les informations** (Florence, pharmacie) : le bon de commande est régénéré.
- **Ajouter une note**, **+ Carte Vitale**, **+ Ordonnance**, **+ Bon de livraison**, **photo de preuve**.
- **Faire signer** le patient (voir plus bas).
- **Annuler la demande** (tous sauf Livreurs), avec confirmation ; **Remettre en « Nouvelle demande »** sur une demande annulée.
- **Supprimer définitivement** : seulement Florence, seulement une demande **annulée**.
- **Archiver maintenant** : sur une demande livrée. Sinon, les demandes livrées passent toutes seules
  dans les Archives le lendemain.
- Sur ordinateur, on peut aussi glisser une carte de « Nouvelle » vers « Livrée ».
- L'**historique** liste chaque étape avec son auteur et l'heure.
- Le téléphone du patient est cliquable (appel direct) ; l'adresse ouvre Waze ou Google Maps.

### Signature du patient
1. Dans la fiche de la carte : **Faire signer** (dès qu'une carte est « Nouvelle » ou « Livrée »).
2. Le patient signe au doigt dans l'encart. **Effacer** pour recommencer.
3. « Signé par » est prérempli avec le nom du patient ; le modifier si un proche signe (ex. « sa fille »).
4. **Valider** : la signature est ajoutée aux documents et **incrustée dans le bon de commande**
   (« Reçu le … à … »). Sur un retour, elle est enregistrée sans PDF.
5. La signature est facultative. **Refaire signer** remplace la précédente.

---

## 4. Plusieurs cartes à la fois (sélection)
1. Bouton **Sélectionner** (au-dessus des cartes, sous les filtres).
2. Toucher les cartes à cocher, ou **Tout sélectionner** pour une colonne ou un jour.
3. Choisir une action dans la barre noire en bas : **Marquer livrées**, **Reporter au…**, **Archiver**,
   **Annuler**, **Supprimer** (Florence), **Secteur Est / Ouest** et **Attribuer à…** (logisticien, pharmacie).
   Le chiffre entre parenthèses indique combien de cartes cochées sont concernées.
4. **Échap** ou **✕** pour quitter la sélection.

Le compte Livreurs n'a que **Marquer livrées**.

---

## 5. Répartition et tournées (logisticien et pharmacie)

### Gérer la liste des livreurs
Écran **Répartition** → **Livreurs** : ajouter un prénom, le renommer, le **désactiver** (il n'est plus proposé,
mais l'historique est conservé) ou le réactiver.

### Répartir les livraisons du jour
- Choisir le jour (aujourd'hui par défaut, flèches ‹ ›).
- Trois colonnes : **À classer**, **Est**, **Ouest** ; dans Est et Ouest, les cartes sont groupées par livreur.
- Sur chaque carte, choisir le **secteur** ET le **livreur** : la carte n'est classée que lorsque les deux
  sont choisis (sinon : « Choisissez aussi le livreur »).
- En masse : **Sélectionner** → **Tout sélectionner** → **Secteur Est / Ouest**, puis **Attribuer à…**.
- La répartition ne déclenche pas d'alerte « Mise à jour » chez les autres comptes.
- Florence voit les étiquettes « Est · Prénom » et peut filtrer par secteur et livreur, mais ne répartit pas.

### Compte Livreurs
- À l'ouverture : « **Qui livre aujourd'hui ?** » → toucher son prénom. Le choix est gardé sur le téléphone ;
  **changer** (à côté du badge) permet de prendre un autre prénom.
- La **Tournée** ne montre que les livraisons attribuées à ce prénom, pour aujourd'hui.
- Chaque carte a **Waze** (itinéraire) et **Livrée** ou **Récupéré**, avec confirmation ; la carte passe
  ensuite dans « Terminées aujourd'hui ».
- Si un prénom manque dans la liste, demander au logisticien ou à la pharmacie de l'ajouter.

### Logisticien qui livre
Bouton **Tournée** → « Tournée de : » propose d'abord sa propre tournée ; « Tous les livreurs » ou un autre
prénom permet de suivre l'équipe.

---

## 6. Recherche et filtres
- La **recherche** trouve un patient sans tenir compte des accents, ou une demande par son numéro (\`MD-00012\`).
- **Filtres** : statut, criticité, date, secteur, livreur. Sur téléphone : bouton **Filtres**.
- Les Archives ont leur propre recherche, y compris pour les demandes anciennes.

---

## 7. Alertes et chat
- Une nouveauté (nouvelle demande, mise à jour, message) déclenche un **son**, un **bandeau** et une
  **pastille** sur la carte : « Non vue » ou « Mise à jour ». Ouvrir la carte retire la pastille.
- Toucher le bandeau ouvre la demande ; sur téléphone, on peut le **balayer du doigt** pour le fermer.
- Si beaucoup de cartes changent d'un coup (plus de 3), une seule alerte « n demandes mises à jour » s'affiche.
- La **cloche** en haut active ou coupe le son. Sur ordinateur, cliquer une fois dans la page autorise le son.
- Le titre de l'onglet affiche « (N) MediDispatch » quand des nouveautés attendent.
- Florence voit « Vue par la pharmacie le … » dans la fiche.
- **Chat** (Florence et pharmacie uniquement) : bulle en bas à droite de l'écran ; « Vu ✓ » quand le message est lu.

---

## 8. Statistiques
- Périodes : cette semaine, ce mois, mois précédent, 90 derniers jours, cette année, dates au choix ;
  comparaison avec la période précédente.
- Chiffres : demandes créées, livrées, retours récupérés, reports, annulations ; graphiques par jour,
  semaine ou mois et par jour de la semaine.
- **Km estimés** : trajet pharmacie → passages dans l'ordre où ils ont été marqués livrés → retour à la
  pharmacie. C'est une estimation ; si une adresse est « non reconnue », vérifier son orthographe.
- **Exporter (Excel)** : synthèse, détail des demandes et kilomètres.

---

## 9. En cas de problème
- **Rien ne se met à jour** : vérifier la connexion internet, puis recharger la page (rien n'est perdu).
- « **Failed to fetch** » à la connexion : le service est momentanément indisponible ; réessayer plus tard
  et prévenir l'administratrice si cela dure.
- « **Ce compte n'est pas autorisé** » : le compte n'a pas de profil MediDispatch ; contacter l'administratrice.
- Un bouton attendu n'apparaît pas : il est peut-être réservé à un autre compte (voir le tableau du §1),
  ou l'écran garde une ancienne version en mémoire (recharger la page).
- **Données patients** : pour l'instant, uniquement des données **fictives** (en attente de l'hébergement
  de santé certifié HDS). Ne jamais écrire de nom ni d'information de patient dans l'assistant d'aide.`;
// GUIDE>>

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function repondre(statut: number, corps: Record<string, unknown>): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function erreur(statut: number, code: string, message: string): Response {
  return repondre(statut, { code, message });
}

interface MessageHistorique {
  role: 'user' | 'assistant';
  texte: string;
}

// Garde les derniers échanges bien formés, en commençant par une question.
function nettoyerHistorique(brut: unknown): MessageHistorique[] {
  if (!Array.isArray(brut)) return [];
  const propres = brut
    .filter(
      (m): m is MessageHistorique =>
        !!m &&
        typeof m === 'object' &&
        ((m as MessageHistorique).role === 'user' || (m as MessageHistorique).role === 'assistant') &&
        typeof (m as MessageHistorique).texte === 'string' &&
        (m as MessageHistorique).texte.trim() !== '',
    )
    .map(m => ({ role: m.role, texte: m.texte.slice(0, LONGUEUR_MAX_MESSAGE) }))
    .slice(-MESSAGES_HISTORIQUE_MAX);
  while (propres.length > 0 && propres[0].role !== 'user') propres.shift();
  return propres;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return erreur(405, 'requete', 'Méthode non autorisée.');

  // 1. Qui pose la question ? (jeton de la personne connectée, jamais de clé secrète)
  const autorisation = req.headers.get('Authorization') ?? '';
  const jeton = autorisation.replace(/^Bearer\s+/i, '');
  const cleProjet = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const urlProjet = Deno.env.get('SUPABASE_URL') ?? '';
  if (!jeton || !cleProjet || !urlProjet) return erreur(401, 'non_connecte', 'Connexion requise.');

  const supabase = createClient(urlProjet, cleProjet, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: utilisateur, error: erreurUtilisateur } = await supabase.auth.getUser(jeton);
  if (erreurUtilisateur || !utilisateur.user) return erreur(401, 'non_connecte', 'Connexion requise.');

  const { data: profil } = await supabase.from('profils').select('role').eq('id', utilisateur.user.id).maybeSingle();
  const compte = profil ? COMPTES[String(profil.role)] : undefined;
  if (!compte) return erreur(403, 'non_autorise', "Ce compte n'est pas autorisé sur MediDispatch.");

  // 2. La question.
  let corps: { question?: unknown; historique?: unknown };
  try {
    corps = await req.json();
  } catch {
    return erreur(400, 'requete', 'Requête illisible.');
  }
  const question = typeof corps.question === 'string' ? corps.question.trim() : '';
  if (!question) return erreur(400, 'requete', 'Question vide.');
  if (question.length > LONGUEUR_MAX_QUESTION) {
    return erreur(400, 'requete', `Question trop longue (${LONGUEUR_MAX_QUESTION} caractères au maximum).`);
  }

  // 3. Limite de questions par jour et par compte.
  const { data: dejaPosees, error: erreurQuota } = await supabase.rpc('ia_questions_aujourdhui');
  if (erreurQuota) return erreur(500, 'installation', "L'assistant n'est pas encore installé sur cette base (migration 0021).");
  if (Number(dejaPosees) >= QUESTIONS_PAR_JOUR) {
    return erreur(429, 'quota', `Limite de ${QUESTIONS_PAR_JOUR} questions par jour atteinte. Réessayez demain.`);
  }

  const cleIA = Deno.env.get('ANTHROPIC_API_KEY');
  if (!cleIA) return erreur(503, 'non_configure', "L'assistant n'est pas encore configuré (clé ANTHROPIC_API_KEY manquante).");

  // 4. Appel à l'IA : consignes + guide (mis en cache), puis le compte connecté.
  const messages = [
    ...nettoyerHistorique(corps.historique).map(m => ({ role: m.role, content: m.texte })),
    { role: 'user' as const, content: question },
  ];

  const client = new Anthropic({ apiKey: cleIA });
  let reponse: Anthropic.Beta.BetaMessage;
  try {
    reponse = await client.beta.messages.create({
      model: MODELE,
      max_tokens: 2000,
      // Si le modèle refuse une question par excès de prudence, l'API la
      // relance d'elle-même sur un autre modèle.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [
        {
          type: 'text',
          text: `${CONSIGNES}\n\n<guide>\n${GUIDE}\n</guide>`,
          cache_control: { type: 'ephemeral' },
        },
        { type: 'text', text: `Compte connecté : ${compte.libelle}. ${compte.droits}` },
      ],
      messages,
    });
  } catch (e) {
    console.error('Appel IA impossible', e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return erreur(502, 'ia', "L'assistant est momentanément indisponible. Réessayez dans un instant.");
  }

  const texte =
    reponse.stop_reason === 'refusal'
      ? "Je ne peux pas répondre à cette question. Je réponds uniquement aux questions sur l'utilisation de MediDispatch."
      : reponse.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
          .map(b => b.text)
          .join('\n')
          .trim();

  // 5. Suivi d'utilisation (sans le texte de la question ni de la réponse).
  const u = reponse.usage;
  const { error: erreurSuivi } = await supabase.from('ia_utilisation').insert({
    type: 'assistant',
    tokens_entree: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
    tokens_sortie: u.output_tokens ?? 0,
  });
  if (erreurSuivi) console.error('Suivi impossible', erreurSuivi.message);

  return repondre(200, { reponse: texte || "Je n'ai pas de réponse à cette question." });
});
