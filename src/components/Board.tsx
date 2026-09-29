import { useState } from 'react';
import type { Demande, EtatVu, Statut } from '../types';
import OngletsStatut from './OngletsStatut';
import { STATUT_CONFIG } from '../data';
import DeliveryCardComponent from './DeliveryCardComponent';

interface Props {
  demandes: Demande[];
  onOpen: (demande: Demande) => void;
  etats: Record<string, EtatVu>;
}

const COLONNES: Statut[] = ['nouvelle', 'en_cours', 'livree'];

export default function Board({ demandes, onOpen, etats }: Props) {
  const annulees = demandes.filter(d => d.statut === 'annulee');
  const [onglet, setOnglet] = useState<Statut>('nouvelle');

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 overflow-y-auto pb-24 md:pb-4">
      <OngletsStatut demandes={demandes} etats={etats} actif={onglet} onChange={setOnglet} />
      <div className={`${onglet === 'annulee' ? 'hidden' : 'flex'} md:flex gap-5 shrink-0 md:overflow-x-auto -mt-6 md:mt-0`}>
        {COLONNES.map(statut => {
          const items = demandes.filter(d => d.statut === statut);
          const cfg = STATUT_CONFIG[statut];
          return (
            <div key={statut} className={`${statut === onglet ? 'flex' : 'hidden'} md:flex flex-col w-full md:min-w-[240px] md:w-[240px]`}>
              <div className="hidden md:flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <cfg.Icone size={15} style={{ color: cfg.color }} aria-hidden />
                  <span className="text-xs font-700 uppercase tracking-widest" style={{ color: cfg.color }}>
                    {cfg.court}
                  </span>
                </div>
                <span
                  className="text-[10px] font-700 w-5 h-5 flex items-center justify-center rounded-full"
                  style={{ color: cfg.color, background: cfg.color + '20' }}
                >
                  {items.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {items.length === 0 && (
                  <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-2xl">
                    <span className="text-xs text-gray-300 font-500">Aucune demande</span>
                  </div>
                )}
                {items.map(d => (
                  <DeliveryCardComponent key={d.id} demande={d} onOpen={onOpen} etatVu={etats[d.id]} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {(annulees.length > 0 || onglet === 'annulee') && (
        <div className={`${onglet === 'annulee' ? 'block -mt-6' : 'hidden'} md:block md:mt-0 shrink-0`}>
          {annulees.length === 0 && (
            <p className="md:hidden text-xs text-gray-400 text-center py-8">Aucune demande annulée</p>
          )}
          <div className="hidden md:flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[10px] font-700 uppercase tracking-widest text-gray-400">Annulées</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="flex gap-4 flex-wrap">
            {annulees.map(d => (
              <div key={d.id} className="w-full md:w-[240px]">
                <DeliveryCardComponent demande={d} onOpen={onOpen} etatVu={etats[d.id]} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
