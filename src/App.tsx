import { useState, useEffect, useRef } from 'react';
import type { DeliveryCard, CardNote } from './types';
import { INITIAL_CARDS } from './data';
import Board from './components/Board';
import LivreurBoard from './components/LivreurBoard';
import CreateCardModal from './components/CreateCardModal';
import Chat from './components/Chat';
import LoginScreen from './components/LoginScreen';
import WeekView from './components/WeekView';
import DeliveryCardComponent from './components/DeliveryCardComponent';
import logo from './assets/logo.png';
import { useAuth, type Role } from './lib/useAuth';
import { supabaseConfigured } from './lib/supabase';

type DispatcherView = 'kanban' | 'week';

interface ChatMessage {
  id: string;
  author: Role;
  text: string;
  sentAt: Date;
}

let idCounter = 9;

export default function App() {
  const { state: auth, signIn, signOut } = useAuth();
  const role: Role | null = auth.status === 'signed_in' ? auth.user.role : null;
  const userName = auth.status === 'signed_in' ? auth.user.name : '';
  const [cards, setCards] = useState<DeliveryCard[]>(INITIAL_CARDS);
  const [showModal, setShowModal] = useState(false);
  const [dispatcherView, setDispatcherView] = useState<DispatcherView>('kanban');
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [weekCardOpen, setWeekCardOpen] = useState<DeliveryCard | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'cm-1', author: 'dispatcher', text: 'Bonjour, la livraison DL-004 est prioritaire — produit sanguin critique.', sentAt: new Date(Date.now() - 1000 * 60 * 6) },
    { id: 'cm-2', author: 'livreur', text: 'Bien reçu, on part dans 10 minutes.', sentAt: new Date(Date.now() - 1000 * 60 * 5) },
  ]);
  const prevCountRef = useRef(cards.length);

  useEffect(() => {
    const fresh = cards.filter(c => c.isNew);
    if (fresh.length === 0) return;
    const t = setTimeout(() => {
      setCards(cs => cs.map(c => ({ ...c, isNew: false })));
    }, 5000);
    return () => clearTimeout(t);
  }, [cards]);

  const handleLogout = () => signOut();

  const handleCreate = (data: Omit<DeliveryCard, 'id' | 'createdAt' | 'status' | 'isNew' | 'livreurStatus'>) => {
    const newCard: DeliveryCard = {
      ...data,
      id: `DL-${String(idCounter++).padStart(3, '0')}`,
      createdAt: new Date(),
      status: 'nouveau',
      livreurStatus: 'nouveau',
      isNew: true,
      documents: [],
    };
    setCards(cs => [newCard, ...cs]);
  };

  const handleStatusChange = (id: string, status: DeliveryCard['status']) => {
    setCards(cs => cs.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleValidate = (id: string) => {
    setCards(cs => cs.map(c => c.id === id ? { ...c, livreurStatus: 'validé' } : c));
  };

  const handleArchive = (id: string) => {
    setCards(cs => cs.map(c => c.id === id ? { ...c, livreurStatus: 'archivé' } : c));
  };

  const handleCancel = (id: string) => {
    setCards(cs => cs.map(c => c.id === id ? { ...c, status: 'annulé', livreurStatus: 'annulé' } : c));
  };

  const handleSuspend = (id: string) => {
    setCards(cs => cs.map(c => c.id === id ? { ...c, status: 'suspendu', livreurStatus: 'suspendu' } : c));
  };

  const handleRestore = (id: string) => {
    setCards(cs => cs.map(c => c.id === id ? { ...c, status: 'nouveau', livreurStatus: 'nouveau' } : c));
  };

  const handleDropCard = (cardId: string, date: string) => {
    setCards(cs => cs.map(c => c.id === cardId ? { ...c, scheduledDate: date } : c));
  };

  const shiftWeek = (n: number) => {
    setWeekStart(d => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + n * 7);
      return nd;
    });
  };

  const handleAddNote = (cardId: string, note: CardNote) => {
    setCards(cs => cs.map(c =>
      c.id === cardId ? { ...c, cardNotes: [...(c.cardNotes ?? []), note] } : c
    ));
  };

  const handleSendChat = (text: string) => {
    if (!role) return;
    setChatMessages(ms => [...ms, {
      id: `cm-${Date.now()}`,
      author: role,
      text,
      sentAt: new Date(),
    }]);
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

  const nouveauCount = cards.filter(c => c.status === 'nouveau').length;
  const newLivreurCount = cards.filter(c => c.livreurStatus === 'nouveau').length;

  return (
    <div className="h-screen flex flex-col bg-[#f5f4f0] overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-black/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-white flex items-center justify-center">
            <img src={logo} alt="MediDispatch" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-700 text-gray-900 leading-tight">MediDispatch</h1>
            <p className="text-[10px] text-gray-400 font-mono tracking-wide">Livraison médicale — Île-de-France</p>
          </div>
        </div>

        {/* Role badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-600"
          style={role === 'dispatcher'
            ? { background: '#f3f4f6', color: '#111827' }
            : { background: '#f5f3ff', color: '#7c3aed' }}
        >
          <span>{role === 'dispatcher' ? '🎛' : '🚚'}</span>
          <span>{role === 'dispatcher' ? 'Dispatcheur' : 'Société de livraison'}</span>
          {userName && userName !== (role === 'dispatcher' ? 'Dispatcheur' : 'Société de livraison') && (
            <span className="opacity-60">— {userName}</span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="font-mono">{cards.length} demandes actives</span>
          </div>
          {role === 'dispatcher' && (
            <button
              onClick={() => setShowModal(true)}
              className="text-white text-xs font-600 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
              style={{ background: '#2db8a0' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#25a08b')}
              onMouseLeave={e => (e.currentTarget.style.background = '#2db8a0')}
            >
              <span>+</span> Nouvelle demande
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-500"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        {role === 'dispatcher' ? (
          <div className="h-full flex flex-col">
            <div className="px-6 pt-5 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-700 uppercase tracking-widest text-gray-400">
                  {dispatcherView === 'kanban' ? 'Tableau de dispatch' : 'Planning semaine'}
                </h2>
                <div className="flex-1 h-px bg-gray-200" />

                {/* Week navigation */}
                {dispatcherView === 'week' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => shiftWeek(-1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">‹</button>
                    <span className="text-xs font-600 text-gray-600 font-mono whitespace-nowrap">
                      {weekStart.getDate()} — {new Date(weekStart.getTime() + 5 * 86400000).getDate()} {['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'][new Date(weekStart.getTime() + 5 * 86400000).getMonth()]}
                    </span>
                    <button onClick={() => shiftWeek(1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">›</button>
                  </div>
                )}

                <span className="text-xs text-gray-400 font-mono">{nouveauCount} en attente</span>

                {/* View toggle */}
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg ml-2">
                  {([['kanban', '⊞'], ['week', '📅']] as [DispatcherView, string][]).map(([v, icon]) => (
                    <button
                      key={v}
                      onClick={() => setDispatcherView(v)}
                      className="text-xs px-2.5 py-1 rounded-md transition-all font-600"
                      style={{
                        background: dispatcherView === v ? 'white' : 'transparent',
                        color: dispatcherView === v ? '#111' : '#9ca3af',
                        boxShadow: dispatcherView === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden px-6 pb-6">
              {dispatcherView === 'kanban' ? (
                <Board
                  cards={cards}
                  onStatusChange={handleStatusChange}
                  onCancel={handleCancel}
                  onSuspend={handleSuspend}
                  onRestore={handleRestore}
                  isDispatcher
                />
              ) : (
                <>
                  <WeekView
                    cards={cards.filter(c => c.status !== 'annulé' && c.status !== 'suspendu')}
                    weekStart={weekStart}
                    onCardClick={setWeekCardOpen}
                    onDropCard={handleDropCard}
                  />
                  {weekCardOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setWeekCardOpen(null)}>
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                      <div className="relative w-72 slide-in" onClick={e => e.stopPropagation()}>
                        <DeliveryCardComponent
                          card={weekCardOpen}
                          onStatusChange={(id, s) => { handleStatusChange(id, s); setWeekCardOpen(null); }}
                          onCancel={(id) => { handleCancel(id); setWeekCardOpen(null); }}
                          onSuspend={(id) => { handleSuspend(id); setWeekCardOpen(null); }}
                          onRestore={(id) => { handleRestore(id); setWeekCardOpen(null); }}
                          isDispatcher
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {cards.some(c => c.isNew) && (
              <div className="shrink-0 mx-6 mt-4 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 flex items-center gap-3 slide-in">
                <span className="pulse-dot w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                <p className="text-sm font-500 text-violet-700">
                  <span className="font-700">{cards.filter(c => c.isNew).length} nouvelle{cards.filter(c => c.isNew).length > 1 ? 's' : ''} demande{cards.filter(c => c.isNew).length > 1 ? 's' : ''}</span>
                  {' '}disponible{cards.filter(c => c.isNew).length > 1 ? 's' : ''} — cliquez pour consulter les documents
                </p>
              </div>
            )}
            <div className="px-6 pt-4 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-700 uppercase tracking-widest text-gray-400">Tableau des livraisons</h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-mono">{newLivreurCount} à valider</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden px-6 pb-6">
              <LivreurBoard
                cards={cards}
                onValidate={handleValidate}
                onAddNote={handleAddNote}
                onArchive={handleArchive}
                onCancel={handleCancel}
                onSuspend={handleSuspend}
                onRestore={handleRestore}
                onDropCard={handleDropCard}
              />
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <CreateCardModal onClose={() => setShowModal(false)} onSubmit={handleCreate} />
      )}

      <Chat currentView={role} messages={chatMessages} onSend={handleSendChat} />
    </div>
  );
}
