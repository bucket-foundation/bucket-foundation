"use client";

import { useMemo, useState, useEffect } from "react";
import nextDynamic from "next/dynamic";
import type { CanonMarker } from "@/components/canon-globe";
import timelineData from "@/data/canon-timeline.json";

const R3FCanonGlobe = nextDynamic(() => import("@/components/canon-globe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-xs text-[color:var(--parchment-dim)]">
      loading globe…
    </div>
  ),
});

type Event = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  year: number;
  branch: string;
  kind: string;
};

const ALL_EVENTS = timelineData.events as Event[];
const MIN_YEAR = timelineData.min_year as number;
const MAX_YEAR = timelineData.max_year as number;

function fmtYear(y: number): string {
  if (y < 0) return `${Math.abs(y)} BCE`;
  return `${y} CE`;
}

// Visible window: events from a center-year ± (window) span, with a
// fade-window before/after where opacity tapers.
const WINDOW_BEFORE = 50;   // years of full opacity behind cursor
const WINDOW_AFTER = 20;    // years of full opacity ahead of cursor
const FADE_BEFORE = 200;    // fade-out window behind

export default function CanonTimelineMount() {
  const [year, setYear] = useState(1900);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(10); // years/sec

  // Autoplay
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setYear((y) => {
        const next = y + playSpeed * 0.05; // 50ms ticks
        if (next > MAX_YEAR) {
          setPlaying(false);
          return MAX_YEAR;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(id);
  }, [playing, playSpeed]);

  // Compute visible markers + their opacity based on year-distance.
  const visibleMarkers = useMemo<CanonMarker[]>(() => {
    const out: CanonMarker[] = [];
    for (const e of ALL_EVENTS) {
      const dy = year - e.year;
      // dy > 0: event is in the past (visible)
      // dy < 0: event is in the future (hidden)
      if (dy < -WINDOW_AFTER) continue;
      if (dy > FADE_BEFORE) continue;
      out.push({
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        year: e.year,
        branch: e.branch,
        title: e.title,
        kind: (e.kind === "figure-birth" || e.kind === "canon-entry"
          ? e.kind
          : "canon-entry") as CanonMarker["kind"],
      });
    }
    return out;
  }, [year]);

  const upcoming = useMemo(() => {
    return ALL_EVENTS.filter((e) => e.year > year && e.year - year <= 100).slice(0, 5);
  }, [year]);
  const recent = useMemo(() => {
    return ALL_EVENTS
      .filter((e) => e.year <= year && year - e.year <= 100)
      .sort((a, b) => b.year - a.year)
      .slice(0, 10);
  }, [year]);

  return (
    <div className="w-full">
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen py-12">
        <div
          className="relative w-full mx-auto"
          style={{ height: "min(80vh, 900px)", minHeight: "560px" }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in srgb, var(--gold) 8%, transparent) 0%, transparent 55%)",
            }}
          />
          <R3FCanonGlobe markers={visibleMarkers} className="relative z-10" />
        </div>
      </div>

      {/* Year readout */}
      <div className="text-center mb-6">
        <div
          className="font-serif-display text-4xl md:text-6xl text-[color:var(--gold)]"
          style={{ letterSpacing: "0.02em" }}
        >
          {fmtYear(Math.round(year))}
        </div>
        <div className="small-caps text-[10px] text-[color:var(--parchment-dim)] tracking-[0.18em] mt-2">
          {visibleMarkers.length} canon event{visibleMarkers.length !== 1 ? "s" : ""} visible
        </div>
      </div>

      {/* Time bar */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
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
          style={{ height: 6 }}
        />
        <div className="flex justify-between mt-2 small-caps text-[10px] text-[color:var(--parchment-dim)] tracking-[0.16em]">
          <span>{fmtYear(MIN_YEAR)}</span>
          <span>{fmtYear(0)}</span>
          <span>{fmtYear(1000)}</span>
          <span>{fmtYear(1800)}</span>
          <span>{fmtYear(MAX_YEAR)}</span>
        </div>

        {/* Playback controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setYear(MIN_YEAR)}
            className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--hairline)] px-3 py-1 hover:border-[color:var(--gold)] hover:text-[color:var(--gold)]"
          >
            ⏮ start
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--gold)] text-[color:var(--gold)] px-4 py-1 hover:bg-[color:var(--gold)] hover:text-white"
          >
            {playing ? "⏸ pause" : "▶ play"}
          </button>
          <button
            onClick={() => setYear(MAX_YEAR)}
            className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--hairline)] px-3 py-1 hover:border-[color:var(--gold)] hover:text-[color:var(--gold)]"
          >
            ⏭ now
          </button>
          <div className="flex items-center gap-2 small-caps text-[10px] text-[color:var(--parchment-dim)] tracking-[0.16em]">
            speed
            <select
              value={playSpeed}
              onChange={(e) => setPlaySpeed(Number(e.target.value))}
              className="border border-[color:var(--hairline)] bg-transparent px-2 py-1 text-[color:var(--basalt)]"
            >
              <option value={2}>2 yr/s (slow)</option>
              <option value={10}>10 yr/s</option>
              <option value={50}>50 yr/s</option>
              <option value={200}>200 yr/s (fast)</option>
            </select>
          </div>
        </div>

        {/* Quick jumps */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 small-caps text-[10px] tracking-[0.18em]">
          {[
            { label: "ancient", y: -300 },
            { label: "alhazen", y: 1021 },
            { label: "newton", y: 1687 },
            { label: "maxwell", y: 1865 },
            { label: "einstein", y: 1905 },
            { label: "shannon", y: 1948 },
            { label: "DNA", y: 1953 },
            { label: "now", y: 2020 },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => { setYear(s.y); setPlaying(false); }}
              className="border border-[color:var(--hairline)] px-2 py-1 hover:border-[color:var(--gold)] hover:text-[color:var(--gold)]"
            >
              {s.label} ({fmtYear(s.y)})
            </button>
          ))}
        </div>
      </div>

      {/* Sliding window: what just happened + what's coming */}
      <section className="max-w-4xl mx-auto px-4 mb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="small-caps text-[11px] text-[color:var(--gold)] tracking-[0.2em] mb-3">
            Recent (last 100 years)
          </h3>
          {recent.length === 0 ? (
            <p className="text-sm text-[color:var(--parchment-dim)] italic">
              No canon events yet in this window.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {recent.map((e) => (
                <li key={e.id} className="flex items-baseline gap-3">
                  <span
                    className="font-mono-mark text-xs text-[color:var(--gold-deep)] w-16 flex-shrink-0"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {fmtYear(e.year)}
                  </span>
                  <span className="text-[color:var(--basalt)]">
                    {e.title}
                  </span>
                  <span
                    className="small-caps text-[9px] tracking-[0.14em] text-[color:var(--parchment-dim)] ml-auto"
                  >
                    {e.branch}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="small-caps text-[11px] text-[color:var(--ochre)] tracking-[0.2em] mb-3">
            Coming next (next 100 years)
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-[color:var(--parchment-dim)] italic">
              End of canon-timeline.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-baseline gap-3 opacity-60">
                  <span
                    className="font-mono-mark text-xs text-[color:var(--ochre)] w-16 flex-shrink-0"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {fmtYear(e.year)}
                  </span>
                  <span className="text-[color:var(--basalt)]">{e.title}</span>
                  <span
                    className="small-caps text-[9px] tracking-[0.14em] text-[color:var(--parchment-dim)] ml-auto"
                  >
                    {e.branch}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
