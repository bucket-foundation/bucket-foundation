"use client";
import nextDynamic from "next/dynamic";
import { useState } from "react";
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
  branches: GlobeBranch[];
  markers?: CanonMarker[];
}

function fmtYear(y?: number): string {
  if (y === undefined) return "";
  if (y < 0) return `${Math.abs(y)} BCE`;
  return `${y} CE`;
}

export default function CanonGlobeMount({ branches: _branches, markers }: Props) {
  const [hovered, setHovered] = useState<CanonMarker | null>(null);
  const visibleMarkers = markers ?? DEFAULT_MARKERS;

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen py-12 md:py-16">
      <div
        className="relative w-full mx-auto"
        style={{
          height: "min(95vh, 1200px)",
          minHeight: "760px",
        }}
      >
        {/* radial vignette behind the globe */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, color-mix(in srgb, var(--gold) 8%, transparent) 0%, transparent 55%)",
          }}
        />
        <R3FCanonGlobe
          markers={visibleMarkers}
          onHoverChange={setHovered}
          className="relative z-10"
        />

        {/* Always-visible hover panel — guaranteed to render outside the
            canvas so it never gets clipped. Updates as the mouse moves
            over markers. */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-4 z-20 transition-opacity duration-150"
          style={{ opacity: hovered ? 1 : 0 }}
          aria-hidden={!hovered}
        >
          <div
            className="rounded-md px-5 py-3 shadow-md text-center"
            style={{
              background: "var(--bone)",
              border: "1px solid var(--hairline)",
              minWidth: "240px",
              maxWidth: "min(420px, calc(100vw - 32px))",
            }}
          >
            <div
              className="text-base"
              style={{
                fontFamily: "Cinzel, serif",
                color: "var(--basalt)",
                letterSpacing: "0.04em",
              }}
            >
              {hovered?.title || " "}
            </div>
            <div
              className="mt-1 text-xs uppercase"
              style={{
                fontFamily: "var(--font-jetbrains)",
                color: "var(--parchment-dim)",
                letterSpacing: "0.18em",
              }}
            >
              {hovered ? (
                <>
                  {hovered.year !== undefined && (
                    <span>{fmtYear(hovered.year)} · </span>
                  )}
                  <span>{hovered.branch}</span>
                  <span> · </span>
                  <span>{hovered.kind.replace(/-/g, " ")}</span>
                </>
              ) : (
                " "
              )}
            </div>
          </div>
        </div>

        {/* Mobile-friendly hint at the very bottom */}
        {!hovered && (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-4 z-10 text-center"
            style={{
              fontFamily: "var(--font-jetbrains)",
              color: "var(--parchment-dim)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            hover or tap a marker
          </div>
        )}
      </div>
    </div>
  );
}
