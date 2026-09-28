import { useState } from 'react';
import logo from '../assets/logo.png';

type Role = 'dispatcher' | 'livreur';

interface Props {
  onLogin: (role: Role, name: string) => void;
}

const ROLES = [
  {
    key: 'dispatcher' as Role,
    emoji: '🎛',
    title: 'Dispatcheur',
    description: 'Créez et gérez les demandes de livraison. Suivez l\'état de chaque course en temps réel.',
    color: '#111827',
    placeholder: 'ex : Marie Dupont',
  },
  {
    key: 'livreur' as Role,
    emoji: '🚚',
    title: 'Pharmacie',
    description: 'Consultez les nouvelles demandes, accédez aux documents médicaux et validez vos prises en charge.',
    color: '#7c3aed',
    placeholder: 'ex : Pharmacie Centrale Paris',
  },
];

export default function LoginScreen({ onLogin }: Props) {
  const [names, setNames] = useState({ dispatcher: '', livreur: '' });

  return (
    <div className="min-h-screen bg-[#f5f4f0] flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white flex items-center justify-center shadow-sm border border-black/5">
          <img src={logo} alt="MediDispatch" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="text-base font-700 text-gray-900 leading-tight">MediDispatch</h1>
          <p className="text-[11px] text-gray-400 font-mono tracking-wide">Livraison médicale — Île-de-France</p>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-8 font-500">Connectez-vous en tant que :</p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
        {ROLES.map(r => (
          <div key={r.key} className="flex-1 bg-white rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
            <p className="font-700 text-gray-900 text-base mb-2">{r.title}</p>
            <p className="text-sm text-gray-400 leading-relaxed mb-5 flex-1">{r.description}</p>

            <input
              value={names[r.key]}
              onChange={e => setNames(n => ({ ...n, [r.key]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onLogin(r.key, names[r.key] || r.title)}
              placeholder={r.placeholder}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none mb-3 placeholder:text-gray-300 focus:border-gray-400 transition-colors"
            />

            <button
              onClick={() => onLogin(r.key, names[r.key] || r.title)}
              className="w-full text-sm font-600 py-2.5 rounded-xl transition-colors text-white"
              style={{ background: r.color }}
            >
              Se connecter →
            </button>
          </div>
        ))}
      </div>

      <p className="mt-10 text-[11px] text-gray-300 font-mono">Accès sécurisé — données de santé protégées</p>
    </div>
  );
}
