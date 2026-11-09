import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PointerEvent as EvenementPointeur } from 'react';
import { Eraser, Signature } from 'lucide-react';

interface Props {
  nomPatient: string;
  onAnnuler: () => void;
  onValider: (image: Blob, signataire: string) => Promise<boolean>;
}

// Signature au doigt sur le téléphone du livreur (décision du 09/11).
// L'encart occupe tout l'écran ; la page ne défile pas pendant qu'on signe.
export default function EncartSignature({ nomPatient, onAnnuler, onValider }: Props) {
  const toile = useRef<HTMLCanvasElement>(null);
  const dernier = useRef<{ x: number; y: number } | null>(null);
  // Rectangle occupé par le tracé, pour recadrer l'image autour de la signature.
  const cadre = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const etendre = (p: { x: number; y: number }) => {
    const c = cadre.current;
    cadre.current = c
      ? { x0: Math.min(c.x0, p.x), y0: Math.min(c.y0, p.y), x1: Math.max(c.x1, p.x), y1: Math.max(c.y1, p.y) }
      : { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  };
  const [vide, setVide] = useState(true);
  const [signataire, setSignataire] = useState(nomPatient);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Toile à la taille réelle de l'écran (nette sur les écrans haute densité).
  useEffect(() => {
    const c = toile.current;
    if (!c) return;
    const ajuster = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = c.getBoundingClientRect();
      c.width = Math.round(width * ratio);
      c.height = Math.round(height * ratio);
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#111827';
      cadre.current = null;
      setVide(true);
    };
    ajuster();
    window.addEventListener('resize', ajuster);
    return () => window.removeEventListener('resize', ajuster);
  }, []);

  const point = (e: EvenementPointeur<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const commencer = (e: EvenementPointeur<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dernier.current = point(e);
    etendre(dernier.current);
    const ctx = e.currentTarget.getContext('2d');
    if (ctx) {
      // Un simple appui laisse un point.
      ctx.beginPath();
      ctx.arc(dernier.current.x, dernier.current.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
    }
    setVide(false);
  };
  const tracer = (e: EvenementPointeur<HTMLCanvasElement>) => {
    if (!dernier.current) return;
    const ctx = e.currentTarget.getContext('2d');
    const p = point(e);
    etendre(p);
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(dernier.current.x, dernier.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    dernier.current = p;
  };
  const finir = () => {
    dernier.current = null;
  };
  const effacer = () => {
    const c = toile.current;
    const ctx = c?.getContext('2d');
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    cadre.current = null;
    setVide(true);
  };

  const valider = async () => {
    const c = toile.current;
    if (!c || vide) return;
    if (!signataire.trim()) {
      setErreur('Indiquez le nom de la personne qui signe.');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    // Image recadrée autour du tracé (avec une petite marge), pour qu'elle
    // occupe bien le cadre du bon de commande.
    const ratio = c.width / c.getBoundingClientRect().width;
    const b = cadre.current ?? { x0: 0, y0: 0, x1: c.width / ratio, y1: c.height / ratio };
    const marge = 8;
    const sx = Math.max(0, Math.floor((b.x0 - marge) * ratio));
    const sy = Math.max(0, Math.floor((b.y0 - marge) * ratio));
    const sw = Math.min(c.width - sx, Math.ceil((b.x1 - b.x0 + 2 * marge) * ratio));
    const sh = Math.min(c.height - sy, Math.ceil((b.y1 - b.y0 + 2 * marge) * ratio));
    const recadree = document.createElement('canvas');
    recadree.width = Math.max(1, sw);
    recadree.height = Math.max(1, sh);
    recadree.getContext('2d')?.drawImage(c, sx, sy, sw, sh, 0, 0, recadree.width, recadree.height);
    const image = await new Promise<Blob | null>(r => recadree.toBlob(r, 'image/png'));
    if (!image) {
      setEnvoi(false);
      setErreur("La signature n'a pas pu être enregistrée. Réessayez.");
      return;
    }
    const ok = await onValider(image, signataire.trim());
    setEnvoi(false);
    if (ok) onAnnuler();
  };

  // Rendu au niveau de la page : le panneau de la fiche est animé (transform),
  // ce qui empêcherait l'encart de couvrir tout l'écran.
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-white flex flex-col" role="dialog" aria-modal="true" aria-labelledby="titre-signature">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-2">
        <p id="titre-signature" className="text-sm font-700 text-gray-900 flex items-center gap-1.5">
          <Signature size={16} className="text-teal-700" aria-hidden /> Signature
        </p>
        <label className="block text-[10px] font-600 uppercase tracking-widest text-gray-400">
          Signé par
          <input
            value={signataire}
            onChange={e => setSignataire(e.target.value)}
            maxLength={80}
            className="mt-1 w-full text-sm normal-case tracking-normal font-500 text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"
          />
        </label>
        <p className="text-[11px] text-gray-500">Le patient, ou la personne qui réceptionne, signe dans le cadre ci-dessous.</p>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <div className="relative h-full rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50">
          <canvas
            ref={toile}
            aria-label="Zone de signature"
            onPointerDown={commencer}
            onPointerMove={tracer}
            onPointerUp={finir}
            onPointerCancel={finir}
            className="absolute inset-0 w-full h-full rounded-2xl"
            style={{ touchAction: 'none' }}
          />
          {vide && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-300">
              Signez ici avec le doigt
            </span>
          )}
          <span className="pointer-events-none absolute left-6 right-6 bottom-10 border-b border-gray-300" aria-hidden />
        </div>
      </div>

      {erreur && <p role="alert" className="mx-4 mb-2 text-xs text-red-600">{erreur}</p>}
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 grid grid-cols-3 gap-2">
        <button type="button" onClick={onAnnuler} disabled={envoi} className="text-sm font-600 py-3 rounded-xl bg-gray-100 text-gray-600">
          Annuler
        </button>
        <button type="button" onClick={effacer} disabled={envoi || vide} className="text-sm font-600 py-3 rounded-xl bg-gray-100 text-gray-600 disabled:opacity-40 inline-flex items-center justify-center gap-1.5">
          <Eraser size={15} aria-hidden /> Effacer
        </button>
        <button type="button" onClick={valider} disabled={envoi || vide} className="text-sm font-600 py-3 rounded-xl bg-teal-700 text-white disabled:opacity-40">
          {envoi ? 'Envoi…' : 'Valider'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
