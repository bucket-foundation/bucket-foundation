import CanonGlobe from "@/components/canon-globe/CanonGlobe";
import type { CanonMarker } from "@/components/canon-globe/CanonMarkers";
import { GlobeErrorBoundary } from "@/components/canon-globe/GlobeErrorBoundary";
import { globeProjection } from "@/components/canon-globe/projections";

export default function Globe3d({ markers, onSelect }: { markers: CanonMarker[]; onSelect: (m: CanonMarker | null) => void }) {
  return (
    <GlobeErrorBoundary>
      <CanonGlobe markers={markers} projection={globeProjection} onSelectChange={onSelect} />
    </GlobeErrorBoundary>
  );
}
