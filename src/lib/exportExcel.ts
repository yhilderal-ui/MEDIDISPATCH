import { supabase } from './supabase';
import { debutJourParisISO, depuisJour, formatJour, heureMurParis, versJour, ajouterJours } from './dates';
import type { Chiffres, Periode, Statistiques } from './statistiques';
import type { Medicament } from '../types';
import type { CellObject, SheetData } from 'write-excel-file/browser';

// Export Excel de la page Statistiques : un fichier .xlsx de quatre onglets
// (synthèse, livraisons, médicaments, détail des demandes).
// Par discrétion, le détail ne contient ni nom, ni téléphone, ni adresse
// complète du patient : seulement le code postal et la ville.

export interface LigneGraphique {
  complet: string;
  valeur: number;
}

interface DemandeExport {
  numero_ticket: string;
  cree_le: string;
  jour_livraison: string;
  statut: 'nouvelle' | 'en_cours' | 'livree' | 'annulee';
  livree_le: string | null;
  criticite: 'urgent' | 'standard_prioritaire' | 'standard';
  patient_adresse: string;
  medicaments: Medicament[];
  historique: { evenement: string }[];
}

const STATUTS: Record<DemandeExport['statut'], string> = {
  nouvelle: 'Nouvelle',
  en_cours: 'En cours de livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

const CRITICITES: Record<DemandeExport['criticite'], string> = {
  urgent: 'Urgent',
  standard_prioritaire: 'Standard prioritaire',
  standard: 'Standard',
};

const INDICATEURS: [keyof Chiffres, string][] = [
  ['creees', 'Demandes créées'],
  ['livrees', 'Livrées'],
  ['reportees', 'Reportées'],
  ['annulees', 'Annulées'],
];

const PAR_PAGE = 1000; // limite de lignes renvoyées par Supabase en une fois

// Demandes créées ou livrées pendant la période, par paquets de 1000.
async function chargerDemandes(p: Periode): Promise<DemandeExport[]> {
  const de = debutJourParisISO(p.debut);
  const a = debutJourParisISO(versJour(ajouterJours(depuisJour(p.fin), 1)));
  const toutes: DemandeExport[] = [];
  for (let debut = 0; ; debut += PAR_PAGE) {
    const { data, error } = await supabase
      .from('demandes')
      .select('numero_ticket, cree_le, jour_livraison, statut, livree_le, criticite, patient_adresse, medicaments, historique(evenement)')
      .or(`and(cree_le.gte.${de},cree_le.lt.${a}),and(livree_le.gte.${de},livree_le.lt.${a})`)
      .order('cree_le')
      .range(debut, debut + PAR_PAGE - 1);
    if (error) throw new Error(error.message);
    toutes.push(...((data ?? []) as DemandeExport[]));
    if (!data || data.length < PAR_PAGE) return toutes;
  }
}

// « 12 rue X, 75013 Paris » → « 75013 Paris ».
export function villeDepuisAdresse(adresse: string): string {
  const m = adresse.match(/\b(\d{5})\s+([^,\n]+?)\s*$/);
  return m ? `${m[1]} ${m[2]}` : '';
}

function jourExcel(jour: string): Date {
  const [a, m, j] = jour.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j));
}

type Style = Omit<CellObject, 'value'>;
const GRAS: Style = { fontWeight: 'bold' };
const ENTETE: Style = { fontWeight: 'bold', backgroundColor: '#F3F4F6', borderStyle: 'thin', borderColor: '#D1D5DB' };
const TITRE: Style = { fontWeight: 'bold', fontSize: 14 };

function entete(libelles: string[]): CellObject[] {
  return libelles.map(value => ({ value, ...ENTETE }));
}

export async function exporterStatistiques(
  periode: Periode,
  stats: Statistiques,
  livraisons: LigneGraphique[],
  libelleRegroupement: string,
  joursSemaine: LigneGraphique[],
) {
  const [{ default: writeExcelFile }, demandes] = await Promise.all([
    import('write-excel-file/browser'),
    chargerDemandes(periode),
  ]);

  const libellePeriode = `du ${formatJour(periode.debut)} au ${formatJour(periode.fin)}`;
  const libellePrecedent = `du ${formatJour(periode.precDebut)} au ${formatJour(periode.precFin)}`;

  const synthese: SheetData = [
    [{ value: 'MediDispatch — Statistiques', ...TITRE }],
    [`Période : ${libellePeriode}`],
    [`Comparée à : ${libellePrecedent}`],
    [{ value: `Exporté le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`, textColor: '#6B7280' }],
    [],
    entete(['Indicateur', 'Période', 'Période précédente', 'Évolution']),
    ...INDICATEURS.map(([cle, libelle]) => {
      const actuel = stats.chiffres[cle];
      const avant = stats.precedent[cle];
      return [
        libelle,
        actuel,
        avant,
        avant === 0 ? '—' : { value: (actuel - avant) / avant, format: '+0%;-0%;0%' },
      ];
    }),
    [],
    [{ value: 'Livraisons selon le jour de la semaine', ...GRAS }],
    entete(['Jour', 'Livraisons']),
    ...joursSemaine.map(j => [j.complet, j.valeur]),
  ];

  const feuilleLivraisons: SheetData = [
    entete([libelleRegroupement, 'Livraisons']),
    ...livraisons.map(l => [l.complet, l.valeur]),
    [{ value: 'Total', ...GRAS }, { value: livraisons.reduce((t, l) => t + l.valeur, 0), ...GRAS }],
  ];

  const feuilleMedicaments: SheetData = [
    entete(['Rang', 'Médicament', 'Demandes livrées qui le contenaient']),
    ...stats.medicaments.map((m, i) => [i + 1, m.nom, m.demandes]),
  ];

  const feuilleDemandes: SheetData = [
    entete(['N° de ticket', 'Créée le', 'Livraison prévue', 'Statut', 'Livrée le', 'Criticité', 'Ville', 'Reports', 'Médicaments']),
    ...demandes.map(d => [
      d.numero_ticket,
      { value: heureMurParis(d.cree_le), format: 'dd/mm/yyyy hh:mm' },
      { value: jourExcel(d.jour_livraison), format: 'dd/mm/yyyy' },
      STATUTS[d.statut],
      d.livree_le ? { value: heureMurParis(d.livree_le), format: 'dd/mm/yyyy hh:mm' } : null,
      CRITICITES[d.criticite],
      villeDepuisAdresse(d.patient_adresse),
      d.historique.filter(h => h.evenement === 'report').length,
      d.medicaments.map(m => (m.quantite ? `${m.nom} (${m.quantite})` : m.nom)).join(' ; '),
    ]),
  ];

  await writeExcelFile([
    { data: synthese, sheet: 'Synthèse', columns: [{ width: 38 }, { width: 14 }, { width: 20 }, { width: 12 }] },
    { data: feuilleLivraisons, sheet: 'Livraisons', columns: [{ width: 42 }, { width: 12 }], stickyRowsCount: 1 },
    { data: feuilleMedicaments, sheet: 'Médicaments', columns: [{ width: 6 }, { width: 70 }, { width: 18 }], stickyRowsCount: 1 },
    {
      data: feuilleDemandes,
      sheet: 'Détail des demandes',
      columns: [{ width: 12 }, { width: 17 }, { width: 15 }, { width: 20 }, { width: 17 }, { width: 19 }, { width: 26 }, { width: 8 }, { width: 80 }],
      stickyRowsCount: 1,
    },
  ]).toFile(`MediDispatch statistiques ${periode.debut} au ${periode.fin}.xlsx`);

  return demandes.length;
}
