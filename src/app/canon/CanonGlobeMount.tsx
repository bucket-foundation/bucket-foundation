"use client";
import nextDynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import StaticCanonGlobe, { GlobeBranch } from "@/components/CanonGlobe";
import type { CanonMarker } from "@/components/canon-globe";
import timelineData from "@/data/canon-timeline.json";

const R3FCanonGlobe = nextDynamic(() => import("@/components/canon-globe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <StaticCanonGlobe branches={[]} size={420} interactive={false} />
    </div>
  ),
});

type TimelineEvent = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  year: number;
  branch: string;
  kind: string;
};

const ALL_EVENTS = (timelineData.events as TimelineEvent[]).sort(
  (a, b) => a.year - b.year,
);
const MIN_YEAR = timelineData.min_year as number;
const MAX_YEAR = timelineData.max_year as number;

interface Props {
  branches: GlobeBranch[];
}

function fmtYear(y?: number): string {
  if (y === undefined) return "";
  if (y < 0) return `${Math.abs(y)} BCE`;
  return `${y} CE`;
}

function eventsAsMarkers(events: TimelineEvent[]): CanonMarker[] {
  return events.map((e) => ({
    id: e.id,
    lat: e.lat,
    lng: e.lng,
    year: e.year,
    branch: e.branch,
    title: e.title,
    kind:
      e.kind === "figure-birth" || e.kind === "canon-entry"
        ? (e.kind as CanonMarker["kind"])
        : "canon-entry",
  }));
}

export default function CanonGlobeMount({ branches: _branches }: Props) {
  const [hovered, setHovered] = useState<CanonMarker | null>(null);
  const [timeOn, setTimeOn] = useState(false);
  const [year, setYear] = useState(2020);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setYear((y) => {
        const next = y + 25;
        if (next > MAX_YEAR) {
          setPlaying(false);
          return MAX_YEAR;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing]);

  const markers = useMemo(() => {
    if (!timeOn) {
      // Default view: all events flat, sized by recency / branch
      return eventsAsMarkers(ALL_EVENTS);
    }
    return eventsAsMarkers(ALL_EVENTS.filter((e) => e.year <= year));
  }, [timeOn, year]);

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen py-6 md:py-8">
      {/* Hover readout — TOP of section, sticky so it follows when scrolling */}
      <div className="sticky top-20 z-30 mx-auto mb-4 w-full px-4 pointer-events-none flex justify-center">
        <div
          className="rounded-md px-5 py-3 shadow-md text-center transition-all duration-200"
          style={{
            background: "var(--bone)",
            border: `1px solid ${hovered ? "var(--gold)" : "var(--hairline)"}`,
            opacity: hovered ? 1 : 0.65,
            transform: hovered ? "scale(1.0)" : "scale(0.96)",
            maxWidth: "min(480px, calc(100vw - 24px))",
          }}
        >
          <div
            className="text-base md:text-lg"
            style={{
              fontFamily: "Cinzel, serif",
              color: "var(--basalt)",
              letterSpacing: "0.04em",
              minHeight: "1.3em",
            }}
          >
            {hovered?.title ||
              (timeOn ? fmtYear(Math.round(year)) : "hover or tap a marker")}
          </div>
          <div
            className="mt-1 text-xs uppercase"
            style={{
              fontFamily: "var(--font-jetbrains)",
              color: "var(--parchment-dim)",
              letterSpacing: "0.18em",
              minHeight: "1.2em",
            }}
          >
            {hovered ? (
              <>
                {hovered.year !== undefined && (
                  <span>{fmtYear(hovered.year)} · </span>
                )}
                <span>{hovered.branch}</span>
              </>
            ) : (
              <span>
                {timeOn
                  ? `${markers.length} canon events by ${fmtYear(Math.round(year))}`
                  : `${markers.length} canon-anchor places`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* The globe itself */}
      <div
        className="relative w-full mx-auto"
        style={{
          height: "min(70vh, 800px)",
          minHeight: "480px",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, color-mix(in srgb, var(--gold) 8%, transparent) 0%, transparent 55%)",
          }}
        />
        <R3FCanonGlobe
          markers={markers}
          onHoverChange={setHovered}
          className="relative z-10"
        />
      </div>

      {/* Time controls — collapsed by default. Expand in place; no separate
          /canon/timeline page needed. */}
      <div className="mx-auto mt-6 max-w-3xl px-4">
        {!timeOn ? (
          <div className="flex justify-center">
            <button
              onClick={() => setTimeOn(true)}
              className="small-caps text-[11px] tracking-[0.2em] border border-[color:var(--hairline)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] text-[color:var(--basalt)] px-5 py-2 transition"
            >
              ⏵ scrub through time
            </button>
          </div>
        ) : (
          <div>
            <input
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              step={1}
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setPlaying(false);
              }}
              className="w-full accent-[color:var(--gold)]"
            />
            <div className="flex justify-between mt-1 small-caps text-[10px] text-[color:var(--parchment-dim)] tracking-[0.16em]">
              <span>{fmtYear(MIN_YEAR)}</span>
              <span>{fmtYear(0)}</span>
              <span>{fmtYear(1500)}</span>
              <span>{fmtYear(MAX_YEAR)}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setYear(MIN_YEAR)}
                className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--hairline)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-1"
              >
                ⏮ start
              </button>
              <button
                onClick={() => setPlaying((p) => !p)}
                className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--gold)] text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:text-white px-4 py-1"
              >
                {playing ? "⏸ pause" : "▶ play"}
              </button>
              <button
                onClick={() => setYear(MAX_YEAR)}
                className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--hairline)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-1"
              >
                ⏭ now
              </button>
              <button
                onClick={() => { setTimeOn(false); setPlaying(false); }}
                className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--parchment-dim)] hover:text-[color:var(--basalt)] px-3 py-1"
              >
                exit ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
