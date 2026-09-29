// Types alignés sur les tables Supabase (voir supabase/migrations).

export type Criticite = 'urgent' | 'standard_prioritaire' | 'standard';
export type Statut = 'nouvelle' | 'en_cours' | 'livree' | 'annulee';
export type TypeDocument = 'ordonnance' | 'bon_livraison' | 'preuve_livraison';

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
  notes_initiales: string | null;
  cree_le: string;
  mis_a_jour_le: string;
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
