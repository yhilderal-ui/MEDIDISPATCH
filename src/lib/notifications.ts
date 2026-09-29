import { useCallback, useEffect, useRef, useState } from 'react';
import type { Demande, MessageChat } from '../types';
import { etatVu } from './demandes';
import { CRITICITE_CONFIG } from '../data';

// Étape 10 : notifications in-app (cahier des charges, section 9 :
// « in-app uniquement pour la V1, pas d'e-mail ni de SMS »).
// Trois signaux, tous déclenchés par l'AUTRE compte :
//   1. un bandeau cliquable dans l'application ;
//   2. un son (plus insistant pour une demande urgente) ;
//   3. le titre de l'onglet, et une notification du navigateur si la fenêtre
//      est en arrière-plan (optionnelle, à autoriser une fois).

export interface Alerte {
  id: string;
  genre: 'nouvelle' | 'maj' | 'message';
  titre: string;
  detail: string;
  urgente: boolean;
  demandeId?: string; // clic → ouvre la carte
  chat?: boolean; // clic → ouvre le chat
}

// ---------------------------------------------------------------- préférences

const CLE_SON = 'medidispatch.son';

function lirePreferenceSon(): boolean {
  try {
    return localStorage.getItem(CLE_SON) !== 'non';
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------- son

let contexteAudio: AudioContext | null = null;

// Les navigateurs n'autorisent le son qu'après un premier clic : on prépare
// le lecteur audio dès la première interaction.
function preparerAudio() {
  try {
    contexteAudio ??= new AudioContext();
    if (contexteAudio.state === 'suspended') contexteAudio.resume();
  } catch {
    /* navigateur sans Web Audio : pas de son */
  }
}

function jouerSon(urgente: boolean) {
  if (!contexteAudio) return;
  // Deux notes douces ; trois notes plus aiguës pour une demande urgente.
  const notes = urgente ? [880, 1175, 880] : [660, 880];
  const debut = contexteAudio.currentTime;
  notes.forEach((frequence, i) => {
    const osc = contexteAudio!.createOscillator();
    const volume = contexteAudio!.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequence;
    const t = debut + i * 0.18;
    volume.gain.setValueAtTime(0.0001, t);
    volume.gain.exponentialRampToValueAtTime(urgente ? 0.35 : 0.2, t + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(volume).connect(contexteAudio!.destination);
    osc.start(t);
    osc.stop(t + 0.17);
  });
}

// ------------------------------------------------------ notification système

export function notificationsNavigateurDisponibles(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function notifierNavigateur(alerte: Alerte, auClic: () => void) {
  if (!notificationsNavigateurDisponibles() || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible' && document.hasFocus()) return;
  try {
    const n = new Notification(alerte.titre, { body: alerte.detail, tag: alerte.id, icon: '/favicon.png' });
    n.onclick = () => {
      window.focus();
      auClic();
      n.close();
    };
  } catch {
    /* certains navigateurs mobiles refusent les notifications hors service worker */
  }
}

// ------------------------------------------------------------------- le hook

interface Options {
  utilisateurId: string | null;
  demandes: Demande[];
  chargement: boolean;
  messages: MessageChat[];
  nonLusChat: number;
  chatCharge: boolean;
  chatOuvert: boolean;
  onOuvrirDemande: (id: string) => void;
  onOuvrirChat: () => void;
}

const TITRE = 'MediDispatch';

export function useNotifications({ utilisateurId, demandes, chargement, messages, nonLusChat, chatCharge, chatOuvert, onOuvrirDemande, onOuvrirChat }: Options) {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [son, setSon] = useState(lirePreferenceSon);
  const [permission, setPermission] = useState<NotificationPermission | 'indisponible'>(() =>
    notificationsNavigateurDisponibles() ? Notification.permission : 'indisponible',
  );
  // Carte non vue → date de sa dernière activité, pour repérer les nouveautés.
  const nonVuesAvant = useRef<Map<string, string> | null>(null);
  const nonLusAvant = useRef<number | null>(null);
  const sonRef = useRef(son);
  sonRef.current = son;

  useEffect(() => {
    const premierClic = () => preparerAudio();
    window.addEventListener('pointerdown', premierClic);
    window.addEventListener('keydown', premierClic);
    return () => {
      window.removeEventListener('pointerdown', premierClic);
      window.removeEventListener('keydown', premierClic);
    };
  }, []);

  const fermer = useCallback((id: string) => setAlertes(as => as.filter(a => a.id !== id)), []);

  const activer = useCallback((alerte: Alerte) => {
    fermer(alerte.id);
    if (alerte.demandeId) onOuvrirDemande(alerte.demandeId);
    if (alerte.chat) onOuvrirChat();
  }, [fermer, onOuvrirDemande, onOuvrirChat]);

  const emettre = useCallback((nouvelles: Alerte[]) => {
    if (nouvelles.length === 0) return;
    setAlertes(as => [...nouvelles, ...as].slice(0, 5));
    if (sonRef.current) jouerSon(nouvelles.some(a => a.urgente));
    nouvelles.forEach(a => notifierNavigateur(a, () => activer(a)));
    // Le bandeau disparaît seul après 12 secondes (la pastille reste sur la carte).
    nouvelles.forEach(a => setTimeout(() => fermer(a.id), 12000));
  }, [activer, fermer]);

  // Cartes créées ou modifiées par l'autre compte.
  useEffect(() => {
    if (!utilisateurId || chargement) return;
    const nonVues = demandes.filter(d => etatVu(d, utilisateurId) !== null);
    const avant = nonVuesAvant.current;
    nonVuesAvant.current = new Map(nonVues.map(d => [d.id, d.derniere_activite_le]));
    if (avant === null) return; // premier chargement : pas d'alerte pour l'existant
    const nouvelles: Alerte[] = [];
    nonVues.forEach(d => {
      // Déjà signalée et rien de neuf depuis : pas de nouvelle alerte.
      if (avant.get(d.id) === d.derniere_activite_le) return;
      const id = d.id;
      const etat = etatVu(d, utilisateurId);
      const crit = CRITICITE_CONFIG[d.criticite];
      nouvelles.push({
        id: `${id}-${d.derniere_activite_le}`,
        genre: etat === 'nouvelle' ? 'nouvelle' : 'maj',
        titre: etat === 'nouvelle' ? `Nouvelle demande ${d.numero_ticket}` : `Demande ${d.numero_ticket} mise à jour`,
        detail: `${d.patient_nom} — ${crit.label}`,
        urgente: d.criticite === 'urgent',
        demandeId: id,
      });
    });
    emettre(nouvelles);
  }, [demandes, chargement, utilisateurId, emettre]);

  // Nouveaux messages du chat.
  useEffect(() => {
    if (!utilisateurId || !chatCharge) return; // attendre l'historique du chat
    const avant = nonLusAvant.current;
    nonLusAvant.current = nonLusChat;
    // Chat déjà ouvert : le message est sous les yeux, pas besoin d'alerte.
    if (avant === null || nonLusChat <= avant || chatOuvert) return;
    const dernier = [...messages].reverse().find(m => m.auteur !== utilisateurId);
    if (!dernier) return;
    emettre([{
      id: `chat-${dernier.id}`,
      genre: 'message',
      titre: `Message de ${dernier.auteur_role === 'dispatcheur' ? 'Florence' : 'la pharmacie'}`,
      detail: dernier.contenu.length > 90 ? `${dernier.contenu.slice(0, 90)}…` : dernier.contenu,
      urgente: false,
      chat: true,
    }]);
  }, [nonLusChat, messages, utilisateurId, chatCharge, chatOuvert, emettre]);

  // Titre de l'onglet : « (3) MediDispatch », qui clignote si la fenêtre est
  // en arrière-plan et qu'une alerte est en attente.
  const total = utilisateurId
    ? demandes.filter(d => etatVu(d, utilisateurId) !== null).length + nonLusChat
    : 0;
  useEffect(() => {
    const titreBase = total > 0 ? `(${total}) ${TITRE}` : TITRE;
    document.title = titreBase;
    if (total === 0) return;
    let bascule = false;
    const minuteur = setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        document.title = titreBase;
        return;
      }
      bascule = !bascule;
      document.title = bascule ? `● ${total} nouveauté${total > 1 ? 's' : ''}` : titreBase;
    }, 1200);
    return () => {
      clearInterval(minuteur);
      document.title = TITRE;
    };
  }, [total]);

  const basculerSon = () => {
    const suivant = !son;
    setSon(suivant);
    try {
      localStorage.setItem(CLE_SON, suivant ? 'oui' : 'non');
    } catch {
      /* navigation privée : la préférence ne sera pas mémorisée */
    }
    if (suivant) {
      preparerAudio();
      jouerSon(false);
    }
  };

  const autoriserNavigateur = async () => {
    if (!notificationsNavigateurDisponibles()) return;
    setPermission(await Notification.requestPermission());
  };

  return { alertes, fermer, activer, son, basculerSon, permission, autoriserNavigateur };
}
