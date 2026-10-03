// Types alignés sur les tables Supabase (voir supabase/migrations).

export type Criticite = 'urgent' | 'standard_prioritaire' | 'standard';
export type Statut = 'nouvelle' | 'en_cours' | 'livree' | 'annulee';
// Livraison chez le patient, ou retour (aller récupérer des médicaments), décision du 03/10.
export type Nature = 'livraison' | 'retour';
export type TypeDocument = 'ordonnance' | 'bon_commande' | 'bon_livraison' | 'preuve_livraison' | 'carte_vitale' | 'mutuelle';

// Pièces jointes proposées à la création et dans le détail (demande du 29/09).
export type TypePiece = 'ordonnance' | 'carte_vitale' | 'mutuelle' | 'bon_livraison';
export type Pieces = Partial<Record<TypePiece, File>>;

export interface Medicament {
  nom: string;
  quantite: string;
}

export interface DocumentJoint {
  id: string;
  demande_id: string;
  type: TypeDocument;
  chemin_fichier: string;
  nom_fichier: string;
  taille_octets: number;
  type_mime: string;
  ajoute_le: string;
  genere: boolean; // bon de commande ou de livraison généré automatiquement
}

export interface Demande {
  id: string;
  numero_ticket: string;
  patient_nom: string;
  patient_adresse: string;
  patient_telephone: string;
  medicaments: Medicament[];
  criticite: Criticite;
  jour_livraison: string; // AAAA-MM-JJ
  statut: Statut;
  nature: Nature;
  reliquat_de: string | null; // carte d'origine quand celle-ci est un reliquat
  notes_initiales: string | null;
  cree_le: string;
  mis_a_jour_le: string;
  livree_le: string | null;
  archivee_le: string | null;
  derniere_activite_le: string;
  derniere_activite_par: string | null;
  documents: DocumentJoint[];
  lectures_demandes: { utilisateur_id: string; vu_le: string }[];
}

// « nouvelle » : jamais ouverte par moi ; « maj » : l'autre compte l'a modifiée
// depuis ma dernière consultation.
export type EtatVu = 'nouvelle' | 'maj' | null;

export interface NouvelleDemande {
  patient_nom: string;
  patient_adresse: string;
  patient_telephone: string;
  medicaments: Medicament[];
  criticite: Criticite;
  jour_livraison: string;
  notes_initiales: string | null;
  nature: Nature;
}

export type ModificationDemande = Pick<
  NouvelleDemande,
  'patient_nom' | 'patient_adresse' | 'patient_telephone' | 'medicaments' | 'criticite' | 'notes_initiales'
>;

export interface EvenementHistorique {
  id: string;
  evenement: 'creation' | 'statut' | 'report' | 'modification';
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  cree_le: string;
  auteur_nom: string;
}

export interface Note {
  id: string;
  contenu: string;
  cree_le: string;
  auteur_nom: string;
}

export interface MessageChat {
  id: string;
  contenu: string;
  cree_le: string;
  auteur: string;
  auteur_nom: string;
  auteur_role: 'dispatcheur' | 'livraison';
}
