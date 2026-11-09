import { useRef, useState } from 'react';
import type { PointerEvent as EvenementPointeur, ReactNode } from 'react';

interface Props {
  onFermer: () => void;
  className?: string;
  children: ReactNode;
  role?: string;
}

const SEUIL = 80; // px : au-delà, l'alerte part
const DEPLACEMENT_MIN = 8; // px : en dessous, c'est un simple appui (clic)

// Alerte qu'on peut balayer du doigt vers la gauche ou la droite pour la
// fermer (décision du 09/11), en plus du bouton ×. Le défilement vertical de
// la page reste possible (touch-action: pan-y).
export default function Balayable({ onFermer, className = '', children, role }: Props) {
  const [dx, setDx] = useState(0);
  const [depart, setDepart] = useState<'gauche' | 'droite' | null>(null);
  const [enGlisse, setEnGlisse] = useState(false); // le doigt est posé et bouge
  const debut = useRef<{ x: number; t: number; id: number } | null>(null);
  const aGlisse = useRef(false);

  const bas = (e: EvenementPointeur<HTMLDivElement>) => {
    if (depart || (e.pointerType === 'mouse' && e.button !== 0)) return;
    debut.current = { x: e.clientX, t: e.timeStamp, id: e.pointerId };
    aGlisse.current = false;
  };
  const deplace = (e: EvenementPointeur<HTMLDivElement>) => {
    const d = debut.current;
    if (!d || d.id !== e.pointerId) return;
    const ecart = e.clientX - d.x;
    if (!aGlisse.current && Math.abs(ecart) > DEPLACEMENT_MIN) {
      aGlisse.current = true;
      setEnGlisse(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (aGlisse.current) setDx(ecart);
  };
  const haut = (e: EvenementPointeur<HTMLDivElement>) => {
    const d = debut.current;
    debut.current = null;
    setEnGlisse(false);
    if (!d || !aGlisse.current) return;
    const vitesse = Math.abs(dx) / Math.max(1, e.timeStamp - d.t); // px / ms
    if (Math.abs(dx) > SEUIL || vitesse > 0.6) {
      setDepart(dx < 0 ? 'gauche' : 'droite');
      setTimeout(onFermer, 180);
    } else {
      setDx(0);
    }
  };

  const translation = depart ? (depart === 'gauche' ? -480 : 480) : dx;
  return (
    <div
      role={role}
      onPointerDown={bas}
      onPointerMove={deplace}
      onPointerUp={haut}
      onPointerCancel={() => {
        debut.current = null;
        setEnGlisse(false);
        setDx(0);
      }}
      // Un glissement ne doit pas compter comme un appui sur l'alerte.
      onClickCapture={e => {
        if (aGlisse.current) {
          e.preventDefault();
          e.stopPropagation();
          aGlisse.current = false;
        }
      }}
      className={className}
      style={{
        touchAction: 'pan-y',
        transform: translation ? `translateX(${translation}px)` : undefined,
        opacity: depart ? 0 : 1 - Math.min(Math.abs(dx) / 300, 0.6),
        transition: enGlisse ? 'none' : 'transform 180ms ease-out, opacity 180ms ease-out',
      }}
    >
      {children}
    </div>
  );
}
