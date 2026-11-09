import { Truck } from 'lucide-react';
import type { Livreur } from '../types';

interface Props {
  livreurs: Livreur[];
  onChoisir: (id: string) => void;
  onDeconnexion: () => void;
}

// Compte partagé « Livreurs » (décision du 08/11) : chacun indique son prénom
// en arrivant, pour ne voir que les livraisons qui lui sont attribuées.
export default function ChoixLivreur({ livreurs, onChoisir, onDeconnexion }: Props) {
  const actifs = livreurs.filter(l => l.actif);
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f5f4f0]">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
            <Truck size={24} aria-hidden />
          </div>
          <h1 className="text-lg font-700 text-gray-900">Qui livre aujourd'hui ?</h1>
          <p className="text-xs text-gray-500">Vous verrez les livraisons qui vous sont attribuées.</p>
        </div>
        {actifs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center bg-gray-50 rounded-xl px-3 py-4">
            Aucun livreur n'est encore enregistré. Le logisticien les ajoute depuis l'écran Répartition.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {actifs.map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => onChoisir(l.id)}
                className="text-sm font-600 text-gray-800 bg-gray-50 hover:bg-cyan-50 hover:text-cyan-800 border border-gray-200 hover:border-cyan-200 rounded-2xl px-3 py-4 transition-colors"
              >
                {l.nom}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={onDeconnexion} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
