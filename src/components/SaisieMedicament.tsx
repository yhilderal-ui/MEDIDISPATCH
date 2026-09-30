import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { chargerCatalogue, memoriserChoix, rechercher } from '../lib/catalogueMedicaments';

interface Props {
  valeur: string;
  onChange: (valeur: string) => void;
  // Touches non utilisées par les suggestions (Entrée pour ajouter une ligne…).
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef?: (el: HTMLTextAreaElement | null) => void;
  ariaLabel: string;
  classeLigne: string;
  classeChamp: string;
  avant?: ReactNode;
  // Reste de la ligne : quantité (avec l'attribut data-quantite), bouton retirer…
  children?: ReactNode;
}

type Catalogue = Awaited<ReturnType<typeof chargerCatalogue>>;

// Champ « nom du médicament » avec suggestions issues de la BDPM.
// La liste s'affiche sous la ligne (dans le flux, pour ne pas être coupée par
// les fenêtres qui défilent) ; la saisie libre reste toujours possible.
export default function SaisieMedicament({ valeur, onChange, onKeyDown, inputRef, ariaLabel, classeLigne, classeChamp, avant, children }: Props) {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const ligneRef = useRef<HTMLDivElement>(null);
  const champRef = useRef<HTMLTextAreaElement | null>(null);
  const id = useId();

  const listeRef = useRef<HTMLUListElement>(null);

  const { noms: suggestions, total } = useMemo(
    () => (ouvert && catalogue ? rechercher(catalogue, valeur) : { noms: [], total: 0 }),
    [ouvert, catalogue, valeur],
  );
  const visible = suggestions.length > 0 && !(suggestions.length === 1 && suggestions[0] === valeur);

  useEffect(() => {
    setActif(-1);
    listeRef.current?.scrollTo({ top: 0 });
  }, [valeur]);

  // Au clavier, la suggestion en surbrillance reste visible dans la liste.
  useEffect(() => {
    if (actif >= 0) document.getElementById(`${id}-${actif}`)?.scrollIntoView({ block: 'nearest' });
  }, [actif, id]);

  // Zone de texte d'une ligne qui s'agrandit : un nom long (« …, comprimé
  // effervescent sécable ») reste lisible en entier, surtout sur téléphone.
  useLayoutEffect(() => {
    const champ = champRef.current;
    if (!champ) return;
    champ.style.height = 'auto';
    champ.style.height = `${champ.scrollHeight}px`;
  }, [valeur]);

  const charger = () => {
    if (!catalogue) chargerCatalogue().then(setCatalogue);
  };

  const choisir = (nom: string) => {
    onChange(nom);
    memoriserChoix(nom);
    setOuvert(false);
    ligneRef.current?.querySelector<HTMLInputElement>('[data-quantite]')?.focus();
  };

  const clavier = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (visible) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const pas = e.key === 'ArrowDown' ? 1 : -1;
        // -1 = aucune suggestion en surbrillance (retour à la saisie)
        setActif(a => {
          const suivant = a + pas;
          return suivant < -1 ? suggestions.length - 1 : suivant >= suggestions.length ? -1 : suivant;
        });
        return;
      }
      if (e.key === 'Enter' && actif >= 0 && actif < suggestions.length) {
        e.preventDefault();
        choisir(suggestions[actif]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setOuvert(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div ref={ligneRef}>
      <div className={`${classeLigne} items-start`}>
        {avant}
        <textarea
          ref={el => {
            champRef.current = el;
            inputRef?.(el);
          }}
          rows={1}
          value={valeur}
          onChange={e => {
            onChange(e.target.value.replace(/\n/g, ' '));
            setOuvert(true);
          }}
          onFocus={charger}
          onBlur={() => setOuvert(false)}
          onKeyDown={clavier}
          placeholder="Nom du médicament…"
          aria-label={ariaLabel}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={visible}
          aria-controls={id}
          aria-activedescendant={visible && actif >= 0 ? `${id}-${actif}` : undefined}
          autoComplete="off"
          className={`${classeChamp} resize-none overflow-hidden leading-snug block`}
        />
        {children}
      </div>
      {visible && (
        <div className="border-t border-gray-100 bg-violet-50/40">
          <p className="px-3 pt-2 pb-1 text-[10px] text-gray-400">
            {total} résultat{total > 1 ? 's' : ''}
            {total > suggestions.length && ` — les ${suggestions.length} premiers, précisez la saisie`}
            {suggestions.length > 5 && ' · faites défiler la liste'}
          </p>
          {/* Liste défilante ; mousedown empêché (même sur la barre de défilement) :
              le champ garde le focus jusqu'au choix. */}
          <ul
            ref={listeRef}
            id={id}
            role="listbox"
            aria-label="Suggestions"
            onMouseDown={e => e.preventDefault()}
            className="max-h-60 overflow-y-auto overscroll-contain pb-1"
          >
            {suggestions.map((nom, i) => {
              const virgule = nom.indexOf(', ');
              const marque = virgule > 0 ? nom.slice(0, virgule) : nom;
              const forme = virgule > 0 ? nom.slice(virgule + 2) : '';
              return (
                <li
                  key={nom}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={i === actif}
                  onClick={() => choisir(nom)}
                  onMouseEnter={() => setActif(i)}
                  className={`px-3 py-2 text-sm cursor-pointer leading-snug border-b border-gray-100/70 last:border-b-0 ${i === actif ? 'bg-violet-100' : ''}`}
                >
                  <span className="font-600 text-gray-800">{marque}</span>
                  {forme && <span className="text-gray-400">, {forme}</span>}
                </li>
              );
            })}
          </ul>
          <p className="px-3 py-1 text-[10px] text-gray-300 border-t border-gray-100">Source : Base de données publique des médicaments</p>
        </div>
      )}
    </div>
  );
}
