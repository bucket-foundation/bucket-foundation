"use client";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import StaticCanonGlobe, { GlobeBranch } from "@/components/CanonGlobe";
import type { CanonMarker } from "@/components/canon-globe";
import { GlobeErrorBoundary } from "@/components/canon-globe/GlobeErrorBoundary";
import timelineData from "@/data/canon-timeline.json";
import sitesData from "@/data/canon-sites.json";
import figuresData from "../../../canon-figures/figures.json";

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

type SiteEntry = {
  id: string; title: string; lat: number; lng: number; year: number;
  civilization?: string; lidar?: string; unesco?: string; wikipedia?: string;
  branch: string; kind: string;
};

const ALL_EVENTS = (timelineData.events as TimelineEvent[]).sort((a, b) => a.year - b.year);
const ALL_SITES = (sitesData.sites as SiteEntry[]).sort((a, b) => a.year - b.year);
const MIN_YEAR = Math.min(timelineData.min_year as number, ...ALL_SITES.map((s) => s.year));
const MAX_YEAR = Math.max(timelineData.max_year as number, ...ALL_SITES.map((s) => s.year));

// Map a timeline figure-event id to the corresponding figures.json id when
// possible. Timeline uses shorter ids that occasionally diverge from
// figures.json (e.g. `becker-r` → `becker`, `curie-m` → `curie`,
// `hegel-w` → `hegel`). 21 of 58 figure-births currently map cleanly;
// the rest fall back to deep-linking via `?marker=<id>` on /canon.
const FIGURE_IDS = new Set<string>(
  (figuresData as { figures: { id: string }[] }).figures.map((f) => f.id)
);
function mapTimelineIdToFigureId(timelineId: string): string | null {
  if (FIGURE_IDS.has(timelineId)) return timelineId;
  if (timelineId.includes("-")) {
    const head = timelineId.replace(/-[a-z0-9]$/i, "");
    if (FIGURE_IDS.has(head)) return head;
  }
  return null;
}

/**
 * Best per-marker "open page" URL. Returns null when the marker has no
 * dedicated page yet — UI should fall back to the deep-link
 * `/canon?marker=<id>` so the marker is at least addressable.
 */
function markerPageUrl(m: CanonMarker): string | null {
  const branchSlug = (m.branch || "").replace(/^\d+-/, "");
  // figure-birth / figure-death → /canon/<branch>/figures/<figureId>
  if (m.kind === "figure-birth" || m.kind === "figure-death") {
    const figureId = mapTimelineIdToFigureId(m.id);
    if (figureId && branchSlug) return `/canon/${branchSlug}/figures/${figureId}`;
  }
  // canon-entry markers that came from a search result are wired in the
  // drawer directly via `_search` — they don't go through this helper.
  return null;
}

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

function sitesAsMarkers(sites: SiteEntry[]): CanonMarker[] {
  return sites.map((s) => ({
    id: s.id, lat: s.lat, lng: s.lng, year: s.year,
    branch: s.branch, title: s.title,
    kind: "archaeological-site",
    civilization: s.civilization, lidar: s.lidar,
    unesco: s.unesco, wikipedia: s.wikipedia,
  }));
}

interface Props {
  branches: GlobeBranch[];
}

