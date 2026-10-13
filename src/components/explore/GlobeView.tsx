"use client";

import nextDynamic from "next/dynamic";
import type { CanonMarker } from "@/components/canon-globe/CanonMarkers";
import { GlobeErrorBoundary } from "@/components/canon-globe/GlobeErrorBoundary";

const R3FCanonGlobe = nextDynamic(() => import("@/components/canon-globe"), { ssr: false, loading: () => <div className="absolute inset-0" /> });

interface Props {
  markers: CanonMarker[];
  onSelect(id: string): void;
}

export default function GlobeView({ markers, onSelect }: Props) {
  return (
    <div data-testid="globe-view" data-markers={markers.length} className="absolute inset-0">
      <GlobeErrorBoundary>
        <R3FCanonGlobe markers={markers} onSelectChange={(m) => m && onSelect(m.id)} className="absolute inset-0" />
      </GlobeErrorBoundary>
    </div>
  );
}
