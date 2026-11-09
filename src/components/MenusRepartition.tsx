import { useEffect, useState } from 'react';
import type { Demande, Secteur } from '../types';
import { useLivreurs } from '../lib/livreursContexte';

interface Props {
  demande: Pick<Demande, 'numero_ticket' | 'secteur' | 'livreur_id'>;
  onRepartir: (champs: { secteur: Secteur | null; livreur_id: string | null }) => void;
  classeMenu: string;
  etiquettes?: boolean; // libellés « Secteur » / « Livreur » au-dessus des menus (fiche)
}

// Menus Secteur et Livreur (décision du 09/11) : la carte n'est classée qu'une
// fois les DEUX choisis ; tant qu'il en manque un, rien n'est enregistré.
// Vider les deux menus retire la répartition.
export default function MenusRepartition({ demande, onRepartir, classeMenu, etiquettes }: Props) {
  const livreurs = useLivreurs();
  const [secteur, setSecteur] = useState<Secteur | ''>(demande.secteur ?? '');
  const [livreur, setLivreur] = useState(demande.livreur_id ?? '');

  // Mise à jour venue d'ailleurs (autre écran, action en lot) : on la reprend.
  useEffect(() => {
    setSecteur(demande.secteur ?? '');
    setLivreur(demande.livreur_id ?? '');
  }, [demande.secteur, demande.livreur_id]);

  const appliquer = (s: Secteur | '', l: string) => {
    setSecteur(s);
    setLivreur(l);
    const complet = s !== '' && l !== '';
    const vide = s === '' && l === '';
    const change = (s || null) !== demande.secteur || (l || null) !== demande.livreur_id;
    if ((complet || vide) && change) onRepartir({ secteur: s || null, livreur_id: l || null });
  };

  const manque = secteur !== '' && livreur === '' ? 'Choisissez aussi le livreur' : secteur === '' && livreur !== '' ? 'Choisissez aussi le secteur' : null;
  const proposes = livreurs.filter(l => l.actif || l.id === demande.livreur_id);
  const libelle = etiquettes ? 'text-[10px] font-600 uppercase tracking-widest text-gray-400' : 'contents';

  return (
    <>
      <label className={libelle}>
        {etiquettes && 'Secteur'}
        <select
          aria-label={etiquettes ? undefined : `Secteur de ${demande.numero_ticket}`}
          value={secteur}
          onChange={e => appliquer(e.target.value as Secteur | '', livreur)}
          className={classeMenu}
        >
          <option value="">{etiquettes ? 'À classer' : 'Secteur…'}</option>
          <option value="est">Est</option>
          <option value="ouest">Ouest</option>
        </select>
      </label>
      <label className={libelle}>
        {etiquettes && 'Livreur'}
        <select
          aria-label={etiquettes ? undefined : `Livreur de ${demande.numero_ticket}`}
          value={livreur}
          onChange={e => appliquer(secteur, e.target.value)}
          className={classeMenu}
        >
          <option value="">{etiquettes ? 'Non attribuée' : 'Livreur…'}</option>
          {proposes.map(l => (
            <option key={l.id} value={l.id}>
              {l.nom}
              {l.actif ? '' : ' (inactif)'}
            </option>
          ))}
        </select>
      </label>
      {manque && (
        <p role="status" className="col-span-2 text-[10px] text-amber-700">
          {manque} pour classer la carte.
        </p>
      )}
    </>
  );
}
