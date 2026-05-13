"use client";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import StaticCanonGlobe, { GlobeBranch } from "@/components/CanonGlobe";
import type { CanonMarker } from "@/components/canon-globe";
import { GlobeErrorBoundary } from "@/components/canon-globe/GlobeErrorBoundary";
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

  // The sidebar appears only when the search-bar container hits the top of
  // the viewport — i.e. the moment the sticky search bar would "pin" itself.
  // It hides again once the user scrolls past the tool (search bar leaves
  // viewport top). Driven by two sentinel divs:
  //   - sentinelTop sits just above the search bar. When it crosses out the
  //     top of the viewport, the sticky bar is pinned → show sidebar.
  //   - sentinelBottom sits just after the globe. When it crosses out the
  //     top of the viewport, the user has scrolled past the tool → hide.
  const sentinelTopRef = useRef<HTMLDivElement | null>(null);
  const sentinelBottomRef = useRef<HTMLDivElement | null>(null);
  const [pinnedTop, setPinnedTop] = useState(false);   // search bar reached top
  const [pastTool, setPastTool] = useState(false);     // scrolled past globe
  const inTool = pinnedTop && !pastTool;

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const top = sentinelTopRef.current;
    const bottom = sentinelBottomRef.current;
    if (!top || !bottom) return;

    // Detect "search bar pinned to viewport top":
    // sentinelTop is above the search bar. When its bottom edge is at or
    // above the viewport top (rootMargin -1px top), it's pinned.
    const ioTop = new IntersectionObserver(
      ([e]) => setPinnedTop(!e.isIntersecting && e.boundingClientRect.top < 0),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    const ioBottom = new IntersectionObserver(
      ([e]) => setPastTool(!e.isIntersecting && e.boundingClientRect.top < 0),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    ioTop.observe(top);
    ioBottom.observe(bottom);
    return () => { ioTop.disconnect(); ioBottom.disconnect(); };
  }, []);

  // Time scrub state — always visible, defaults to 2020 CE (= show all)
  const [year, setYear] = useState(2020);
  const [playing, setPlaying] = useState(false);

  // Search + branch filter
  const [q, setQ] = useState("");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
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
        const url = new URL("/api/canon/search", window.location.origin);
        url.searchParams.set("q", q);
        url.searchParams.set("top_k", "15");
        if (branchFilter) url.searchParams.set("branch", branchFilter);
        const r = await fetch(url.toString(), { signal: ac.signal });
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
  }, [q, branchFilter]);

  return (
    <div
      className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen min-h-screen py-4 md:py-6 transition-[padding] duration-300 ${
        inTool ? "md:pr-[440px]" : ""
      }`}
    >
      {/* Sentinel: just above the search bar. When this scrolls out the top
          of the viewport, the search bar is pinned → show sidebar. */}
      <div ref={sentinelTopRef} aria-hidden style={{ height: 1 }} />

      {/* SEARCH BAR — rounded pill, sticky above the globe */}
      <div className="sticky top-20 z-30 mx-auto mb-3 w-full px-4 flex flex-col items-center gap-2">
        <div className="w-full max-w-2xl pointer-events-auto">
          <div
            className="rounded-full shadow-sm flex items-center px-2"
            style={{ background: "var(--bone)", border: "1px solid var(--hairline)" }}
          >
            <svg
              className="ml-3 mr-2 flex-shrink-0"
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--parchment-dim)" }}
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search canon · 599 claims across 9 branches"
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

        {/* Branch filter chips — one row of 9 toggles below the search */}
        <div className="w-full max-w-2xl flex flex-wrap items-center justify-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => setBranchFilter(null)}
            className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] transition"
            style={{
              fontFamily: "var(--font-jetbrains)",
              background: branchFilter === null ? "var(--basalt)" : "transparent",
              color: branchFilter === null ? "var(--bone)" : "var(--parchment-dim)",
              border: `1px solid ${branchFilter === null ? "var(--basalt)" : "var(--hairline)"}`,
            }}
          >
            all
          </button>
          {[
            ["01-mathematics", "math", "#D9A43A"],
            ["02-physics", "physics", "#3E6FA8"],
            ["03-chemistry", "chem", "#9B5A2C"],
            ["04-information", "info", "#557B66"],
            ["05-biophysics", "biophys", "#8E3E3E"],
            ["06-cosmology", "cosmo", "#5B4882"],
            ["07-mind", "mind", "#C2873E"],
            ["08-deep-history", "deep-hist", "#7A5D3E"],
            ["09-sacred-texts", "sacred", "#A0863F"],
          ].map(([slug, label, color]) => {
            const active = branchFilter === slug;
            return (
              <button
                key={slug}
                onClick={() => setBranchFilter(active ? null : slug)}
                className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] transition"
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  background: active ? color : "transparent",
                  color: active ? "white" : color,
                  border: `1px solid ${color}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

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
        {/* Tiny corner legend — out of the way but always visible */}
        <div
          className="absolute bottom-3 right-3 z-20 pointer-events-none rounded-md px-3 py-2 shadow-sm"
          style={{
            background: "color-mix(in srgb, var(--bone) 92%, transparent)",
            border: "1px solid var(--hairline)",
            fontFamily: "var(--font-jetbrains)",
          }}
        >
          <div
            className="text-[9px] uppercase tracking-[0.22em] mb-1"
            style={{ color: "var(--gold)" }}
          >
            globe controls
          </div>
          <ul
            className="space-y-0.5 text-[10px]"
            style={{ color: "var(--parchment-dim)" }}
          >
            <li><span style={{ color: "var(--basalt)" }}>drag</span> · rotate</li>
            <li><span style={{ color: "var(--basalt)" }}>scroll</span> · zoom</li>
            <li><span style={{ color: "var(--basalt)" }}>click</span> · marker details</li>
            <li><span style={{ color: "var(--basalt)" }}>↓</span> · scrub time</li>
          </ul>
        </div>

        <GlobeErrorBoundary>
          <R3FCanonGlobe
            markers={markers}
            activeIndex={activeIndex}
            onHoverChange={setHovered}
            onSelectChange={setSelected}
            className="relative z-10"
          />
        </GlobeErrorBoundary>
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

      {/* Sentinel: end of tool block. When it scrolls out the top of the
          viewport, the user has scrolled past the globe → hide sidebar. */}
      <div ref={sentinelBottomRef} aria-hidden style={{ height: 1 }} />

      {/* RIGHT-SIDE INFO DRAWER — only visible while the globe is in view */}
      <Drawer selected={selected} inTool={inTool} onClose={() => setSelected(null)} />
    </div>
  );
}

