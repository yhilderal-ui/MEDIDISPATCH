import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CircleQuestionMark, Eraser, LoaderCircle, SendHorizontal, ShieldAlert, X } from 'lucide-react';
import type { Role } from '../lib/useAuth';
import { demanderAssistant, SUGGESTIONS, type MessageAssistant } from '../lib/assistant';

const LONGUEUR_MAX = 1000;

// **gras** → <strong>, sans jamais injecter de HTML.
function enLigne(texte: string): ReactNode {
  return texte.split(/(\*\*[^*]+\*\*)/g).map((morceau, i) =>
    morceau.startsWith('**') && morceau.endsWith('**') && morceau.length > 4 ? (
      <strong key={i} className="font-700">{morceau.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{morceau}</Fragment>
    ),
  );
}

// Mise en forme minimale de la réponse : paragraphes, listes à puces et
// listes numérotées.
function MiseEnForme({ texte }: { texte: string }) {
  const blocs: ReactNode[] = [];
  let liste: { type: 'ul' | 'ol'; items: string[] } | null = null;
  const fermerListe = () => {
    if (!liste) return;
    const { type, items } = liste;
    const Balise = type;
    blocs.push(
      <Balise key={blocs.length} className={`${type === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 space-y-0.5`}>
        {items.map((item, i) => <li key={i}>{enLigne(item)}</li>)}
      </Balise>,
    );
    liste = null;
  };
  for (const ligne of texte.split('\n')) {
    const puce = ligne.match(/^\s*[-•*]\s+(.*)$/);
    const numero = ligne.match(/^\s*\d+[.)]\s+(.*)$/);
    if (puce || numero) {
      const type = puce ? 'ul' : 'ol';
      if (liste && liste.type !== type) fermerListe();
      if (!liste) liste = { type, items: [] };
      liste.items.push((puce ?? numero)![1]);
    } else {
      fermerListe();
      if (ligne.trim()) blocs.push(<p key={blocs.length}>{enLigne(ligne.replace(/^#+\s*/, ''))}</p>);
    }
  }
  fermerListe();
  return <div className="space-y-1.5">{blocs}</div>;
}

interface Props {
  role: Role;
  masque?: boolean; // pendant la sélection multiple : la barre d'actions occupe le bas de l'écran
}

// Bouton « ? » en bas à gauche (le chat est en bas à droite) et panneau de
// discussion avec l'assistant d'aide. Plein écran sur téléphone.
export default function Assistant({ role, masque = false }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<MessageAssistant[]>([]);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const saisieRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false);
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ouvert]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, enCours, erreur, ouvert]);

  useEffect(() => {
    if (ouvert) saisieRef.current?.focus();
  }, [ouvert]);

  if (masque && !ouvert) return null;

  const envoyer = async (texte: string) => {
    const question = texte.trim().slice(0, LONGUEUR_MAX);
    if (!question || enCours) return;
    const historique = messages;
    setMessages([...historique, { role: 'user', texte: question }]);
    setSaisie('');
    setErreur(null);
    setEnCours(true);
    try {
      const reponse = await demanderAssistant(question, historique);
      setMessages(m => [...m, { role: 'assistant', texte: reponse }]);
    } catch (e) {
      // La question revient dans la zone de saisie, pour réessayer d'un clic.
      setMessages(m => m.slice(0, -1));
      setSaisie(question);
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-col items-start gap-3">
      {ouvert && (
        <div
          role="dialog"
          aria-label="Aide MediDispatch"
          className="max-sm:fixed max-sm:inset-0 max-sm:z-50 max-sm:rounded-none w-full sm:w-[22rem] h-full sm:h-[min(540px,calc(100dvh-7rem))] bg-white sm:rounded-3xl shadow-2xl border border-black/5 flex flex-col overflow-hidden slide-in"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                <CircleQuestionMark size={15} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-700 text-gray-900">Aide</p>
                <p className="text-[10px] text-gray-400">Assistant MediDispatch (IA)</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setErreur(null);
                  }}
                  disabled={enCours}
                  title="Effacer la conversation"
                  aria-label="Effacer la conversation"
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center disabled:opacity-40"
                >
                  <Eraser size={15} aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer l'aide"
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </div>

          <p className="shrink-0 flex items-start gap-1.5 px-4 py-2 bg-amber-50 text-[11px] leading-snug text-amber-800 border-b border-amber-100">
            <ShieldAlert size={13} className="shrink-0 mt-px" aria-hidden />
            N'écrivez jamais de nom ni d'information sur un patient. L'assistant ne voit pas vos demandes.
          </p>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[13px] leading-relaxed" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-gray-600">
                  Bonjour ! Posez-moi une question sur l'utilisation de MediDispatch. Par exemple :
                </p>
                <div className="flex flex-col items-start gap-1.5">
                  {SUGGESTIONS[role].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => envoyer(s)}
                      disabled={enCours}
                      className="text-left text-xs font-600 text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-xl px-3 py-2 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] bg-gray-900 text-white rounded-2xl rounded-br-md px-3 py-2 whitespace-pre-wrap break-words">
                    {m.texte}
                  </p>
                </div>
              ) : (
                <div key={i} className="max-w-[92%] bg-gray-50 border border-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-3 py-2 break-words">
                  <MiseEnForme texte={m.texte} />
                </div>
              ),
            )}
            {enCours && (
              <p className="flex items-center gap-2 text-gray-400 text-xs" role="status">
                <LoaderCircle size={14} className="animate-spin" aria-hidden /> L'assistant réfléchit…
              </p>
            )}
            {erreur && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
                {erreur}
              </p>
            )}
            <div ref={finRef} />
          </div>

          <form
            className="shrink-0 border-t border-gray-100 p-3"
            onSubmit={e => {
              e.preventDefault();
              envoyer(saisie);
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={saisieRef}
                value={saisie}
                onChange={e => setSaisie(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    envoyer(saisie);
                  }
                }}
                rows={2}
                maxLength={LONGUEUR_MAX}
                placeholder="Votre question…"
                aria-label="Votre question"
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button
                type="submit"
                disabled={!saisie.trim() || enCours}
                aria-label="Envoyer la question"
                className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center hover:bg-sky-700 disabled:opacity-40 shrink-0"
              >
                <SendHorizontal size={16} aria-hidden />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-gray-400">
              L'assistant peut se tromper : en cas de doute, demandez à l'administratrice.
            </p>
          </form>
        </div>
      )}

      {!ouvert && (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          title="Aide"
          aria-label="Ouvrir l'aide"
          className="w-12 h-12 rounded-full bg-white text-sky-700 border border-black/5 shadow-lg hover:bg-sky-50 flex items-center justify-center"
        >
          <CircleQuestionMark size={22} aria-hidden />
        </button>
      )}
    </div>
  );
}
