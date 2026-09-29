import { useState, useRef, useEffect } from 'react';
import { CheckCheck, Headset, Pill } from 'lucide-react';
import type { MessageChat } from '../types';
import type { Role } from '../lib/useAuth';
import { formatHorodatage } from '../lib/dates';

interface Props {
  utilisateurId: string;
  role: Role;
  messages: MessageChat[];
  nonLus: number;
  autreVuJusquau?: string;
  erreur: string | null;
  onSend: (texte: string) => Promise<string | null>;
  onMarquerLu: () => void;
  // Incrémenté par une alerte « nouveau message » : ouvre la messagerie.
  ouvrirSignal?: number;
  onOuvertChange?: (ouvert: boolean) => void;
}

const LIBELLE_ROLE: Record<MessageChat['auteur_role'], string> = {
  dispatcheur: 'Dispatcheur',
  livraison: 'Pharmacie',
};

const COULEURS = {
  dispatcheur: { bulle: '#111827', fond: '#f3f4f6', texte: '#374151' },
  livraison: { bulle: '#7c3aed', fond: '#ede9fe', texte: '#5b21b6' },
};

function heure(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
}

export default function Chat({ utilisateurId, role, messages, nonLus, autreVuJusquau, erreur, onSend, onMarquerLu, ouvrirSignal, onOuvertChange }: Props) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (ouvrirSignal) setOuvert(true);
  }, [ouvrirSignal]);

  useEffect(() => {
    onOuvertChange?.(ouvert);
  }, [ouvert, onOuvertChange]);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const basRef = useRef<HTMLDivElement>(null);
  const saisieRef = useRef<HTMLInputElement>(null);

  const monRole: MessageChat['auteur_role'] = role === 'dispatcher' ? 'dispatcheur' : 'livraison';
  const autreRole: MessageChat['auteur_role'] = monRole === 'dispatcheur' ? 'livraison' : 'dispatcheur';

  // Chat ouvert : les messages reçus sont considérés comme lus.
  useEffect(() => {
    if (ouvert && nonLus > 0) onMarquerLu();
  }, [ouvert, nonLus, onMarquerLu]);

  useEffect(() => {
    if (!ouvert) return;
    basRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ouvert, messages.length]);

  useEffect(() => {
    if (ouvert) saisieRef.current?.focus();
  }, [ouvert]);

  const envoyer = async () => {
    const contenu = texte.trim();
    if (!contenu || envoi) return;
    setEnvoi(true);
    const echec = await onSend(contenu);
    setEnvoi(false);
    if (echec) setErreurEnvoi(echec);
    else {
      setTexte('');
      setErreurEnvoi(null);
    }
  };

  // Dernier de mes messages lu par l'autre compte : on y affiche « Vu ».
  const mesMessages = messages.filter(m => m.auteur === utilisateurId);
  const dernierVu = [...mesMessages].reverse().find(m => autreVuJusquau && m.cree_le <= autreVuJusquau);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {ouvert && (
        <div
          className="max-sm:fixed max-sm:inset-0 max-sm:z-50 max-sm:rounded-none w-full sm:w-80 h-full sm:h-[min(460px,calc(100dvh-7rem))] bg-white sm:rounded-3xl shadow-2xl border border-black/5 flex flex-col overflow-hidden slide-in"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center ring-2 ring-white"><Headset size={12} aria-hidden /></div>
                <div className="w-6 h-6 rounded-full bg-violet-500 text-white flex items-center justify-center ring-2 ring-white"><Pill size={12} aria-hidden /></div>
              </div>
              <div>
                <p className="text-xs font-700 text-gray-900">Messagerie</p>
                <p className="text-[10px] text-gray-400">
                  Vous : <span className="font-600">{LIBELLE_ROLE[monRole]}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              aria-label="Fermer la messagerie"
              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-sm transition-colors"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {erreur && <p className="text-[11px] text-red-600 text-center">{erreur}</p>}
            {messages.length === 0 && !erreur && (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-gray-300 text-center">
                  Commencez la conversation avec
                  <br />
                  {LIBELLE_ROLE[autreRole].toLowerCase()}.
                </p>
              </div>
            )}
            {messages.map((m, i) => {
              const aMoi = m.auteur === utilisateurId;
              const premier = i === 0 || messages[i - 1].auteur !== m.auteur;
              const c = COULEURS[m.auteur_role];
              return (
                <div key={m.id} className={`flex flex-col ${aMoi ? 'items-end' : 'items-start'}`}>
                  {premier && (
                    <p className="text-[9px] font-600 uppercase tracking-widest text-gray-400 mb-1 px-1">
                      {LIBELLE_ROLE[m.auteur_role]}
                      {m.auteur_nom !== LIBELLE_ROLE[m.auteur_role] && ` — ${m.auteur_nom}`}
                    </p>
                  )}
                  <div
                    className="max-w-[220px] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={aMoi ? { background: c.bulle, color: '#fff' } : { background: c.fond, color: c.texte }}
                    title={formatHorodatage(m.cree_le)}
                  >
                    {m.contenu}
                  </div>
                  <p className="text-[9px] text-gray-300 mt-0.5 px-1">
                    {heure(m.cree_le)}
                    {dernierVu?.id === m.id && <span className="text-emerald-500 font-600 inline-flex items-center gap-0.5"> · Vu <CheckCheck size={11} aria-hidden /></span>}
                  </p>
                </div>
              );
            })}
            <div ref={basRef} />
          </div>

          <div className="shrink-0 px-3 pb-3 pt-2 border-t border-gray-100">
            {erreurEnvoi && <p role="alert" className="text-[11px] text-red-600 mb-1.5 px-1">{erreurEnvoi}</p>}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
              <input
                ref={saisieRef}
                value={texte}
                onChange={e => setTexte(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && envoyer()}
                placeholder="Votre message…"
                aria-label="Votre message"
                className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-gray-300"
              />
              <button
                type="button"
                onClick={envoyer}
                disabled={!texte.trim() || envoi}
                aria-label="Envoyer"
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-30"
                style={{ background: COULEURS[monRole].bulle }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M1 6h10M6 1l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOuvert(o => !o)}
        aria-label={ouvert ? 'Fermer la messagerie' : `Ouvrir la messagerie${nonLus ? ` (${nonLus} non lus)` : ''}`}
        className={`relative w-12 h-12 rounded-2xl shadow-lg items-center justify-center transition-all hover:scale-105 active:scale-95 ${ouvert ? 'hidden sm:flex' : 'flex'}`}
        style={{ background: ouvert ? '#374151' : '#111827' }}
      >
        {ouvert ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M2 2h14a1 1 0 011 1v9a1 1 0 01-1 1H5l-4 3V3a1 1 0 011-1z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {!ouvert && nonLus > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-violet-500 text-white text-[10px] font-700 rounded-full flex items-center justify-center pulse-dot">
            {nonLus}
          </span>
        )}
      </button>
    </div>
  );
}
