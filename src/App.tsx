import { useState, useEffect, useCallback } from 'react';
import type { Demande, NouvelleDemande, Statut, TypeDocument } from './types';
import Board from './components/Board';
import LivreurBoard from './components/LivreurBoard';
import CreateCardModal from './components/CreateCardModal';
import Chat from './components/Chat';
import LoginScreen from './components/LoginScreen';
import WeekView from './components/WeekView';
import DemandePanel from './components/DemandePanel';
import logo from './assets/logo.png';
import { useAuth, type Role } from './lib/useAuth';
import { supabaseConfigured } from './lib/supabase';
import {
  changerStatut,
  creerDemande,
  deposerDocument,
  listerDemandes,
  messageErreur,
  reporter,
  surveillerDemandes,
} from './lib/demandes';
import { ajouterJours, lundiDeLaSemaine, moisCourt } from './lib/dates';

type DispatcherView = 'kanban' | 'week';

interface ChatMessage {
  id: string;
  author: Role;
  text: string;
  sentAt: Date;
}

export default function App() {
  const { state: auth, signIn, signOut } = useAuth();
  const role: Role | null = auth.status === 'signed_in' ? auth.user.role : null;
  const userName = auth.status === 'signed_in' ? auth.user.name : '';

  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ouverteId, setOuverteId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dispatcherView, setDispatcherView] = useState<DispatcherView>('kanban');
  const [weekStart, setWeekStart] = useState<Date>(() => lundiDeLaSemaine(new Date()));
  // Le chat reste local au navigateur jusqu'à l'étape 9.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const recharger = useCallback(async () => {
    try {
      setDemandes(await listerDemandes());
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  }, []);

  // Chargement initial, puis rechargement à chaque changement signalé par la base.
  useEffect(() => {
    if (!role) return;
    setChargement(true);
    recharger();
    return surveillerDemandes(recharger);
  }, [role, recharger]);

  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(null), 4000);
    return () => clearTimeout(t);
  }, [info]);

  // Exécute une écriture, recharge la liste, et affiche l'erreur éventuelle.
  const agir = async (action: () => Promise<void>, succes?: string): Promise<boolean> => {
    try {
      await action();
      setErreur(null);
      if (succes) setInfo(succes);
      await recharger();
      return true;
    } catch (e) {
      setErreur(messageErreur(e));
      return false;
    }
  };

  const handleCreate = async (demande: NouvelleDemande, bonLivraison: File): Promise<string | null> => {
    try {
      const { numeroTicket, erreurFichier } = await creerDemande(demande, bonLivraison);
      await recharger();
      if (erreurFichier) {
        setErreur(`Demande ${numeroTicket} créée, mais le bon de livraison n'a pas pu être envoyé : ${erreurFichier} Ouvrez la demande pour l'ajouter.`);
      } else {
        setInfo(`Demande ${numeroTicket} créée.`);
      }
      return null;
    } catch (e) {
      return messageErreur(e);
    }
  };

  const handleDropCard = (id: string, jour: string) => {
    const d = demandes.find(x => x.id === id);
    if (!d || d.jour_livraison === jour) return;
    agir(() => reporter(id, jour), `Demande ${d.numero_ticket} reportée.`);
  };

  const shiftWeek = (n: number) => setWeekStart(d => ajouterJours(d, n * 7));

  const handleSendChat = (text: string) => {
    if (!role) return;
    setChatMessages(ms => [...ms, { id: `cm-${Date.now()}`, author: role, text, sentAt: new Date() }]);
  };

  if (auth.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f5f4f0] flex items-center justify-center">
        <p className="text-xs text-gray-400 font-mono">Chargement…</p>
      </div>
    );
  }

  if (!role) {
    return (
      <LoginScreen
        onSignIn={signIn}
        initialError={auth.status === 'signed_out' ? auth.error : undefined}
        configMissing={!supabaseConfigured}
      />
    );
  }

  const ouverte = ouverteId ? demandes.find(d => d.id === ouverteId) ?? null : null;
  const ouvrir = (d: Demande) => setOuverteId(d.id);
  const actives = demandes.filter(d => d.statut !== 'annulee');
  const nbNouvelles = demandes.filter(d => d.statut === 'nouvelle').length;
  const finSemaine = ajouterJours(weekStart, 5);

  return (
    <div className="h-screen flex flex-col bg-[#f5f4f0] overflow-hidden">
      {/* Barre du haut */}
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-white border-b border-black/5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-white flex items-center justify-center">
            <img src={logo} alt="MediDispatch" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-700 text-gray-900 leading-tight">MediDispatch</h1>
            <p className="text-[10px] text-gray-400 font-mono tracking-wide">Livraison médicale — Île-de-France</p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-600"
          style={role === 'dispatcher' ? { background: '#f3f4f6', color: '#111827' } : { background: '#f5f3ff', color: '#7c3aed' }}
        >
          <span>{role === 'dispatcher' ? '🎛' : '🚚'}</span>
          <span>{role === 'dispatcher' ? 'Dispatcheur' : 'Société de livraison'}</span>
          {userName && userName !== (role === 'dispatcher' ? 'Dispatcheur' : 'Société de livraison') && (
            <span className="opacity-60">— {userName}</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="font-mono">{actives.length} demandes actives</span>
          </div>
          {role === 'dispatcher' && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="text-white text-xs font-600 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 bg-[#2db8a0] hover:bg-[#25a08b]"
            >
              <span>+</span> Nouvelle demande
            </button>
          )}
          <button type="button" onClick={signOut} className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-500">
            Déconnexion
          </button>
        </div>
      </header>

      {/* Messages d'erreur et de confirmation */}
      {erreur && (
        <div role="alert" className="shrink-0 mx-4 sm:mx-6 mt-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3 slide-in">
          <span className="text-sm">⚠️</span>
          <p className="text-sm text-red-700 flex-1">{erreur}</p>
          <button type="button" onClick={() => setErreur(null)} aria-label="Fermer le message" className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}
      {info && !erreur && (
        <div role="status" className="shrink-0 mx-4 sm:mx-6 mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-700 slide-in">
          ✓ {info}
        </div>
      )}

      {/* Contenu */}
      <main className="flex-1 overflow-hidden">
        {chargement ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-gray-400 font-mono">Chargement des demandes…</p>
          </div>
        ) : role === 'dispatcher' ? (
          <div className="h-full flex flex-col">
            <div className="px-4 sm:px-6 pt-5 pb-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs font-700 uppercase tracking-widest text-gray-400">
                  {dispatcherView === 'kanban' ? 'Tableau de dispatch' : 'Planning semaine'}
                </h2>
                <div className="flex-1 h-px bg-gray-200" />

                {dispatcherView === 'week' && (
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Semaine précédente" onClick={() => shiftWeek(-1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">‹</button>
                    <span className="text-xs font-600 text-gray-600 font-mono whitespace-nowrap">
                      {weekStart.getDate()} — {finSemaine.getDate()} {moisCourt(finSemaine)}
                    </span>
                    <button type="button" aria-label="Semaine suivante" onClick={() => shiftWeek(1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">›</button>
                  </div>
                )}

                <span className="text-xs text-gray-400 font-mono">{nbNouvelles} en attente</span>

                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg ml-2">
                  {([['kanban', '⊞', 'Vue par statut'], ['week', '📅', 'Vue semaine']] as [DispatcherView, string, string][]).map(([v, icone, titre]) => (
                    <button
                      key={v}
                      type="button"
                      title={titre}
                      aria-label={titre}
                      onClick={() => setDispatcherView(v)}
                      className="text-xs px-2.5 py-1 rounded-md transition-all font-600"
                      style={{
                        background: dispatcherView === v ? 'white' : 'transparent',
                        color: dispatcherView === v ? '#111' : '#9ca3af',
                        boxShadow: dispatcherView === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {icone}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-6">
              {dispatcherView === 'kanban' ? (
                <Board demandes={demandes} onOpen={ouvrir} />
              ) : (
                <WeekView demandes={actives} weekStart={weekStart} onOpen={ouvrir} onDropCard={handleDropCard} />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col px-4 sm:px-6 pt-4 pb-6">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <h2 className="text-xs font-700 uppercase tracking-widest text-gray-400">Tableau des livraisons</h2>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-mono">{nbNouvelles} nouvelle{nbNouvelles !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex-1 min-h-0">
              <LivreurBoard demandes={demandes} onOpen={ouvrir} onDropCard={handleDropCard} />
            </div>
          </div>
        )}
      </main>

      {ouverte && (
        <DemandePanel
          demande={ouverte}
          onClose={() => setOuverteId(null)}
          onChangerStatut={(statut: Statut) => agir(() => changerStatut(ouverte.id, statut), `Demande ${ouverte.numero_ticket} mise à jour.`)}
          onReporter={(jour: string) => agir(() => reporter(ouverte.id, jour), `Demande ${ouverte.numero_ticket} reportée.`)}
          onDeposer={(type: TypeDocument, fichier: File) =>
            agir(async () => { await deposerDocument(ouverte.id, type, fichier); }, 'Document ajouté.')
          }
        />
      )}

      {showModal && <CreateCardModal onClose={() => setShowModal(false)} onSubmit={handleCreate} />}

      <Chat currentView={role} messages={chatMessages} onSend={handleSendChat} />
    </div>
  );
}