export default function CanonGlobeMount({ branches: _branches }: Props) {
  const [hovered, setHovered] = useState<CanonMarker | null>(null);
  const [selected, setSelected] = useState<CanonMarker | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Lock body scroll when the tool is in fullscreen so the page behind doesn't move.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [expanded]);

  // Escape exits fullscreen.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  // ────────────────────────────────────────────────────────────────────
  //  Deep-link: every marker has its own URL via `?marker=<id>`
  // ────────────────────────────────────────────────────────────────────
  //  - On mount, read `?marker=<id>` from the URL. If present, find that
  //    marker in ALL_EVENTS or ALL_SITES, select it, and bump `year` to
  //    include it (otherwise the time-filter could hide it).
  //  - When `selected` changes (the user clicked a marker or a search
  //    result), push `?marker=<id>` to the URL via replaceState so the
  //    address bar reflects the current focus. When the drawer closes,
  //    strip the param.
  //  - For markers that ALSO have a dedicated page (figures with a
  //    figures.json match), the drawer renders a primary "open page →"
  //    link to the clean URL. For everything else the deep-link form
  //    `/canon?marker=<id>` is the addressable representation.
  //
  //  Doing this with raw window APIs (not next/navigation's useRouter)
  //  on purpose — useRouter.replace triggers a re-render which would
  //  thrash the R3F canvas. window.history.replaceState updates the URL
  //  silently.

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const markerId = params.get("marker");
    if (!markerId) return;

    const found =
      ALL_EVENTS.find((e) => e.id === markerId) ||
      ALL_SITES.find((s) => s.id === markerId);
    if (!found) return;

    const isSite = "civilization" in found || ALL_SITES.some((s) => s.id === markerId);
    const m: CanonMarker = isSite
      ? {
          id: found.id, lat: found.lat, lng: found.lng, year: found.year,
          branch: found.branch, title: found.title,
          kind: "archaeological-site",
          civilization: (found as SiteEntry).civilization,
          lidar: (found as SiteEntry).lidar,
          unesco: (found as SiteEntry).unesco,
          wikipedia: (found as SiteEntry).wikipedia,
        }
      : {
          id: found.id, lat: found.lat, lng: found.lng, year: found.year,
          branch: found.branch, title: found.title,
          kind: ((found as TimelineEvent).kind === "figure-birth"
            ? "figure-birth" : "canon-entry") as CanonMarker["kind"],
        };
    setSelected(m);
    // Bump the year scrubber so this marker is within the visible time
    // window (otherwise we'd select a marker that's filtered out).
    setYear((y) => Math.max(y, found.year));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync the URL when a marker is selected/deselected. Skip the initial
  // run (the deep-link effect above already handles that), so we don't
  // race the read with our own write.
  const lastSyncedMarker = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentId = selected?.id ?? null;
    if (lastSyncedMarker.current === currentId) return;
    lastSyncedMarker.current = currentId;
    const url = new URL(window.location.href);
    if (currentId) url.searchParams.set("marker", currentId);
    else url.searchParams.delete("marker");
    window.history.replaceState(null, "", url.toString());
  }, [selected]);

  // Sidebar is always present on desktop (md+). Mobile: slide-in on select.

  // Time scrub state — always visible, defaults to 2020 CE (= show all)
  const [year, setYear] = useState(2020);
  const [playing, setPlaying] = useState(false);

  // Search + branch filter
  const [q, setQ] = useState("");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);

  // Layer toggles — figures (default on) + archaeological sites (default on).
  // Lets the user show the material-evidence layer (Giza, Stonehenge, Maya
  // LiDAR sites, etc.) alongside or instead of the people/works layer.
  const [showFigures, setShowFigures] = useState(true);
  const [showSites, setShowSites] = useState(true);

  // The globe + search were two unconnected views before. Now they share
  // state — the same filter chips and the same query narrow BOTH the
  // search result list AND the globe markers, so a query for "topology"
  // shrinks the globe to mathematics in the same instant the result list
  // updates.

  // Branches that have at least one current search result — used to
  // narrow the globe to topic-relevant branches when a query is active.
  const branchesInResults = useMemo(() => {
    if (!q.trim() || results.length === 0) return null;
    return new Set(results.map((r) => r.branch.replace(/^\d+-/, "")));
  }, [q, results]);

  // Active marker for highlight ring on the globe.
  const markers = useMemo(() => {
    const out: CanonMarker[] = [];
    if (showFigures) out.push(...eventsAsMarkers(ALL_EVENTS.filter((e) => e.year <= year)));
    if (showSites) out.push(...sitesAsMarkers(ALL_SITES.filter((s) => s.year <= year)));
    return out.filter((m) => {
      // chip filter — mirrors what search uses, so the two stay aligned
      if (branchFilter) {
        const want = branchFilter.replace(/^\d+-/, "");
        const got = m.branch.replace(/^\d+-/, "");
        if (got !== want) return false;
      }
      // active search narrows by branches that appear in the results
      if (branchesInResults) {
        if (!branchesInResults.has(m.branch.replace(/^\d+-/, ""))) return false;
      }
      return true;
    });
  }, [year, showFigures, showSites, branchFilter, branchesInResults]);

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
      className={
        expanded
          ? "fixed inset-0 z-[60] px-4 md:px-6 md:pr-[440px] md:flex md:flex-col overflow-hidden bg-[color:var(--bone)]"
          : "relative max-w-7xl mx-auto my-6 md:my-8 px-4 md:px-6 md:h-[calc(100vh-7rem)] md:max-h-[900px] md:pr-[440px] md:overflow-hidden md:flex md:flex-col rounded-lg border border-[color:var(--hairline)] bg-[color:var(--bone)]/70 backdrop-blur-[1px] shadow-[0_2px_24px_-6px_rgba(31,28,22,0.12)]"
      }
    >
      {/* Expand / minimize button — top right of the tool card */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? "exit fullscreen" : "expand to fullscreen"}
        title={expanded ? "exit fullscreen (Esc)" : "expand to fullscreen"}
        className="absolute top-3 right-3 md:right-[452px] z-40 w-9 h-9 flex items-center justify-center rounded-md border bg-[color:var(--bone)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition"
        style={{ borderColor: "var(--hairline)", color: "var(--basalt)" }}
      >
        {expanded ? (
          // Minimize icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        ) : (
          // Expand icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        )}
      </button>

      {/* SEARCH BAR — rounded pill at the top of the tool container */}
      <div className="z-30 mx-auto mb-3 w-full pt-4 md:pt-6 flex flex-col items-center gap-2 flex-shrink-0">
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
                      // Try to map this search result to a real geocoded
                      // globe marker — that way clicking the result
                      // actually moves the globe to a place instead of
                      // pinning at (0,0). Strategy: find a figure marker
                      // whose name appears in the claim title (e.g. a
                      // "Becker" claim picks the Robert O. Becker marker),
                      // or fall back to the first marker in the same
                      // branch. Last resort: synthetic 0,0 marker.
                      const lowerTitle = r.title.toLowerCase();
                      const branchSuffix = r.branch.replace(/^\d+-/, "");
                      const eventCandidates = ALL_EVENTS.filter(
                        (e) => e.branch.replace(/^\d+-/, "") === branchSuffix
                      );
                      // First pass: figure name overlap with the claim title
                      let match = eventCandidates.find((e) => {
                        const surname = e.title
                          .replace(/\(.*?\)/g, "")
                          .split(/[\s—,-]+/)
                          .filter((w) => w.length >= 4)
                          .pop()
                          ?.toLowerCase();
                        return surname && lowerTitle.includes(surname);
                      });
                      // Second pass: concept name overlap (e.g. "becker"
                      // claim concept → "Robert O. Becker" event)
                      if (!match) {
                        const concept = r.concept.toLowerCase();
                        match = eventCandidates.find((e) =>
                          e.title.toLowerCase().includes(concept) ||
                          e.id.toLowerCase().includes(concept)
                        );
                      }
                      const m: CanonMarker = match
                        ? {
                            id: match.id,
                            lat: match.lat,
                            lng: match.lng,
                            year: match.year,
                            branch: match.branch,
                            title: match.title,
                            kind: "canon-entry",
                          }
                        : {
                            // No geocoded match — still let the drawer
                            // render but flag the missing location.
                            id: `claim:${r.claim_id}`,
                            lat: 0,
                            lng: 0,
                            branch: branchSuffix,
                            title: r.title,
                            kind: "canon-entry",
                          };
                      // Always attach the full search result so the drawer
                      // can render the excerpt + "open full claim" link.
                      (m as unknown as { _search: SearchResult })._search = r;
                      setSelected(m);
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

        {/* Layer toggles — figures vs sites */}
        <div className="w-full max-w-2xl flex items-center justify-center gap-2 mb-1 pointer-events-auto">
          <button
            onClick={() => setShowFigures((v) => !v)}
            className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] transition"
            style={{
              fontFamily: "var(--font-jetbrains)",
              background: showFigures ? "var(--gold)" : "transparent",
              color: showFigures ? "white" : "var(--parchment-dim)",
              border: `1px solid ${showFigures ? "var(--gold)" : "var(--hairline)"}`,
            }}
          >
            ◉ figures · {ALL_EVENTS.length}
          </button>
          <button
            onClick={() => setShowSites((v) => !v)}
            className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] transition"
            style={{
              fontFamily: "var(--font-jetbrains)",
              background: showSites ? "#6E5840" : "transparent",
              color: showSites ? "white" : "var(--parchment-dim)",
              border: `1px solid ${showSites ? "#6E5840" : "var(--hairline)"}`,
            }}
          >
            ▣ sites · {ALL_SITES.length}
          </button>
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

      {/* GLOBE — fills remaining viewport height on desktop */}
      <div
        className="relative w-full mx-auto flex-1"
        style={{
          minHeight: "440px",
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
            <li><span style={{ color: "var(--basalt)" }}>drag</span> · rotate (slows when zoomed)</li>
            <li><span style={{ color: "var(--basalt)" }}>scroll</span> · zoom into a region</li>
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

      {/* TIME SCRUBBER — pinned at the bottom of the tool container.
          Full-width within the tool (the parent container reserves
          `md:pr-[440px]` for the sidebar, so the scrubber naturally
          ends at the sidebar's left edge). The old `max-w-3xl mx-auto`
          made it a centered 768px island with empty bone on both
          sides; this version uses every horizontal pixel the layout
          gives it. */}
      <div className="w-full mt-3 px-4 md:px-6 md:pb-6 flex-shrink-0">
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
          {branchFilter && (
            <>
              {" · "}
              <span style={{ color: "var(--gold)" }}>
                filtered to {branchFilter.replace(/^\d+-/, "")}
              </span>
            </>
          )}
          {branchesInResults && (
            <>
              {" · "}
              <span style={{ color: "var(--gold)" }}>
                narrowed by query &ldquo;{q.trim()}&rdquo; ({branchesInResults.size} branch{branchesInResults.size === 1 ? "" : "es"})
              </span>
            </>
          )}
        </div>
      </div>

      {/* RIGHT-SIDE INFO DRAWER */}
      <Drawer
        selected={selected}
        onClose={() => setSelected(null)}
        onSelectMarker={(id) => {
          // Same-era / nearby click — find the marker by id in the
          // pre-loaded event + site lists and select it directly. Bump
          // the year scrubber if needed so the marker is visible on
          // the globe at the same moment its drawer fills with detail.
          const ev = ALL_EVENTS.find((e) => e.id === id);
          const site = ev ? null : ALL_SITES.find((s) => s.id === id);
          if (ev) {
            setSelected({
              id: ev.id, lat: ev.lat, lng: ev.lng, year: ev.year,
              branch: ev.branch, title: ev.title,
              kind: (ev.kind === "figure-birth" ? "figure-birth" : "canon-entry") as CanonMarker["kind"],
            });
            setYear((y) => Math.max(y, ev.year));
          } else if (site) {
            setSelected({
              id: site.id, lat: site.lat, lng: site.lng, year: site.year,
              branch: site.branch, title: site.title,
              kind: "archaeological-site",
              civilization: site.civilization,
              lidar: site.lidar,
              unesco: site.unesco,
              wikipedia: site.wikipedia,
            });
            setYear((y) => Math.max(y, site.year));
          }
        }}
      />
    </div>
  );
}

