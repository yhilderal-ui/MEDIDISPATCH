export type Priority = 'urgent' | 'standard' | 'low';
export type Status = 'nouveau' | 'assigné' | 'en_transit' | 'livré' | 'annulé' | 'suspendu';
export type LivreurStatus = 'nouveau' | 'validé' | 'annulé' | 'suspendu' | 'archivé';

export interface MedicalDocument {
  id: string;
  type: 'ordonnance' | 'bon_livraison' | 'fiche_patient';
  label: string;
  reference: string;
  date: string;
  issuer: string;
  pages: number;
  confidential: boolean;
}

export interface CardNote {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  mimeCategory: 'pdf' | 'image' | 'word' | 'other';
}

export interface Product {
  id: string;
  name: string;
  quantity: string;
}

export interface DeliveryCard {
  products?: Product[];
  distanceKm?: number;
  scheduledDate?: string; // ISO date string YYYY-MM-DD
  id: string;
  createdAt: Date;
  pickup: string;
  dropoff: string;
  client: string;
  phone: string;
  weight: string;
  notes: string;
  priority: Priority;
  status: Status;
  livreurStatus?: LivreurStatus;
  isNew?: boolean;
  patient?: string;
  documents?: MedicalDocument[];
  cardNotes?: CardNote[];
  attachments?: Attachment[];
}