function Drawer({
  selected,
  inTool,
  onClose,
}: {
  selected: CanonMarker | null;
  inTool: boolean;
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
      {/* mobile-only backdrop when a marker is selected */}
      <div
        onClick={onClose}
        aria-hidden
        className="md:hidden fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          background: selected ? "rgba(31,28,22,0.35)" : "transparent",
          opacity: selected ? 1 : 0,
          pointerEvents: selected ? "auto" : "none",
        }}
      />
      <aside
        className={`fixed right-0 top-0 h-screen z-50 overflow-y-auto transition-transform duration-300 ${
          // Mobile: visible only when something selected.
          // Desktop: visible only while the tool section is on screen
          //          (IntersectionObserver-driven) OR a marker selected.
          selected ? "translate-x-0" : (inTool ? "translate-x-full md:translate-x-0" : "translate-x-full")
        }`}
        style={{
          width: "min(440px, 100vw)",
          background: "var(--bone)",
          borderLeft: "1px solid var(--hairline)",
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

        {/* Empty state — desktop only, shown when nothing is selected.
            Acts as a persistent research panel: how to use, current corpus
            stats, quick links. */}
        {!selected && (
          <div className="hidden md:block p-6 md:p-8">
            <div
              className="pb-3 mb-5 border-b text-[10px] uppercase tracking-[0.22em]"
              style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)", borderColor: "var(--hairline)" }}
            >
              Detail panel
            </div>
            <h2
              className="text-xl leading-tight mb-3"
              style={{ fontFamily: "var(--font-fraunces)", color: "var(--basalt)", fontWeight: 500 }}
            >
              Click anywhere on the globe — or any search result — to inspect.
            </h2>
            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
            >
              This panel shows the canon entity you&apos;re currently focused on.
              Hover a pin to preview its title. Click to open the full record
              with year, branch, coordinates, claim excerpt (when from search),
              and links into the canon.
            </p>

            <div
              className="rounded-md p-4 mb-5"
              style={{ background: "var(--bone-2)", border: "1px solid var(--hairline)" }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.2em] mb-2"
                style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
              >
                Canon · live counts
              </div>
              <dl
                className="space-y-1 text-sm"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                <div className="flex justify-between">
                  <dt style={{ color: "var(--parchment-dim)" }}>Claim cards</dt>
                  <dd>599</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: "var(--parchment-dim)" }}>Branches</dt>
                  <dd>9</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: "var(--parchment-dim)" }}>Detected bridges</dt>
                  <dd>17</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: "var(--parchment-dim)" }}>Geocoded events</dt>
                  <dd>50</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: "var(--parchment-dim)" }}>Year span</dt>
                  <dd>570 BCE — 2020 CE</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-1.5 text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
              <a
                href="/canon/search"
                className="block px-3 py-2 rounded-md border hover:border-[color:var(--gold)] transition"
                style={{ borderColor: "var(--hairline)", color: "var(--basalt)" }}
              >
                ⌕ full-page search →
              </a>
              <a
                href="/canon/bridges"
                className="block px-3 py-2 rounded-md border hover:border-[color:var(--gold)] transition"
                style={{ borderColor: "var(--hairline)", color: "var(--basalt)" }}
              >
                ⤺⤻ multi-branch bridges →
              </a>
              <a
                href="/canon/graph"
                className="block px-3 py-2 rounded-md border hover:border-[color:var(--gold)] transition"
                style={{ borderColor: "var(--hairline)", color: "var(--basalt)" }}
              >
                ⌬ knowledge graph →
              </a>
            </div>

            <p
              className="mt-8 text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
            >
              A research tool. Free to read · paid to cite.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