function Drawer({
  selected,
  onClose,
  onSelectMarker,
}: {
  selected: CanonMarker | null;
  onClose: () => void;
  /** Called when the user clicks a same-era or nearby cross-reference. */
  onSelectMarker?: (id: string) => void;
}) {
  const search = (selected as unknown as { _search?: SearchResult })?._search;
  const branchSlug = selected?.branch?.replace(/^\d+-/, "");
  // Best per-marker "open page" URL (figures.json-matched figures get
  // /canon/<branch>/figures/<id>; sites and works return null and fall
  // back to the copy-share-link button further down).
  const pageUrl = selected ? markerPageUrl(selected) : null;

  // ──────────────────────────────────────────────────────────────────
  // Cross-references — every marker becomes a hub for "what makes
  // this what it is": claim cards that mention it, contemporary
  // figures + sites (±500 years), nearby markers (~5° lat/lng radius),
  // and outbound research links (Wikipedia, Scholar, Wikidata).
  // ──────────────────────────────────────────────────────────────────

  // Claims that mention this marker, via the existing canon-search API.
  const [relatedClaims, setRelatedClaims] = useState<SearchResult[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const fetchAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!selected || !selected.title) {
      setRelatedClaims([]);
      return;
    }
    // Don't re-query when the search-driven _search shim is already there
    // — that means the user clicked a result, and the excerpt section
    // already shows the primary match.
    fetchAbort.current?.abort();
    const ac = new AbortController();
    fetchAbort.current = ac;
    setRelatedLoading(true);
    const t = setTimeout(async () => {
      try {
        const url = new URL("/api/canon/search", window.location.origin);
        url.searchParams.set("q", selected.title);
        url.searchParams.set("top_k", "8");
        const r = await fetch(url.toString(), { signal: ac.signal });
        const j = r.ok ? await r.json() : { results: [] };
        // Skip the very same claim the user came from (avoid duplication)
        const out = (j.results || []).filter((x: SearchResult) =>
          !search || `${x.concept}/${x.slug}` !== `${search.concept}/${search.slug}`
        );
        setRelatedClaims(out);
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") setRelatedClaims([]);
      } finally {
        setRelatedLoading(false);
      }
    }, 250);
    return () => { clearTimeout(t); ac.abort(); };
  }, [selected, search]);

  // Same era — events/sites within ±500 years (or ±100 years if the
  // marker is post-1700 CE, when the canon density is higher).
  const sameEra = useMemo(() => {
    if (!selected || selected.year === undefined) return [];
    const Y = selected.year;
    const RADIUS = Y > 1700 ? 100 : 500;
    const out: Array<{ id: string; title: string; year: number; branch: string; kind: "event" | "site" }> = [];
    for (const e of ALL_EVENTS) {
      if (e.id === selected.id) continue;
      if (Math.abs(e.year - Y) <= RADIUS) {
        out.push({ id: e.id, title: e.title, year: e.year, branch: e.branch, kind: "event" });
      }
    }
    for (const s of ALL_SITES) {
      if (s.id === selected.id) continue;
      if (Math.abs(s.year - Y) <= RADIUS) {
        out.push({ id: s.id, title: s.title, year: s.year, branch: s.branch, kind: "site" });
      }
    }
    return out.sort((a, b) => Math.abs(a.year - Y) - Math.abs(b.year - Y)).slice(0, 8);
  }, [selected]);

  // Nearby — within ~5° lat/lng of this marker. Cheap great-circle
  // distance is overkill at this density; a simple bounding box reads
  // as "broadly the same region" without false positives across hemispheres.
  const nearby = useMemo(() => {
    if (!selected || (selected.lat === 0 && selected.lng === 0)) return [];
    const RADIUS = 5; // degrees
    const within = (lat: number, lng: number) =>
      Math.abs(lat - selected.lat) <= RADIUS &&
      Math.abs(lng - selected.lng) <= RADIUS;
    type Near = { id: string; title: string; year: number; branch: string; kind: "event" | "site"; lat: number; lng: number };
    const out: Near[] = [];
    for (const e of ALL_EVENTS) {
      if (e.id === selected.id) continue;
      if (within(e.lat, e.lng)) {
        out.push({ id: e.id, title: e.title, year: e.year, branch: e.branch, kind: "event", lat: e.lat, lng: e.lng });
      }
    }
    for (const s of ALL_SITES) {
      if (s.id === selected.id) continue;
      if (within(s.lat, s.lng)) {
        out.push({ id: s.id, title: s.title, year: s.year, branch: s.branch, kind: "site", lat: s.lat, lng: s.lng });
      }
    }
    return out
      .sort(
        (a, b) =>
          Math.abs(a.lat - selected.lat) + Math.abs(a.lng - selected.lng) -
          (Math.abs(b.lat - selected.lat) + Math.abs(b.lng - selected.lng))
      )
      .slice(0, 8);
  }, [selected]);

  // Build the outbound research links — Wikipedia first (highest signal),
  // then Google Scholar, then Wikidata. Site markers come with an
  // explicit `wikipedia` field; everything else uses a name search.
  const externalLinks = useMemo(() => {
    if (!selected) return [];
    const q = encodeURIComponent(selected.title);
    return [
      {
        label: "Wikipedia",
        note: "biographical / topical primary entry",
        href: selected.wikipedia
          ? selected.wikipedia
          : `https://en.wikipedia.org/w/index.php?search=${q}`,
      },
      {
        label: "Google Scholar",
        note: "papers about this topic — broadest academic coverage",
        href: `https://scholar.google.com/scholar?q=${q}`,
      },
      {
        label: "Wikidata",
        note: "structured identifiers (VIAF, GND, ORCID, ISNI)",
        href: `https://www.wikidata.org/w/index.php?search=${q}`,
      },
      {
        label: "OpenAlex",
        note: "OA-indexed works + citation graph",
        href: `https://openalex.org/works?search=${q}&sort=cited_by_count:desc`,
      },
    ];
  }, [selected]);

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
        className={`md:absolute md:right-0 md:top-0 md:bottom-0 md:h-auto md:translate-x-0 md:z-10
                    fixed right-0 top-0 h-screen z-50 overflow-y-auto transition-transform duration-300 ${
          selected ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          width: "min(440px, 100vw)",
          background: "var(--bone)",
          borderLeft: "1px solid var(--hairline)",
        }}
      >
        {selected && (
          <div>
            {/* STICKY HEADER + CTA STRIP — stays in view as the user
                scrolls the cross-reference sections below. */}
            <div
              className="sticky top-0 z-10 px-6 md:px-8 pt-6 md:pt-8 pb-4"
              style={{ background: "var(--bone)", borderBottom: "1px solid var(--hairline)" }}
            >
              <div className="flex items-baseline justify-between mb-3">
                <span
                  className="text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
                >
                  {selected.kind?.replace(/-/g, " ")}
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
              <h2
                className="text-xl md:text-2xl leading-tight mb-2"
                style={{ fontFamily: "var(--font-fraunces)", color: "var(--basalt)", fontWeight: 500 }}
              >
                {selected.title}
              </h2>
              <p
                className="text-[11px] uppercase tracking-[0.18em] mb-4"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
              >
                {selected.year !== undefined && <>{fmtYear(selected.year)} · </>}
                {selected.branch}
                {selected.civilization && <> · {selected.civilization}</>}
              </p>

              {/* Primary CTA row — like the branch page's top nav */}
              <div className="flex flex-wrap gap-1.5">
                {/* Open the canonical page when one exists */}
                {search ? (
                  <Link
                    href={`/canon/claims/${search.concept}/${search.slug}`}
                    className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--gold)] text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:text-white px-3 py-1.5 transition"
                  >
                    open full claim →
                  </Link>
                ) : pageUrl ? (
                  <Link
                    href={pageUrl}
                    className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--gold)] text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:text-white px-3 py-1.5 transition"
                  >
                    open page →
                  </Link>
                ) : null}
                {branchSlug && (
                  <Link
                    href={`/canon/${branchSlug}`}
                    className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--hairline)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-1.5 transition"
                  >
                    {branchSlug} branch →
                  </Link>
                )}
                <button
                  onClick={() => {
                    if (typeof window === "undefined") return;
                    const url = new URL(window.location.href);
                    url.search = `?marker=${encodeURIComponent(selected.id)}`;
                    navigator.clipboard?.writeText(url.toString()).catch(() => {});
                  }}
                  className="small-caps text-[10px] tracking-[0.18em] border border-[color:var(--hairline)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] px-3 py-1.5 transition"
                  title={`copies /canon?marker=${selected.id}`}
                >
                  copy link ⎘
                </button>
              </div>
            </div>

            {/* SCROLLABLE BODY — every source/related-material section
                stacks here. Headers are small-caps gold; sections are
                separated by hairline borders so the scroll has rhythm. */}
            <div className="px-6 md:px-8 pt-5 pb-10 space-y-7">
              {/* Search-driven excerpt (when the user came from a search) */}
              {search && (
                <section>
                  <h3
                    className="text-[10px] uppercase tracking-[0.18em] mb-3"
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

              {/* Source data — every primary place this marker shows up
                  on disk. For sites this is wikipedia / unesco / lidar.
                  For figures with a figures.json record it's the
                  figure-page link (also in the top CTA, repeated here
                  with a description). */}
              <section>
                <h3
                  className="text-[10px] uppercase tracking-[0.18em] mb-3"
                  style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
                >
                  Source data
                </h3>
                <div className="space-y-1.5">
                  {selected.lidar && (
                    <a href={selected.lidar} target="_blank" rel="noreferrer"
                       className="block px-3 py-2 rounded-md border text-sm hover:border-[color:var(--gold)] transition"
                       style={{ borderColor: "var(--hairline)", color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}>
                      🛰  LiDAR / aerial survey ↗
                    </a>
                  )}
                  {selected.unesco && (
                    <a href={selected.unesco} target="_blank" rel="noreferrer"
                       className="block px-3 py-2 rounded-md border text-sm hover:border-[color:var(--gold)] transition"
                       style={{ borderColor: "var(--hairline)", color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}>
                      🏛  UNESCO World Heritage entry ↗
                    </a>
                  )}
                  {selected.wikipedia && (
                    <a href={selected.wikipedia} target="_blank" rel="noreferrer"
                       className="block px-3 py-2 rounded-md border text-sm hover:border-[color:var(--gold)] transition"
                       style={{ borderColor: "var(--hairline)", color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}>
                      📖  Wikipedia ↗
                    </a>
                  )}
                  {pageUrl && (
                    <Link href={pageUrl}
                       className="block px-3 py-2 rounded-md border text-sm hover:border-[color:var(--gold)] transition"
                       style={{ borderColor: "var(--hairline)", color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}>
                      📄  Figure page in canon — biography, primary works ↗
                    </Link>
                  )}
                  {/* Always-available outbound research links */}
                  {externalLinks.map((e) => {
                    // Skip the Wikipedia entry when we already showed a
                    // specific wikipedia URL above (avoid duplication).
                    if (e.label === "Wikipedia" && selected.wikipedia) return null;
                    return (
                      <a key={e.label} href={e.href} target="_blank" rel="noreferrer"
                         className="block px-3 py-2 rounded-md border text-sm hover:border-[color:var(--gold)] transition"
                         style={{ borderColor: "var(--hairline)", color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}>
                        <span className="block">{e.label} ↗</span>
                        <span className="block text-[11px] mt-0.5" style={{ color: "var(--parchment-dim)" }}>
                          {e.note}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </section>

              {/* Mentioned in canon — claim cards that match this marker
                  by name via the canon search index. Bridges the
                  geocoded markers (timeline + sites) into the 599
                  curated claim cards. */}
              <section>
                <h3
                  className="text-[10px] uppercase tracking-[0.18em] mb-3 flex items-baseline justify-between"
                  style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
                >
                  <span>Mentioned in canon</span>
                  <span style={{ color: "var(--parchment-dim)" }}>
                    {relatedLoading ? "searching…" : `${relatedClaims.length} match${relatedClaims.length === 1 ? "" : "es"}`}
                  </span>
                </h3>
                {relatedClaims.length === 0 && !relatedLoading && (
                  <p className="text-[12px] leading-relaxed"
                     style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}>
                    No claim cards mention &ldquo;{selected.title}&rdquo; yet — try{" "}
                    <Link href={`/canon/search?q=${encodeURIComponent(selected.title)}`}
                          className="text-[color:var(--gold)] hover:text-[color:var(--basalt)] underline">
                      full canon search →
                    </Link>
                  </p>
                )}
                {relatedClaims.length > 0 && (
                  <ul className="space-y-1.5">
                    {relatedClaims.map((c) => (
                      <li key={`${c.concept}/${c.slug}`}>
                        <Link
                          href={`/canon/claims/${c.concept}/${c.slug}`}
                          className="block px-3 py-2 rounded-md border text-sm hover:border-[color:var(--gold)] transition"
                          style={{ borderColor: "var(--hairline)", color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}
                        >
                          <span className="block leading-snug">{c.title.slice(0, 110)}{c.title.length > 110 && "…"}</span>
                          <span className="block text-[10px] uppercase tracking-[0.18em] mt-1"
                                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                            {c.branch.replace(/^\d+-/, "")} · {c.concept}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Same era — every other geocoded marker within ±500
                  years (±100 if post-1700). Lets the user jump
                  directly from Lascaux to Çatalhöyük, from Einstein
                  to Hilbert, etc. */}
              {sameEra.length > 0 && (
                <section>
                  <h3
                    className="text-[10px] uppercase tracking-[0.18em] mb-3"
                    style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
                  >
                    Same era — {sameEra.length} other marker{sameEra.length === 1 ? "" : "s"}
                  </h3>
                  <ul className="space-y-1">
                    {sameEra.map((m) => (
                      <li key={m.id}>
                        <button
                          onClick={() => onSelectMarker?.(m.id)}
                          className="w-full flex items-baseline justify-between gap-3 px-3 py-1.5 rounded-md border text-sm hover:border-[color:var(--gold)] transition text-left"
                          style={{ borderColor: "var(--hairline)", color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}
                        >
                          <span className="truncate flex-1">{m.title}</span>
                          <span className="text-[10px] uppercase tracking-[0.16em] flex-shrink-0"
                                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                            {fmtYear(m.year)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Nearby — markers in roughly the same region (~5° box).
                  Geographic neighbours regardless of era. */}
              {nearby.length > 0 && (
                <section>
                  <h3
                    className="text-[10px] uppercase tracking-[0.18em] mb-3"
                    style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
                  >
                    Nearby — {nearby.length} other marker{nearby.length === 1 ? "" : "s"}
                  </h3>
                  <ul className="space-y-1">
                    {nearby.map((m) => (
                      <li key={m.id}>
                        <button
                          onClick={() => onSelectMarker?.(m.id)}
                          className="w-full flex items-baseline justify-between gap-3 px-3 py-1.5 rounded-md border text-sm hover:border-[color:var(--gold)] transition text-left"
                          style={{ borderColor: "var(--hairline)", color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}
                        >
                          <span className="truncate flex-1">{m.title}</span>
                          <span className="text-[10px] uppercase tracking-[0.16em] flex-shrink-0"
                                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                            {m.branch.replace(/^\d+-/, "")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Coordinates — small, dim, last. Site-specific
                  civilization field too when present. */}
              <section>
                <h3
                  className="text-[10px] uppercase tracking-[0.18em] mb-3"
                  style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
                >
                  Metadata
                </h3>
                <dl className="text-[12px] space-y-1" style={{ fontFamily: "var(--font-fraunces)" }}>
                  <div className="flex justify-between border-b border-[color:var(--hairline)] pb-1">
                    <dt style={{ color: "var(--parchment-dim)" }}>id</dt>
                    <dd className="font-mono">{selected.id}</dd>
                  </div>
                  {(selected.lat !== 0 || selected.lng !== 0) && (
                    <div className="flex justify-between border-b border-[color:var(--hairline)] pb-1">
                      <dt style={{ color: "var(--parchment-dim)" }}>coords</dt>
                      <dd className="font-mono">
                        <a
                          href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[color:var(--gold)] underline-offset-2 hover:underline"
                        >
                          {selected.lat.toFixed(2)}, {selected.lng.toFixed(2)} ↗
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
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
