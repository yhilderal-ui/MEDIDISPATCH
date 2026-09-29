import { useState } from 'react';
import logo from '../assets/logo.png';

interface Props {
  onSignIn: (email: string, password: string) => Promise<string | null>;
  initialError?: string;
  configMissing?: boolean;
}

export default function LoginScreen({ onSignIn, initialError, configMissing }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    const err = await onSignIn(email.trim(), password);
    setSubmitting(false);
    if (err) setError(err);
  };

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

      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-3xl border border-black/5 shadow-sm p-6 flex flex-col"
      >
        <p className="font-700 text-gray-900 text-base mb-1">Connexion</p>
        <p className="text-sm text-gray-400 leading-relaxed mb-5">
          Votre rôle (Dispatcheur ou Société de livraison) est associé à votre compte.
        </p>

        {configMissing && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3">
            Configuration Supabase manquante : ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY.
          </p>
        )}

        <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none mb-3 focus:border-gray-400 transition-colors"
        />

        <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none mb-4 focus:border-gray-400 transition-colors"
        />

        {error && (
          <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || configMissing || !email.trim() || !password}
          className="w-full text-sm font-600 py-2.5 rounded-xl transition-colors text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-40"
        >
          {submitting ? 'Connexion…' : 'Se connecter →'}
        </button>
      </form>

      <p className="mt-10 text-[11px] text-gray-300 font-mono">Accès sécurisé — données de santé protégées</p>
    </div>
  );
}
