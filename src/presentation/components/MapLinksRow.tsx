import { Map, Navigation } from "lucide-react";
import { buildMapLinks } from "../../domain/valueObjects/MapLinks";
import type { EventProposal } from "../../domain/entities/types";

export function MapLinksRow({ local }: { local: EventProposal["local"] }) {
  const { googleMaps, waze } = buildMapLinks(local);

  return (
    <div className="flex gap-2">
      <a
        href={googleMaps}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-ink-700 text-ink-100 py-2 rounded-lg"
      >
        <Map size={14} />
        Google Maps
      </a>
      <a
        href={waze}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-ink-700 text-ink-100 py-2 rounded-lg"
      >
        <Navigation size={14} />
        Waze
      </a>
    </div>
  );
}
