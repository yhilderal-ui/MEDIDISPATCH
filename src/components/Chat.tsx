import { useState, useRef, useEffect } from 'react';

type Author = 'dispatcher' | 'livreur';

interface Message {
  id: string;
  author: Author;
  text: string;
  sentAt: Date;
}

interface Props {
  currentView: Author;
  messages: Message[];
  onSend: (text: string) => void;
}

const AUTHOR_LABEL: Record<Author, string> = {
  dispatcher: 'Dispatcheur',
  livreur: 'Pharmacie',
};

const AUTHOR_COLOR: Record<Author, { bg: string; text: string; bubble: string; bubbleText: string }> = {
  dispatcher: {
    bg: '#f3f4f6',
    text: '#374151',
    bubble: '#111827',
    bubbleText: '#ffffff',
  },
  livreur: {
    bg: '#ede9fe',
    text: '#5b21b6',
    bubble: '#7c3aed',
    bubbleText: '#ffffff',
  },
};

function fmt(d: Date) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function Chat({ currentView, messages, onSend }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [prevCount, setPrevCount] = useState(messages.length);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Count unread from the other side
  useEffect(() => {
    if (messages.length > prevCount) {
      const newMsgs = messages.slice(prevCount);
      const fromOther = newMsgs.filter(m => m.author !== currentView).length;
      if (!open && fromOther > 0) setUnread(u => u + fromOther);
    }
    setPrevCount(messages.length);
  }, [messages.length]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const otherView: Author = currentView === 'dispatcher' ? 'livreur' : 'dispatcher';

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-80 bg-white rounded-3xl shadow-2xl border border-black/5 flex flex-col overflow-hidden slide-in" style={{ height: '420px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center text-[10px]">🎛</div>
                <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-[10px]">🚚</div>
              </div>
              <div>
                <p className="text-xs font-700 text-gray-900">Messagerie</p>
                <p className="text-[10px] text-gray-400">Vous : <span className="font-600">{AUTHOR_LABEL[currentView]}</span></p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-sm transition-colors"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-gray-300 text-center">Commencez la conversation avec<br />{AUTHOR_LABEL[otherView]}.</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.author === currentView;
              const isFirst = i === 0 || messages[i - 1].author !== msg.author;
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {isFirst && (
                    <p className="text-[9px] font-600 uppercase tracking-widest text-gray-400 mb-1 px-1">
                      {AUTHOR_LABEL[msg.author]}
                    </p>
                  )}
                  <div
                    className="max-w-[220px] px-3 py-2 rounded-2xl text-sm leading-relaxed"
                    style={isMine
                      ? { background: AUTHOR_COLOR[currentView].bubble, color: AUTHOR_COLOR[currentView].bubbleText }
                      : { background: AUTHOR_COLOR[otherView].bg, color: AUTHOR_COLOR[otherView].text }
                    }
                  >
                    {msg.text}
                  </div>
                  <p className="text-[9px] text-gray-300 mt-0.5 px-1">{fmt(msg.sentAt)}</p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 px-3 pb-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Votre message…"
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-300"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-30"
                style={{ background: AUTHOR_COLOR[currentView].bubble }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6h10M6 1l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ background: open ? '#374151' : '#111827' }}
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 2h14a1 1 0 011 1v9a1 1 0 01-1 1H5l-4 3V3a1 1 0 011-1z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 text-white text-[9px] font-700 rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
