import { useState, useRef } from 'react';
import type { DeliveryCard, Priority, Attachment, Product } from '../types';

interface Props {
  onClose: () => void;
  onSubmit: (card: Omit<DeliveryCard, 'id' | 'createdAt' | 'status' | 'isNew' | 'livreurStatus'>) => void;
}

function mimeCategory(file: File): Attachment['mimeCategory'] {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) return 'word';
  return 'other';
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const MIME_ICONS: Record<Attachment['mimeCategory'], string> = {
  pdf: '📄',
  image: '🖼️',
  word: '📝',
  other: '📎',
};

export default function CreateCardModal({ onClose, onSubmit }: Props) {
  const [form, setForm] = useState({
    pickup: '',
    dropoff: '',
    client: '',
    phone: '',
    weight: '',
    notes: '',
    priority: 'standard' as Priority,
    patient: '',
    scheduledDate: '',
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [products, setProducts] = useState<Product[]>([{ id: 'p-1', name: '', quantity: '' }]);
  const productRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added: Attachment[] = Array.from(files).map(f => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      size: fileSize(f.size),
      type: f.type || 'application/octet-stream',
      mimeCategory: mimeCategory(f),
    }));
    setAttachments(a => [...a, ...added]);
  };

  const removeAttachment = (id: string) => setAttachments(a => a.filter(x => x.id !== id));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pickup || !form.dropoff || !form.client) return;
    onSubmit({ ...form, attachments, documents: [], cardNotes: [], products: products.filter(p => p.name.trim()) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg slide-in max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-700 text-gray-900">Nouvelle demande</h2>
            <p className="text-xs text-gray-400 mt-0.5">Créer une carte de livraison médicale</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Client + patient */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1">Établissement / Client</label>
              <input
                value={form.client}
                onChange={set('client')}
                placeholder="CHU Lariboisière"
                required
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1">Téléphone</label>
              <input
                value={form.phone}
                onChange={set('phone')}
                placeholder="01 49 95 65 65"
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1">Patient</label>
            <input
              value={form.patient}
              onChange={set('patient')}
              placeholder="M. Bernard Fontaine"
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
            />
          </div>

          {/* Route */}
          <div>
            <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1">Adresse de collecte</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400" />
              <input
                value={form.pickup}
                onChange={set('pickup')}
                placeholder="Pharmacie Centrale — 14 rue de Rivoli, Paris 1er"
                required
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1">Adresse de livraison</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-400" />
              <input
                value={form.dropoff}
                onChange={set('dropoff')}
                placeholder="Dr. Élise Morin — 88 avenue Kléber, Paris 16e"
                required
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* Scheduled date */}
          <div>
            <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1">Date de livraison prévue</label>
            <input
              type="date"
              value={form.scheduledDate}
              onChange={set('scheduledDate')}
              min={new Date().toISOString().split('T')[0]}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>

          {/* Weight + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1">Poids</label>
              <input
                value={form.weight}
                onChange={set('weight')}
                placeholder="ex : 0.8 kg"
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1">Priorité</label>
              <select
                value={form.priority}
                onChange={set('priority')}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all appearance-none"
              >
                <option value="urgent">🔴 Urgent</option>
                <option value="standard">🔵 Standard</option>
                <option value="low">⚪ Faible</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-1">Instructions spéciales</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Température contrôlée, fragilité, accès restreint…"
              rows={2}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none placeholder:text-gray-300"
            />
          </div>

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400">Produits</label>
              <span className="text-[10px] text-gray-400 font-mono">{products.filter(p => p.name.trim()).length} article{products.filter(p => p.name.trim()).length !== 1 ? 's' : ''}</span>
            </div>
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              {products.map((product, i) => (
                <div key={product.id} className="flex items-center gap-0 border-b border-gray-100 last:border-b-0 group">
                  <span className="pl-3 text-[11px] text-gray-300 font-mono w-6 shrink-0">{i + 1}</span>
                  <input
                    ref={el => { productRefs.current[i] = el; }}
                    value={product.name}
                    onChange={e => setProducts(ps => ps.map((p, j) => j === i ? { ...p, name: e.target.value } : p))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const newId = `p-${Date.now()}`;
                        setProducts(ps => {
                          const next = [...ps];
                          next.splice(i + 1, 0, { id: newId, name: '', quantity: '' });
                          return next;
                        });
                        setTimeout(() => productRefs.current[i + 1]?.focus(), 30);
                      }
                      if (e.key === 'Backspace' && product.name === '' && products.length > 1) {
                        e.preventDefault();
                        setProducts(ps => ps.filter((_, j) => j !== i));
                        setTimeout(() => productRefs.current[Math.max(0, i - 1)]?.focus(), 30);
                      }
                    }}
                    placeholder="Nom du produit…"
                    className="flex-1 text-sm px-3 py-2.5 outline-none bg-transparent placeholder:text-gray-300"
                  />
                  <input
                    value={product.quantity}
                    onChange={e => setProducts(ps => ps.map((p, j) => j === i ? { ...p, quantity: e.target.value } : p))}
                    placeholder="Qté"
                    className="w-16 text-sm px-2 py-2.5 outline-none bg-transparent text-gray-500 placeholder:text-gray-300 text-right"
                  />
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setProducts(ps => ps.filter((_, j) => j !== i))}
                      className="w-8 h-full flex items-center justify-center text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newId = `p-${Date.now()}`;
                  setProducts(ps => [...ps, { id: newId, name: '', quantity: '' }]);
                  setTimeout(() => productRefs.current[products.length]?.focus(), 30);
                }}
                className="w-full text-left text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors px-4 py-2.5 flex items-center gap-2"
              >
                <span className="text-base leading-none">+</span> Ajouter un produit
              </button>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="text-[10px] font-600 uppercase tracking-widest text-gray-400 block mb-2">Pièces jointes</label>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="relative cursor-pointer border-2 border-dashed rounded-2xl px-4 py-5 text-center transition-colors"
              style={{
                borderColor: dragging ? '#7c3aed' : '#e5e7eb',
                background: dragging ? '#f5f3ff' : '#fafafa',
              }}
            >
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => addFiles(e.target.files)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              />
              <p className="text-sm text-gray-400">
                <span className="font-600 text-gray-600">Cliquez</span> ou glissez-déposez vos fichiers ici
              </p>
              <p className="text-[11px] text-gray-300 mt-1">PDF, Word, images — jusqu'à 20 Mo par fichier</p>
            </div>

            {/* File list */}
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 slide-in">
                    <span className="text-base shrink-0">{MIME_ICONS[att.mimeCategory]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-600 text-gray-700 truncate">{att.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{att.size}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-gray-400 text-xs transition-colors shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-600 text-sm py-3 rounded-xl transition-colors"
          >
            Créer la demande →
          </button>
        </form>
      </div>
    </div>
  );
}
