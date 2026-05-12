"use client";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  id: string; title: string; lat: number; lng: number;
  year: number; branch: string; kind: string;
};

type SearchResult = {
  claim_id: number; branch: string; concept: string; slug: string;
  title: string; score: number; url: string; excerpt: string;
};

const ALL_EVENTS = (timelineData.events as TimelineEvent[]).sort((a, b) => a.year - b.year);
const MIN_YEAR = timelineData.min_year as number;
const MAX_YEAR = timelineData.max_year as number;

function fmtYear(y?: number): string {
  if (y === undefined) return "";
  if (y < 0) return `${Math.abs(y)} BCE`;
  return `${y} CE`;
}

function eventsAsMarkers(events: TimelineEvent[]): CanonMarker[] {
  return events.map((e) => ({
    id: e.id, lat: e.lat, lng: e.lng, year: e.year,
    branch: e.branch, title: e.title,
    kind: (e.kind === "figure-birth" || e.kind === "canon-entry"
      ? e.kind : "canon-entry") as CanonMarker["kind"],
  }));
}

interface Props {
  branches: GlobeBranch[];
}

export default function CanonGlobeMount({ branches: _branches }: Props) {
  const [hovered, setHovered] = useState<CanonMarker | null>(null);
  const [selected, setSelected] = useState<CanonMarker | null>(null);

  // Time scrub state — always visible, defaults to 2020 CE (= show all)
  const [year, setYear] = useState(2020);
  const [playing, setPlaying] = useState(false);

  // Search
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);

  // Active marker for highlight ring on the globe
  const markers = useMemo(
    () => eventsAsMarkers(ALL_EVENTS.filter((e) => e.year <= year)),
    [year],
  );

  const activeIndex = useMemo(() => {
    if (!selected) return undefined;
    const idx = markers.findIndex((m) => m.id === selected.id);
    return idx >= 0 ? idx : undefined;
  }, [selected, markers]);

  // Playback ticker
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setYear((y) => {
        const next = y + 25;
        if (next > MAX_YEAR) { setPlaying(false); return MAX_YEAR; }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing]);

  // Debounced search
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    searchAbort.current?.abort();
    const ac = new AbortController();
    searchAbort.current = ac;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/canon/search?q=${encodeURIComponent(q)}&top_k=8`, { signal: ac.signal });
        if (!r.ok) throw new Error(`http ${r.status}`);
        const j = await r.json();
        setResults(j.results || []);
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen py-4 md:py-6">
      {/* SEARCH BAR — sticky above the globe */}
      <div className="sticky top-20 z-30 mx-auto mb-3 w-full px-4 flex justify-center">
        <div className="w-full max-w-2xl pointer-events-auto">
          {/* Visible label so users immediately know what this is */}
          <div
            className="text-[10px] uppercase tracking-[0.22em] mb-1 px-1"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            ⌕ search canon · 599 claims across 9 branches
          </div>
          <div
            className="rounded-md shadow-sm flex items-center"
            style={{ background: "var(--bone)", border: "1px solid var(--hairline)" }}
          >
            <span
              className="pl-3 pr-2 text-base"
              style={{ color: "var(--parchment-dim)" }}
              aria-hidden
            >
              ⌕
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="type a question — e.g. 'why can't computers be conscious?'"
              className="flex-1 bg-transparent py-3 text-sm md:text-base outline-none placeholder:text-[color:var(--parchment-dim)]"
              style={{ fontFamily: "var(--font-fraunces)" }}
            />
            {q && (
              <button
                onClick={() => { setQ(""); setResults([]); }}
                className="px-3 text-[color:var(--parchment-dim)] hover:text-[color:var(--basalt)]"
                aria-label="clear"
              >
                ×
              </button>
            )}
          </div>
          {q.trim() && (
              <div
                className="max-h-72 overflow-y-auto border rounded-md mt-1"
                style={{ borderColor: "var(--hairline)", background: "var(--bone)" }}
              >
                {searching && results.length === 0 && (
                  <div className="px-4 py-3 text-xs text-[color:var(--parchment-dim)]">
                    searching…
                  </div>
                )}
                {!searching && results.length === 0 && (
                  <div className="px-4 py-3 text-xs text-[color:var(--parchment-dim)]">
                    no matches · try a broader term like &quot;consciousness&quot; or &quot;entropy&quot;
                  </div>
                )}
                {results.map((r) => (
                  <button
                    key={`${r.concept}/${r.slug}`}
                    onClick={() => {
                      // Open the drawer with this result. Also try to map to a
                      // globe marker if the branch matches one.
                      const m: CanonMarker = {
                        id: `claim:${r.claim_id}`,
                        lat: 0, lng: 0,    // unknown for claim cards
                        branch: r.branch.replace(/^\d+-/, ""),
                        title: r.title,
                        kind: "canon-entry",
                      };
                      setSelected(m);
                      // also stash the full search result on the marker for drawer use
                      (m as unknown as { _search: SearchResult })._search = r;
                      setQ("");
                      setResults([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-[color:var(--bone-2)] border-b last:border-0 transition"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
                        {r.title.slice(0, 80)}
                      </span>
                      <span
                        className="text-[10px] uppercase tracking-[0.16em] whitespace-nowrap"
                        style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                      >
                        {r.branch.replace(/^\d+-/, "")}
                      </span>
                    </div>
                    <div className="text-xs mt-1 line-clamp-1"
                         style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}>
                      {r.excerpt.slice(0, 120)}
                    </div>
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* INSTRUCTIONAL READOUT — tells the user exactly what to do */}
      {!selected && (
        <div className="mx-auto mb-3 flex justify-center px-4 pointer-events-none">
          <div
            className="rounded-md px-4 py-2 transition-all duration-200"
            style={{
              background: "var(--bone)",
              border: `1px solid ${hovered ? "var(--gold)" : "var(--hairline)"}`,
              opacity: hovered ? 1 : 0.85,
              maxWidth: "min(640px, calc(100vw - 24px))",
            }}
          >
            {hovered ? (
              <div className="text-center">
                <div className="text-sm" style={{ fontFamily: "Cinzel, serif", color: "var(--basalt)", letterSpacing: "0.04em" }}>
                  {hovered.title}
                </div>
                <div
                  className="text-[10px] uppercase tracking-[0.2em] mt-1"
                  style={{ fontFamily: "var(--font-jetbrains)", color: "var(--gold)" }}
                >
                  {hovered.year !== undefined && `${fmtYear(hovered.year)} · `}
                  {hovered.branch} · click to open details
                </div>
              </div>
            ) : (
              <div
                className="text-[11px] uppercase tracking-[0.18em] flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
                style={{ fontFamily: "var(--font-jetbrains)", color: "var(--parchment-dim)" }}
              >
                <span><span style={{ color: "var(--gold)" }}>drag</span> to rotate</span>
                <span><span style={{ color: "var(--gold)" }}>scroll</span> to zoom</span>
                <span><span style={{ color: "var(--gold)" }}>click</span> a marker for details</span>
                <span><span style={{ color: "var(--gold)" }}>scrub time</span> below</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GLOBE */}
      <div
        className="relative w-full mx-auto"
        style={{
          height: "min(68vh, 760px)",
          minHeight: "460px",
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
          activeIndex={activeIndex}
          onHoverChange={setHovered}
          onSelectChange={setSelected}
          className="relative z-10"
        />
      </div>

      {/* TIME SCRUBBER — always visible, clearly labelled */}
      <div className="mx-auto mt-5 max-w-3xl px-4">
        <div
          className="text-[10px] uppercase tracking-[0.22em] mb-2 px-1 text-center"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          ⏵ scrub through history — drag the slider to filter the globe by year
        </div>
        <div className="flex items-center gap-3 mb-1">
          <span
            className="font-serif-display text-xl md:text-2xl text-[color:var(--gold)] flex-shrink-0 text-right"
            style={{ minWidth: "120px" }}
            aria-label="current year"
          >
            {fmtYear(Math.round(year))}
          </span>
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step={1}
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setPlaying(false); }}
            className="flex-1 accent-[color:var(--gold)]"
            aria-label="year selector"
          />
          <button
            onClick={() => setPlaying((p) => !p)}
            className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--gold)] text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:text-white px-3 py-1 flex-shrink-0"
            title={playing ? "pause animation" : "auto-play through history"}
            aria-label={playing ? "pause" : "play"}
          >
            {playing ? "⏸ pause" : "▶ play"}
          </button>
        </div>
        <div className="flex justify-between small-caps text-[9px] text-[color:var(--parchment-dim)] tracking-[0.16em]">
          <button onClick={() => setYear(MIN_YEAR)} className="hover:text-[color:var(--gold)]" title="jump to earliest canon event">
            ⏮ {fmtYear(MIN_YEAR)}
          </button>
          <button onClick={() => setYear(0)} className="hover:text-[color:var(--gold)]">
            year 0
          </button>
          <button onClick={() => setYear(1500)} className="hover:text-[color:var(--gold)]">
            1500
          </button>
          <button onClick={() => setYear(MAX_YEAR)} className="hover:text-[color:var(--gold)]" title="jump to today">
            present {fmtYear(MAX_YEAR)} ⏭
          </button>
        </div>
        <div className="mt-2 text-center small-caps text-[10px] text-[color:var(--parchment-dim)] tracking-[0.18em]">
          showing {markers.length} canon event{markers.length === 1 ? "" : "s"} that happened by {fmtYear(Math.round(year))}
        </div>
      </div>

      {/* RIGHT-SIDE INFO DRAWER */}
      <Drawer selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Drawer({
  selected,
  onClose,
}: {
  selected: CanonMarker | null;
  onClose: () => void;
}) {
  const search = (selected as unknown as { _search?: SearchResult })?._search;
  const branchSlug = selected?.branch?.replace(/^\d+-/, "");

  // Close on Escape — standard UX expectation for drawers/modals
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onClose]);

  return (
    <>
      {/* backdrop only on mobile, soft on desktop */}
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-40 transition-opacity duration-200 md:bg-transparent md:pointer-events-none"
        style={{
          background: selected ? "rgba(31,28,22,0.35)" : "transparent",
          opacity: selected ? 1 : 0,
          pointerEvents: selected ? "auto" : "none",
        }}
      />
      <aside
        className="fixed right-0 top-0 h-screen z-50 transition-transform duration-300 overflow-y-auto"
        style={{
          width: "min(440px, 100vw)",
          background: "var(--bone)",
          borderLeft: "1px solid var(--hairline)",
          boxShadow: "-8px 0 32px rgba(31,28,22,0.18)",
          transform: selected ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {selected && (
          <div className="p-6 md:p-8">
            <div
              className="flex items-baseline justify-between mb-1 pb-3 border-b"
              style={{ borderColor: "var(--hairline)" }}
            >
              <span
                className="text-[10px] uppercase tracking-[0.22em]"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
              >
                Canon detail · click anywhere outside to close
              </span>
              <button
                onClick={onClose}
                className="text-2xl leading-none hover:text-[color:var(--gold)]"
                style={{ color: "var(--parchment-dim)" }}
                aria-label="close drawer"
                title="close (Esc)"
              >
                ×
              </button>
            </div>
            <div className="mt-5 mb-2">
              <span
                className="text-xs uppercase tracking-[0.18em]"
                style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
              >
                {selected.kind?.replace(/-/g, " ")}
              </span>
            </div>

            <h2
              className="text-2xl md:text-3xl leading-tight mb-3"
              style={{ fontFamily: "var(--font-fraunces)", color: "var(--basalt)", fontWeight: 500 }}
            >
              {selected.title}
            </h2>

            <dl className="space-y-3 mb-6 text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
              {selected.year !== undefined && (
                <div className="flex justify-between border-b border-[color:var(--hairline)] pb-2">
                  <dt style={{ color: "var(--parchment-dim)" }}>Year</dt>
                  <dd>{fmtYear(selected.year)}</dd>
                </div>
              )}
              <div className="flex justify-between border-b border-[color:var(--hairline)] pb-2">
                <dt style={{ color: "var(--parchment-dim)" }}>Branch</dt>
                <dd>{selected.branch}</dd>
              </div>
              {(selected.lat !== 0 || selected.lng !== 0) && (
                <div className="flex justify-between border-b border-[color:var(--hairline)] pb-2">
                  <dt style={{ color: "var(--parchment-dim)" }}>Coords</dt>
                  <dd className="font-mono text-xs">
                    {selected.lat.toFixed(2)}, {selected.lng.toFixed(2)}
                  </dd>
                </div>
              )}
            </dl>

            {search && (
              <section className="mb-6">
                <h3
                  className="text-xs uppercase tracking-[0.18em] mb-3"
                  style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
                >
                  Claim excerpt
                </h3>
                <blockquote
                  className="border-l-2 pl-4 py-1 text-sm leading-relaxed italic"
                  style={{
                    borderColor: "var(--gold)",
                    color: "var(--basalt)",
                    fontFamily: "var(--font-fraunces)",
                  }}
                >
                  {search.excerpt.slice(0, 400)}
                  {search.excerpt.length > 400 && "…"}
                </blockquote>
              </section>
            )}

            <div className="space-y-2">
              {search ? (
                <Link
                  href={`/canon/claims/${search.concept}/${search.slug}`}
                  className="block w-full text-center small-caps text-[11px] tracking-[0.18em] border border-[color:var(--gold)] text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:text-white px-4 py-2 transition"
                >
                  open full claim →
                </Link>
              ) : null}
              {branchSlug && (
                <Link
                  href={`/canon/${branchSlug}`}
                  className="block w-full text-center small-caps text-[11px] tracking-[0.18em] border border-[color:var(--hairline)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-4 py-2 transition"
                >
                  enter {branchSlug} branch →
                </Link>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
