import type { DeliveryCard, MedicalDocument, CardNote } from '../types';
import { DOC_CONFIG, PRIORITY_CONFIG } from '../data';
import { useState } from 'react';
import iconArchive from '../assets/icon-archive.png';

interface Props {
  card: DeliveryCard;
  onClose: () => void;
  onValidate?: (id: string) => void;
  onAddNote?: (cardId: string, note: CardNote) => void;
  onCancel?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onRestore?: (id: string) => void;
  onArchive?: (id: string) => void;
}

function DocRow({ doc, onOpen }: { doc: MedicalDocument; onOpen: (doc: MedicalDocument) => void }) {
  const cfg = DOC_CONFIG[doc.type];
  return (
    <button
      onClick={() => onOpen(doc)}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: cfg.bg }}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-600 text-gray-800 leading-tight truncate">{doc.label}</p>
        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{doc.reference}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{doc.issuer}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {doc.confidential && (
          <span className="text-[9px] font-700 uppercase tracking-widest text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
            Confidentiel
          </span>
        )}
        <span className="text-[10px] text-gray-400">{doc.pages} p.</span>
        <span className="text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors">Ouvrir →</span>
      </div>
    </button>
  );
}

function DocViewer({ doc, onBack }: { doc: MedicalDocument; onBack: () => void }) {
  const cfg = DOC_CONFIG[doc.type];
  return (
    <div className="flex flex-col h-full slide-in">
      <button onClick={onBack} className="text-xs font-600 text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 mb-5">
        ← Retour
      </button>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: cfg.bg }}>
          {cfg.icon}
        </div>
        <div>
          <p className="font-700 text-gray-900">{doc.label}</p>
          <p className="text-xs font-mono text-gray-400">{doc.reference}</p>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {[
          { label: 'Émetteur', value: doc.issuer },
          { label: 'Date', value: new Date(doc.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
          { label: 'Pages', value: `${doc.pages} page${doc.pages > 1 ? 's' : ''}` },
        ].map(row => (
          <div key={row.label} className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-xs text-gray-400 font-600 uppercase tracking-wider">{row.label}</span>
            <span className="text-xs text-gray-700 font-500">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden relative">
        {doc.confidential && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl">🔒</div>
            <p className="text-sm font-700 text-gray-800">Document confidentiel</p>
            <p className="text-xs text-gray-500 text-center px-6">Accès restreint aux personnels autorisés.</p>
            <button className="mt-1 text-xs font-600 bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors">
              Saisir mon code d'accès
            </button>
          </div>
        )}
        <div className="p-5 space-y-3">
          {[0.75, 1, 0.83, 0.67, 0, 1, 0.8, 1, 0.6, 0, 1, 0.83].map((w, i) =>
            w === 0 ? <div key={i} className="h-4" /> :
            <div key={i} className="h-3 bg-gray-200 rounded-full" style={{ width: `${w * 100}%` }} />
          )}
        </div>
      </div>
    </div>
  );
}

function NotesTab({
  notes,
  onAdd,
}: {
  notes: CardNote[];
  onAdd: (note: CardNote) => void;
}) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({
      id: `note-${Date.now()}`,
      author: author.trim() || 'Anonyme',
      content: trimmed,
      createdAt: new Date(),
    });
    setText('');
  };

  const fmt = (d: Date) =>
    d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-4">
      {notes.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">Aucune note pour cette demande.</p>
      )}
      {notes.map(note => (
        <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 slide-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-700 text-amber-800">{note.author}</span>
            <span className="text-[10px] text-amber-500 font-mono">{fmt(note.createdAt)}</span>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">{note.content}</p>
        </div>
      ))}

      {/* Add note form */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ajouter une note…"
          rows={3}
          className="w-full px-4 pt-3 pb-2 text-sm text-gray-800 resize-none outline-none placeholder:text-gray-300"
        />
        <div className="flex items-center gap-2 px-3 pb-3">
          <input
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Votre nom"
            className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-300 transition-colors placeholder:text-gray-300"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="text-xs font-600 bg-amber-400 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentPanel({ card, onClose, onValidate, onAddNote, onCancel, onSuspend, onRestore, onArchive }: Props) {
  const [activeDoc, setActiveDoc] = useState<MedicalDocument | null>(null);
  const priority = PRIORITY_CONFIG[card.priority];
  const notes = card.cardNotes ?? [];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl flex flex-col slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-400 tracking-widest">{card.id}</span>
              <span
                className="text-[10px] font-700 uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ color: priority.color, background: priority.color + '15' }}
              >
                {priority.label}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          <h2 className="text-base font-700 text-gray-900 mb-0.5">{card.client}</h2>
          {card.patient && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-3">
              <span>🏥</span> Patient : <span className="font-500 text-gray-700">{card.patient}</span>
            </p>
          )}

          <div className="space-y-1 mb-3">
            <div className="flex items-start gap-2">
              <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <p className="text-xs text-gray-500 leading-snug">{card.pickup}</p>
            </div>
            <div className="ml-[3px] w-px h-3 bg-gray-200" />
            <div className="flex items-start gap-2">
              <span className="mt-1 w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <p className="text-xs text-gray-500 leading-snug">{card.dropoff}</p>
            </div>
          </div>

          {card.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <p className="text-xs text-amber-700 leading-snug">{card.notes}</p>
            </div>
          )}

          {card.products && card.products.length > 0 && (
            <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-700 uppercase tracking-widest text-gray-400">Produits</p>
                <span className="text-[10px] font-mono text-gray-400">{card.products.length} article{card.products.length !== 1 ? 's' : ''}</span>
              </div>
              {card.products.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-300 font-mono w-4">{i + 1}</span>
                    <span className="text-xs text-gray-700 font-500">{p.name}</span>
                  </div>
                  {p.quantity && (
                    <span className="text-[11px] font-600 text-gray-400 font-mono">{p.quantity}</span>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeDoc ? (
            <DocViewer doc={activeDoc} onBack={() => setActiveDoc(null)} />
          ) : (
            <>
              <p className="text-[10px] font-700 uppercase tracking-widest text-gray-400 mb-1">
                Documents ({card.documents?.length ?? 0})
              </p>
              <div className="divide-y divide-gray-100 mb-6">
                {(card.documents ?? []).map(doc => (
                  <DocRow key={doc.id} doc={doc} onOpen={setActiveDoc} />
                ))}
                {(card.documents?.length ?? 0) === 0 && (
                  <p className="text-sm text-gray-400 py-4 text-center">Aucun document joint</p>
                )}
              </div>

              <div className="h-px bg-gray-100 mb-5" />

              <p className="text-[10px] font-700 uppercase tracking-widest text-gray-400 mb-3">
                Notes{notes.length > 0 ? ` (${notes.length})` : ''}
              </p>
              <NotesTab
                notes={notes}
                onAdd={note => onAddNote?.(card.id, note)}
              />
            </>
          )}
        </div>

        {/* Footer */}
        {!activeDoc && (
          <div className="shrink-0 px-6 pb-6 pt-3 border-t border-gray-100 flex flex-col gap-2">
            {/* Validate */}
            {card.livreurStatus === 'nouveau' && onValidate && (
              <button
                onClick={() => { onValidate(card.id); onClose(); }}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-600 text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>✓</span> Valider la prise en charge
              </button>
            )}

            {/* Validated state */}
            {card.livreurStatus === 'validé' && (
              <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-600 text-sm py-2.5 rounded-xl flex items-center justify-center gap-2">
                <span>✓</span> Prise en charge validée
              </div>
            )}

            {/* Archive (only for validated) */}
            {card.livreurStatus === 'validé' && onArchive && (
              <button
                onClick={() => { onArchive(card.id); onClose(); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-600 text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <img src={iconArchive} alt="" className="w-4 h-4" style={{ filter: 'brightness(0) invert(0.4)' }} /> Archiver
              </button>
            )}

            {/* Suspended / cancelled state */}
            {(card.livreurStatus === 'suspendu' || card.livreurStatus === 'annulé') && (
              <div
                className="w-full text-sm font-600 py-2.5 rounded-xl flex items-center justify-center gap-2 border"
                style={card.livreurStatus === 'annulé'
                  ? { background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }
                  : { background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}
              >
                {card.livreurStatus === 'annulé' ? '✕ Demande annulée' : '⏸ Demande suspendue'}
              </div>
            )}

            {/* Restore */}
            {(card.livreurStatus === 'suspendu' || card.livreurStatus === 'annulé') && onRestore && (
              <button
                onClick={() => { onRestore(card.id); onClose(); }}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-600 text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                ↩ Remettre en attente
              </button>
            )}

            {/* Suspend / Cancel (active cards only) */}
            {(card.livreurStatus === 'nouveau' || card.livreurStatus === 'validé') && (onSuspend || onCancel) && (
              <div className="flex gap-2 pt-1">
                {onSuspend && (
                  <button
                    onClick={() => { onSuspend(card.id); onClose(); }}
                    className="flex-1 text-xs font-600 py-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors"
                  >
                    ⏸ Suspendre
                  </button>
                )}
                {onCancel && (
                  <button
                    onClick={() => { onCancel(card.id); onClose(); }}
                    className="flex-1 text-xs font-600 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors"
                  >
                    ✕ Annuler
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
