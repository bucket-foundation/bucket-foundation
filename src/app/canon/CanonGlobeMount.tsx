"use client";
import nextDynamic from "next/dynamic";
import StaticCanonGlobe, { GlobeBranch } from "@/components/CanonGlobe";
import type { CanonMarker } from "@/components/canon-globe";

const R3FCanonGlobe = nextDynamic(() => import("@/components/canon-globe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <StaticCanonGlobe branches={[]} size={420} interactive={false} />
    </div>
  ),
});

// Default markers — birthplaces of the 6 polymath bios + 2 canon-entry stubs.
// Real canon-events data wiring is a separate bead (see BEAD_BACKLOG.md).
const DEFAULT_MARKERS: CanonMarker[] = [
  { id: "newton",     lat:  52.806, lng:  -0.628, year: 1643, branch: "physics",     title: "Newton — Woolsthorpe",   kind: "figure-birth" },
  { id: "einstein",   lat:  48.401, lng:   9.987, year: 1879, branch: "physics",     title: "Einstein — Ulm",         kind: "figure-birth" },
  { id: "helmholtz",  lat:  52.400, lng:  13.060, year: 1821, branch: "physics",     title: "Helmholtz — Potsdam",    kind: "figure-birth" },
  { id: "vneumann",   lat:  47.500, lng:  19.050, year: 1903, branch: "information", title: "von Neumann — Budapest", kind: "figure-birth" },
  { id: "turing",     lat:  51.500, lng:  -0.130, year: 1912, branch: "information", title: "Turing — London",        kind: "figure-birth" },
  { id: "poincare",   lat:  48.690, lng:   6.180, year: 1854, branch: "mathematics", title: "Poincaré — Nancy",       kind: "figure-birth" },
  { id: "bragg",      lat: -34.930, lng: 138.600, year: 1862, branch: "chemistry",   title: "Bragg — Adelaide",       kind: "canon-entry" },
  { id: "mendeleev",  lat:  58.200, lng:  68.250, year: 1834, branch: "chemistry",   title: "Mendeleev — Tobolsk",    kind: "canon-entry" },
];

interface Props {
  // Branches are still passed through for the loading-fallback armillary,
  // but the live globe runs on canon markers, not branch ports.
  branches: GlobeBranch[];
  markers?: CanonMarker[];
}

export default function CanonGlobeMount({ branches: _branches, markers }: Props) {
  return (
    <div className="relative w-full min-h-[640px] lg:min-h-[820px]">
      <R3FCanonGlobe markers={markers ?? DEFAULT_MARKERS} />
    </div>
  );
}
