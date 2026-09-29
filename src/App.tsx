import { useState, useEffect, useCallback, useRef } from 'react';
import type { Demande, EtatVu, ModificationDemande, NouvelleDemande, Pieces, Statut, TypeDocument } from './types';
import { publierBonGenere } from './lib/bonLivraison';
import Board from './components/Board';
import LivreurBoard from './components/LivreurBoard';
import CreateCardModal from './components/CreateCardModal';
import Chat from './components/Chat';
import LoginScreen from './components/LoginScreen';
import WeekView from './components/WeekView';
import DemandePanel from './components/DemandePanel';
import BarreFiltres from './components/BarreFiltres';
import ArchivesView from './components/ArchivesView';
import { appliquerFiltres, FILTRES_VIDES, type Filtres } from './lib/filtres';
import logo from './assets/logo.png';
import { useAuth, type Role } from './lib/useAuth';
import { supabaseConfigured } from './lib/supabase';
import {
  changerStatut,
  creerDemande,
  deposerDocument,
  etatVu,
  listerArchives,
  listerDemandes,
  marquerVue,
  messageErreur,
  modifierDemande,
  reporter,
  supprimerDemande,
  surveillerDemandes,
} from './lib/demandes';
import { useChat } from './lib/chat';
import { useNotifications } from './lib/notifications';
import Alertes from './components/Alertes';
import { ajouterJours, lundiDeLaSemaine, moisCourt } from './lib/dates';

type DispatcherView = 'kanban' | 'week';

