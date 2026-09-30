import { jsPDF } from 'jspdf';
import { supabase } from './supabase';
import { messageErreur } from './demandes';
import { EMETTEUR } from '../config/emetteur';
import { CRITICITE_CONFIG } from '../data';
import { formatJour } from './dates';
import logoUrl from '../assets/logo.png';
import type { Demande } from '../types';

// Bons PDF générés à partir de la carte (décisions du 29/09 et du 30/09) :
//   * bon de COMMANDE : avec la liste des médicaments, il va dans le carton,
//     pour le patient ;
//   * bon de LIVRAISON : le même document, sans la liste des médicaments.
// Chacun est rangé à un emplacement fixe (<id>/bon-commande.pdf,
// <id>/bon-livraison.pdf) : les régénérer remplace les anciens.

export type ModeleBon = 'commande' | 'livraison';

const MODELES: Record<ModeleBon, { titre: string; libelle: string; type: 'bon_commande' | 'bon_livraison'; fichier: string }> = {
  commande: { titre: 'BON DE COMMANDE', libelle: 'Bon de commande', type: 'bon_commande', fichier: 'bon-commande.pdf' },
  livraison: { titre: 'BON DE LIVRAISON', libelle: 'Bon de livraison', type: 'bon_livraison', fichier: 'bon-livraison.pdf' },
};

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

export async function genererBonPdf(d: DonneesBon, modele: ModeleBon): Promise<Blob> {
  // compress + 'FAST' : le logo est compressé (≈ 1 Mo → quelques dizaines de Ko par bon).
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = MARGE;

  // En-tête émetteur
  const logo = await chargerLogo();
  if (logo) doc.addImage(logo, 'PNG', MARGE, y, 16, 16, 'logo', 'FAST');
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
  doc.text(MODELES[modele].titre, MARGE, y);
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

  // Médicaments : seulement sur le bon de commande
  if (modele === 'commande') {
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
  }

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

// Génère un bon à partir de la carte, puis le range dans la carte (en
// remplaçant le précédent du même type).
async function publierBon(d: Demande, modele: ModeleBon): Promise<void> {
  const m = MODELES[modele];
  const pdf = await genererBonPdf(d, modele);
  const chemin = `${d.id}/${m.fichier}`;

  const envoi = await supabase.storage
    .from('documents')
    .upload(chemin, pdf, { contentType: 'application/pdf', upsert: true });
  if (envoi.error) throw new Error(messageErreur(envoi.error));

  const fiche = {
    nom_fichier: `${m.libelle} ${d.numero_ticket}.pdf`,
    chemin_fichier: chemin,
    taille_octets: pdf.size,
    ajoute_le: new Date().toISOString(),
  };
  const existant = await supabase
    .from('documents')
    .select('id')
    .eq('demande_id', d.id)
    .eq('genere', true)
    .eq('type', m.type)
    .maybeSingle();
  if (existant.error) throw new Error(messageErreur(existant.error));

  const ecriture = existant.data
    ? await supabase.from('documents').update(fiche).eq('id', existant.data.id)
    : await supabase.from('documents').insert({ ...fiche, demande_id: d.id, type: m.type, type_mime: 'application/pdf', genere: true });
  if (ecriture.error) throw new Error(messageErreur(ecriture.error));
}

// Génère le bon de commande et le bon de livraison à partir de l'état actuel
// de la carte en base.
export async function publierBonsGeneres(demandeId: string): Promise<void> {
  const { data: d, error } = await supabase.from('demandes').select('*').eq('id', demandeId).single();
  if (error) throw new Error(messageErreur(error));
  await publierBon(d as Demande, 'commande');
  await publierBon(d as Demande, 'livraison');
}
