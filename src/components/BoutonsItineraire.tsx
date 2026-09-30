import { Navigation } from 'lucide-react';
import { estAppareilApple, urlGoogleMaps, urlPlans, urlWaze } from '../lib/itineraire';

const LIEN =
  'inline-flex items-center gap-1 text-[11px] font-600 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors';

// « Itinéraire : Google Maps · Waze · Plans » — ouvre l'application de navigation
// (ou le site) avec l'adresse de livraison comme destination.
export default function BoutonsItineraire({ adresse, libelle = 'Itinéraire' }: { adresse: string; libelle?: string }) {
  const applications: [string, string][] = [
    ['Google Maps', urlGoogleMaps(adresse)],
    ['Waze', urlWaze(adresse)],
    ...(estAppareilApple() ? ([['Plans', urlPlans(adresse)]] as [string, string][]) : []),
  ];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 mr-0.5">
        <Navigation size={12} aria-hidden /> {libelle}
      </span>
      {applications.map(([nom, url]) => (
        <a key={nom} href={url} target="_blank" rel="noopener noreferrer" className={LIEN} aria-label={`Itinéraire avec ${nom}`}>
          {nom}
        </a>
      ))}
    </div>
  );
}
