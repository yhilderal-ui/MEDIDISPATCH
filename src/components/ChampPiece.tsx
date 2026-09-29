import { useRef, useState } from 'react';
import { erreurFichier } from '../lib/demandes';

interface Props {
  libelle: string;
  icone: string;
  fichier: File | undefined;
  onChange: (f: File | undefined) => void;
  onErreur: (message: string | null) => void;
}

function tailleLisible(octets: number): string {
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

// Un emplacement de pièce jointe (cliquer ou glisser-déposer un fichier).
export default function ChampPiece({ libelle, icone, fichier, onChange, onErreur }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [glisse, setGlisse] = useState(false);

  const choisir = (fichiers: FileList | null) => {
    const f = fichiers?.[0];
    if (!f) return;
    const refus = erreurFichier(f);
    onErreur(refus ? `${libelle} : ${refus}` : null);
    if (!refus) onChange(f);
  };

  if (fichier) {
    return (
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 min-h-[58px]">
        <span className="text-base shrink-0">{icone}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-700 uppercase tracking-widest text-gray-400">{libelle}</p>
          <p className="text-xs font-600 text-gray-700 truncate">{fichier.name}</p>
          <p className="text-[10px] text-gray-400 font-mono">{tailleLisible(fichier.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label={`Retirer : ${libelle}`}
          className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-gray-400 text-xs shrink-0"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Joindre : ${libelle}`}
      onDragOver={e => { e.preventDefault(); setGlisse(true); }}
      onDragLeave={() => setGlisse(false)}
      onDrop={e => { e.preventDefault(); setGlisse(false); choisir(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && ref.current?.click()}
      className="cursor-pointer border-2 border-dashed rounded-xl px-3 py-2 min-h-[58px] flex items-center gap-2 transition-colors"
      style={{ borderColor: glisse ? '#7c3aed' : '#e5e7eb', background: glisse ? '#f5f3ff' : '#fafafa' }}
    >
      <span className="text-base shrink-0 opacity-60">{icone}</span>
      <div className="min-w-0">
        <p className="text-xs font-600 text-gray-600">{libelle}</p>
        <p className="text-[10px] text-gray-400">+ Joindre (PDF, JPEG, PNG)</p>
      </div>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept="application/pdf,image/jpeg,image/png"
        onChange={e => { choisir(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
