import { jsPDF } from 'jspdf';
import { supabase } from './supabase';
import { messageErreur } from './demandes';
import { EMETTEUR } from '../config/emetteur';
import { CRITICITE_CONFIG } from '../data';
import { formatJour } from './dates';
import logoUrl from '../assets/logo.png';
import type { Demande } from '../types';

// Bon de livraison PDF généré à partir de la carte (décision du 29/09).
// Il est rangé à un emplacement fixe (<id>/bon-genere.pdf) : le régénérer
// remplace l'ancien.

const MARGE = 18;
const LARGEUR = 210 - 2 * MARGE;

// Couleurs de criticité en RVB pour jsPDF.
const RVB: Record<string, [number, number, number]> = {
  urgent: [220, 38, 38],
  standard_prioritaire: [234, 88, 12],
  standard: [22, 163, 74],
};

let logoCache: Promise<string | null> | null = null;
function chargerLogo(): Promise<string | null> {
  logoCache ??= fetch(logoUrl)
    .then(r => r.blob())
    .then(
      b =>
        new Promise<string>((ok, ko) => {
          const lecteur = new FileReader();
          lecteur.onload = () => ok(lecteur.result as string);
          lecteur.onerror = ko;
          lecteur.readAsDataURL(b);
        }),
    )
    .catch(() => null);
  return logoCache;
}

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

type DonneesBon = Pick<
  Demande,
  'numero_ticket' | 'cree_le' | 'jour_livraison' | 'criticite' | 'patient_nom' | 'patient_adresse' | 'patient_telephone' | 'medicaments' | 'notes_initiales'
>;

export async function genererBonPdf(d: DonneesBon): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGE;

  // En-tête émetteur
  const logo = await chargerLogo();
  if (logo) doc.addImage(logo, 'PNG', MARGE, y, 16, 16);
  const xTexte = logo ? MARGE + 20 : MARGE;
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(17, 24, 39);
  doc.text(EMETTEUR.nom, xTexte, y + 5);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(107, 114, 128);
  const lignesEmetteur = [
    EMETTEUR.structure,
    EMETTEUR.adresse,
    [EMETTEUR.telephone && `Tél. ${EMETTEUR.telephone}`, EMETTEUR.siret && `SIRET ${EMETTEUR.siret}`].filter(Boolean).join(' · '),
  ].filter(Boolean);
  lignesEmetteur.forEach((l, i) => doc.text(l, xTexte, y + 10 + i * 4));
  y += Math.max(20, 10 + lignesEmetteur.length * 4) + 6;

  // Titre et références
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(17, 24, 39);
  doc.text('BON DE LIVRAISON', MARGE, y);
  doc.setFontSize(12).text(`N° ${d.numero_ticket}`, MARGE + LARGEUR, y, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(55, 65, 81);
  doc.text(`Émis le ${dateFr(d.cree_le)}`, MARGE, y);
  doc.text(`Livraison prévue : ${formatJour(d.jour_livraison)} ${d.jour_livraison.slice(0, 4)}`, MARGE + LARGEUR, y, { align: 'right' });
  y += 6;
  const [r, v, b] = RVB[d.criticite];
  doc.setFont('helvetica', 'bold').setTextColor(r, v, b);
  doc.text(`Criticité : ${CRITICITE_CONFIG[d.criticite].label}`, MARGE, y);
  y += 5;

  const separateur = () => {
    doc.setDrawColor(209, 213, 219).setLineWidth(0.3).line(MARGE, y, MARGE + LARGEUR, y);
    y += 7;
  };
  separateur();

  // Patient
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(107, 114, 128);
  doc.text('PATIENT', MARGE, y);
  y += 6;
  doc.setFontSize(12).setTextColor(17, 24, 39).text(d.patient_nom, MARGE, y);
  y += 6;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(55, 65, 81);
  const adresse = doc.splitTextToSize(d.patient_adresse, LARGEUR);
  doc.text(adresse, MARGE, y);
  y += adresse.length * 5;
  doc.text(`Tél. ${d.patient_telephone}`, MARGE, y);
  y += 4;
  separateur();

  // Médicaments
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(107, 114, 128);
  doc.text('#', MARGE, y);
  doc.text('MÉDICAMENT', MARGE + 10, y);
  doc.text('QUANTITÉ', MARGE + LARGEUR, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(17, 24, 39);
  d.medicaments.forEach((m, i) => {
    const nom = doc.splitTextToSize(m.nom, LARGEUR - 50);
    doc.text(String(i + 1), MARGE, y);
    doc.text(nom, MARGE + 10, y);
    if (m.quantite) doc.text(m.quantite, MARGE + LARGEUR, y, { align: 'right' });
    y += nom.length * 5 + 2;
  });
  y += 2;
  separateur();

  // Encart notes (seulement s'il y en a)
  if (d.notes_initiales?.trim()) {
    const texte = doc.splitTextToSize(d.notes_initiales.trim(), LARGEUR - 8);
    const hauteur = 10 + texte.length * 5;
    doc.setFillColor(255, 251, 235).setDrawColor(253, 230, 138).roundedRect(MARGE, y - 3, LARGEUR, hauteur, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(146, 64, 14).text('NOTES', MARGE + 4, y + 3);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(120, 53, 15).text(texte, MARGE + 4, y + 9);
    y += hauteur + 6;
  }

  // Réception
  y += 4;
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(17, 24, 39);
  doc.text('Reçu le ____ / ____ / ________', MARGE, y);
  y += 10;
  doc.text('Nom et signature du patient :', MARGE, y);
  doc.setDrawColor(156, 163, 175).rect(MARGE, y + 3, LARGEUR, 30);

  doc.setFontSize(8).setTextColor(156, 163, 175);
  doc.text(`Document généré par MediDispatch — ${d.numero_ticket}`, MARGE + LARGEUR / 2, 287, { align: 'center' });

  return doc.output('blob');
}

// Génère le bon à partir de l'état actuel de la carte en base, puis le range
// dans la carte (en remplaçant le précédent).
export async function publierBonGenere(demandeId: string): Promise<void> {
  const { data: d, error } = await supabase.from('demandes').select('*').eq('id', demandeId).single();
  if (error) throw new Error(messageErreur(error));

  const pdf = await genererBonPdf(d as Demande);
  const chemin = `${demandeId}/bon-genere.pdf`;
  const nom = `Bon de livraison ${d.numero_ticket}.pdf`;

  const envoi = await supabase.storage
    .from('documents')
    .upload(chemin, pdf, { contentType: 'application/pdf', upsert: true });
  if (envoi.error) throw new Error(messageErreur(envoi.error));

  const fiche = { nom_fichier: nom, taille_octets: pdf.size, ajoute_le: new Date().toISOString() };
  const existant = await supabase.from('documents').select('id').eq('demande_id', demandeId).eq('genere', true).maybeSingle();
  if (existant.error) throw new Error(messageErreur(existant.error));

  const ecriture = existant.data
    ? await supabase.from('documents').update(fiche).eq('id', existant.data.id)
    : await supabase.from('documents').insert({
        ...fiche,
        demande_id: demandeId,
        type: 'bon_livraison',
        chemin_fichier: chemin,
        type_mime: 'application/pdf',
        genere: true,
      });
  if (ecriture.error) throw new Error(messageErreur(ecriture.error));
}