export default function App() {
  const { state: auth, signIn, signOut } = useAuth();
  const role: Role | null = auth.status === 'signed_in' ? auth.user.role : null;
  const userName = auth.status === 'signed_in' ? auth.user.name : '';
  const userId = auth.status === 'signed_in' ? auth.user.id : null;
  const chat = useChat(userId);

  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ouverteId, setOuverteId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dispatcherView, setDispatcherView] = useState<DispatcherView>('kanban');
  const [weekStart, setWeekStart] = useState<Date>(() => lundiDeLaSemaine(new Date()));
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_VIDES);
  const [vueArchives, setVueArchives] = useState(false);
  const [archives, setArchives] = useState<Demande[]>([]);
  const [chargementArchives, setChargementArchives] = useState(false);
  const vueArchivesRef = useRef(false);

  const recharger = useCallback(async () => {
    try {
      setDemandes(await listerDemandes());
      if (vueArchivesRef.current) setArchives(await listerArchives());
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

  // Les archives ne sont chargées que lorsqu'on les affiche.
  useEffect(() => {
    vueArchivesRef.current = vueArchives;
    if (!vueArchives) return;
    setChargementArchives(true);
    listerArchives()
      .then(setArchives)
      .catch(e => setErreur(messageErreur(e)))
      .finally(() => setChargementArchives(false));
  }, [vueArchives]);

  // Ouvrir une carte la marque comme vue ; si l'autre compte la modifie
  // pendant qu'elle est ouverte, elle est de nouveau marquée comme vue.
  const ouverteCourante = ouverteId ? demandes.find(d => d.id === ouverteId) ?? archives.find(d => d.id === ouverteId) : undefined;
  const ouverteNonVue = ouverteCourante && userId ? etatVu(ouverteCourante, userId) !== null : false;
  useEffect(() => {
    if (!ouverteId || !ouverteNonVue) return;
    marquerVue(ouverteId).then(recharger).catch(e => setErreur(messageErreur(e)));
  }, [ouverteId, ouverteNonVue, recharger]);

  // Étape 10 : alertes quand l'autre compte crée, modifie ou écrit.
  const [chatSignal, setChatSignal] = useState(0);
  const [chatOuvert, setChatOuvert] = useState(false);
  const ouvrirChat = useCallback(() => setChatSignal(n => n + 1), []);
  const notif = useNotifications({
    utilisateurId: userId,
    demandes,
    chargement,
    messages: chat.messages,
    nonLusChat: chat.nonLus,
    chatOuvert,
    onOuvrirDemande: setOuverteId,
    onOuvrirChat: ouvrirChat,
  });

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

  const handleCreate = async (demande: NouvelleDemande, pieces: Pieces): Promise<string | null> => {
    try {
      const { id, numeroTicket, erreursFichiers } = await creerDemande(demande, pieces);
      const problemes: string[] = [];
      if (erreursFichiers.length) problemes.push(`certaines pièces jointes n'ont pas pu être envoyées (${erreursFichiers.join(' ; ')})`);
      try {
        await publierBonGenere(id);
      } catch (e) {
        problemes.push(`le bon de livraison n'a pas pu être généré (${(e as Error).message})`);
      }
      await recharger();
      if (problemes.length) {
        setErreur(`Demande ${numeroTicket} créée, mais ${problemes.join(' et ')}. Ouvrez la demande pour réessayer.`);
      } else {
        setInfo(`Demande ${numeroTicket} créée, bon de livraison généré.`);
      }
      return null;
    } catch (e) {
      return messageErreur(e);
    }
  };

  // Toute modification du contenu du bon (informations, date) le régénère,
  // en remplaçant l'ancien (décision du 29/09).
  const modifierPuisRegenerer = (id: string, ticket: string, action: () => Promise<void>, succes: string) =>
    agir(async () => {
      await action();
      try {
        await publierBonGenere(id);
      } catch (e) {
        throw new Error(`${succes.replace(/\.$/, '')}, mais le bon de livraison n'a pas pu être régénéré : ${(e as Error).message}`);
      }
    }, `${succes} Bon de livraison ${ticket} mis à jour.`);

  const handleDropCard = (id: string, jour: string) => {
    const d = demandes.find(x => x.id === id);
    if (!d || d.jour_livraison === jour) return;
    modifierPuisRegenerer(id, d.numero_ticket, () => reporter(id, jour), `Demande ${d.numero_ticket} reportée.`);
  };

  const shiftWeek = (n: number) => setWeekStart(d => ajouterJours(d, n * 7));

  if (auth.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f5f4f0] flex items-center justify-center">
        <p className="text-xs text-gray-400 font-mono">Chargement…</p>
      </div>
    );
  }

  if (!role || !userId) {
    return (
      <LoginScreen
        onSignIn={signIn}
        initialError={auth.status === 'signed_out' ? auth.error : undefined}
        configMissing={!supabaseConfigured}
      />
    );
  }

  const ouverte = ouverteCourante ?? null;
  const ouvrir = (d: Demande) => setOuverteId(d.id);
  const actives = demandes.filter(d => d.statut !== 'annulee');
  const filtrees = appliquerFiltres(demandes, filtres);
  const archivesFiltrees = appliquerFiltres(archives, filtres);

  const barreFiltres = (
    <div className="flex items-center gap-2 flex-wrap">
      <BarreFiltres
        filtres={filtres}
        onChange={setFiltres}
        nbResultats={vueArchives ? archivesFiltrees.length : filtrees.length}
        nbTotal={vueArchives ? archives.length : demandes.length}
        masquerStatut={vueArchives}
      />
      <button
        type="button"
        onClick={() => setVueArchives(v => !v)}
        className="ml-auto text-xs font-600 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
      >
        {vueArchives ? '← Retour au tableau' : '🗄 Archives'}
      </button>
    </div>
  );
  const nbNouvelles = demandes.filter(d => d.statut === 'nouvelle').length;
  const finSemaine = ajouterJours(weekStart, 5);
  const etats: Record<string, EtatVu> = Object.fromEntries(demandes.map(d => [d.id, etatVu(d, userId)]));
  const nbNonVues = Object.values(etats).filter(Boolean).length;

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
          <button
            type="button"
            onClick={notif.basculerSon}
            title={notif.son ? 'Son des alertes activé (cliquer pour couper)' : 'Son des alertes coupé (cliquer pour activer)'}
            aria-label={notif.son ? 'Couper le son des alertes' : 'Activer le son des alertes'}
            className="text-base leading-none opacity-70 hover:opacity-100"
          >
            {notif.son ? '🔔' : '🔕'}
          </button>
          {notif.permission === 'default' && (
            <button
              type="button"
              onClick={notif.autoriserNavigateur}
              className="hidden md:inline text-[11px] font-600 text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2.5 py-1 rounded-full"
            >
              Recevoir les alertes même fenêtre réduite
            </button>
          )}
          {nbNonVues > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-600 text-violet-700 bg-violet-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 pulse-dot" aria-hidden />
              {nbNonVues} non vue{nbNonVues > 1 ? 's' : ''}
            </span>
          )}
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
        ) : vueArchives ? (
          <div className="h-full flex flex-col px-4 sm:px-6 pt-5 pb-6">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <h2 className="text-xs font-700 uppercase tracking-widest text-gray-400">Archives</h2>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">Demandes livrées depuis plus de 30 jours</span>
            </div>
            <div className="mb-4 shrink-0">{barreFiltres}</div>
            <div className="flex-1 min-h-0">
              <ArchivesView demandes={archivesFiltrees} chargement={chargementArchives} onOpen={ouvrir} />
            </div>
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
              <div className="mt-3">{barreFiltres}</div>
            </div>

            <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-6">
              {dispatcherView === 'kanban' ? (
                <Board demandes={filtrees} onOpen={ouvrir} etats={etats} />
              ) : (
                <WeekView demandes={filtrees.filter(d => d.statut !== 'annulee')} weekStart={weekStart} onOpen={ouvrir} onDropCard={handleDropCard} etats={etats} />
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
            <div className="mb-3 shrink-0">{barreFiltres}</div>
            <div className="flex-1 min-h-0">
              <LivreurBoard demandes={filtrees} onOpen={ouvrir} onDropCard={handleDropCard} etats={etats} />
            </div>
          </div>
        )}
      </main>

      {ouverte && (
        <DemandePanel
          demande={ouverte}
          role={role}
          utilisateurId={userId}
          onClose={() => setOuverteId(null)}
          onSupprimer={async () => {
            const ticket = ouverte.numero_ticket;
            const ok = await agir(() => supprimerDemande(ouverte), `Demande ${ticket} supprimée.`);
            if (ok) setOuverteId(null);
            return ok;
          }}
          onChangerStatut={(statut: Statut) => agir(() => changerStatut(ouverte.id, statut), `Demande ${ouverte.numero_ticket} mise à jour.`)}
          onReporter={(jour: string) =>
            modifierPuisRegenerer(ouverte.id, ouverte.numero_ticket, () => reporter(ouverte.id, jour), `Demande ${ouverte.numero_ticket} reportée.`)
          }
          onModifier={(champs: ModificationDemande) =>
            modifierPuisRegenerer(ouverte.id, ouverte.numero_ticket, () => modifierDemande(ouverte.id, champs), `Demande ${ouverte.numero_ticket} modifiée.`)
          }
          onGenererBon={() => agir(() => publierBonGenere(ouverte.id), 'Bon de livraison généré.')}
          onDeposer={(type: TypeDocument, fichier: File) =>
            agir(async () => { await deposerDocument(ouverte.id, type, fichier); }, 'Document ajouté.')
          }
        />
      )}

      {showModal && <CreateCardModal onClose={() => setShowModal(false)} onSubmit={handleCreate} />}

      <Alertes alertes={notif.alertes} onActiver={notif.activer} onFermer={notif.fermer} />

      <Chat
        utilisateurId={userId}
        role={role}
        messages={chat.messages}
        nonLus={chat.nonLus}
        autreVuJusquau={chat.autreVuJusquau}
        erreur={chat.erreur}
        onSend={chat.envoyer}
        onMarquerLu={chat.marquerLu}
        ouvrirSignal={chatSignal}
        onOuvertChange={setChatOuvert}
      />
    </div>
  );
}
