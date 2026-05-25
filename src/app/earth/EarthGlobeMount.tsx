"use client";
import nextDynamic from "next/dynamic";
import { useMemo, useState } from "react";
import StaticCanonGlobe from "@/components/CanonGlobe";
import type { CanonMarker } from "@/components/canon-globe";
import { GlobeErrorBoundary } from "@/components/canon-globe/GlobeErrorBoundary";
import worldData from "@/data/world-indicators.json";
import scoringData from "@/data/world-indicators-scoring.json";
import blueZonesData from "@/data/blue-zones.json";
import {
  computeScores,
  rankScores,
  rampColor,
  indicatorStats,
  normalize,
  RAMP_CSS_GRADIENT,
  NO_DATA_COLOR,
  BLUE_ZONE_COLOR,
  type Direction,
  type ScoredCountry,
} from "@/lib/earth-scoring";

// Mirror /canon's mount pattern exactly: the R3F globe is the same component,
// loaded ssr:false with a static fallback while three.js boots.
const R3FCanonGlobe = nextDynamic(() => import("@/components/canon-globe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <StaticCanonGlobe branches={[]} size={420} interactive={false} />
    </div>
  ),
});

// ── Typed views over the (read-only) data files ─────────────────────────────
type Country = {
  id: string;
  title: string;
  iso3: string;
  lat: number;
  lng: number;
  capital: string;
  region: string;
  income: string;
  branch: string;
  kind: string;
  values: Record<string, number>;
};
type Preset = { id: string; name: string; blurb: string; weights: Record<string, number> };
type BlueZone = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  iso3: string;
  branch: string;
  kind: string;
  longevity_note: string;
  centenarian_signal?: string;
};

// JSON modules infer narrow literal types; cast through `unknown` to our
// runtime shapes. The data files are final + match these shapes exactly.
const COUNTRIES = (worldData as unknown as { countries: Country[] }).countries;
const INDICATORS = Object.keys(
  (worldData as unknown as { indicators: Record<string, string> }).indicators
);
const GLOBAL_AVG = (worldData as unknown as { global_average: Record<string, number> }).global_average;
const DIRECTIONS = (scoringData as unknown as { directions: Record<string, Direction> }).directions;
const PRESETS = (scoringData as unknown as { presets: Preset[] }).presets;
const BLUE_ZONES = (blueZonesData as unknown as { zones: BlueZone[] }).zones;

type Mode = "explore" | "rank";

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Short label for the legend / table headers — strip the parenthetical unit.
function shortLabel(label: string): string {
  return label.replace(/\s*\(.*?\)\s*$/, "").trim();
}

export default function EarthGlobeMount() {
  const [hovered, setHovered] = useState<CanonMarker | null>(null);
  const [selected, setSelected] = useState<CanonMarker | null>(null);

  const [mode, setMode] = useState<Mode>("explore");
  const [indicator, setIndicator] = useState<string>(
    INDICATORS.find((i) => i === "Life expectancy at birth (years)") || INDICATORS[0]
  );
  const [showBlueZones, setShowBlueZones] = useState(true);

  // Ranking weights — seeded from the first preset, editable via sliders.
  const [activePreset, setActivePreset] = useState<string>(PRESETS[0]?.id ?? "");
  const [weights, setWeights] = useState<Record<string, number>>(
    () => ({ ...(PRESETS[0]?.weights ?? {}) })
  );

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setActivePreset(id);
    setWeights({ ...p.weights });
  };

  // ── EXPLORE: per-country colour for the active indicator ──────────────────
  const exploreColors = useMemo(() => {
    const vals = COUNTRIES.map((c) => c.values[indicator]);
    const stats = indicatorStats(vals, GLOBAL_AVG[indicator]);
    const direction = DIRECTIONS[indicator];
    const colorById: Record<string, { color: string; value: number }> = {};
    for (const c of COUNTRIES) {
      const raw = c.values[indicator];
      if (!Number.isFinite(raw)) {
        colorById[c.id] = { color: NO_DATA_COLOR, value: NaN };
        continue;
      }
      let t = normalize(raw, stats.min, stats.max);
      // For explore mode we keep the colour mapped to the RAW magnitude
      // (low value = bone, high = teal) regardless of direction — the legend
      // shows min/max so it stays unambiguous. Direction only matters in
      // ranking mode.
      colorById[c.id] = { color: rampColor(t), value: raw };
    }
    return { stats, direction, colorById };
  }, [indicator]);

  // ── RANK: composite 0..100 score per country ──────────────────────────────
  const ranked = useMemo<ScoredCountry[]>(() => {
    const scored = computeScores({
      countries: COUNTRIES.map((c) => ({
        id: c.id,
        iso3: c.iso3,
        title: c.title,
        lat: c.lat,
        lng: c.lng,
        values: c.values,
      })),
      weights,
      directions: DIRECTIONS,
    });
    return rankScores(scored);
  }, [weights]);

  const rankColorById = useMemo(() => {
    const m: Record<string, { color: string; value: number }> = {};
    for (const r of ranked) {
      if (!Number.isFinite(r.score)) {
        m[r.id] = { color: NO_DATA_COLOR, value: NaN };
      } else {
        m[r.id] = { color: rampColor(r.score / 100), value: r.score };
      }
    }
    return m;
  }, [ranked]);

  // ── Build the markers handed to the globe ─────────────────────────────────
  const markers = useMemo<CanonMarker[]>(() => {
    const paint = mode === "explore" ? exploreColors.colorById : rankColorById;
    const dataMarkers: CanonMarker[] = COUNTRIES.map((c) => {
      const p = paint[c.id];
      return {
        id: c.id,
        lat: c.lat,
        lng: c.lng,
        branch: "10-earth",
        title: c.title,
        kind: "world-indicator",
        color: p?.color ?? NO_DATA_COLOR,
        value: p?.value,
      };
    });
    if (showBlueZones) {
      for (const z of BLUE_ZONES) {
        dataMarkers.push({
          id: z.id,
          lat: z.lat,
          lng: z.lng,
          branch: z.branch,
          title: z.title,
          kind: "blue-zone",
          color: BLUE_ZONE_COLOR,
          // stash the longevity note in `civilization` so the shared tooltip
          // (which already renders that field) surfaces it without a schema
          // change to CanonMarker.
          civilization: z.longevity_note,
        });
      }
    }
    return dataMarkers;
  }, [mode, exploreColors, rankColorById, showBlueZones]);

  const activeIndex = useMemo(() => {
    if (!selected) return undefined;
    const idx = markers.findIndex((m) => m.id === selected.id);
    return idx >= 0 ? idx : undefined;
  }, [selected, markers]);

  // ── Stats readout ─────────────────────────────────────────────────────────
  const top10 = useMemo(
    () => ranked.filter((r) => Number.isFinite(r.score)).slice(0, 10),
    [ranked]
  );
  const usaRank = useMemo(() => {
    const finite = ranked.filter((r) => Number.isFinite(r.score));
    const idx = finite.findIndex((r) => r.iso3 === "USA");
    return idx >= 0 ? { rank: idx + 1, of: finite.length, row: finite[idx] } : null;
  }, [ranked]);
  const itaRank = useMemo(() => {
    const finite = ranked.filter((r) => Number.isFinite(r.score));
    const idx = finite.findIndex((r) => r.iso3 === "ITA");
    return idx >= 0 ? { rank: idx + 1, of: finite.length, row: finite[idx] } : null;
  }, [ranked]);

  // Table sorting
  const [sortKey, setSortKey] = useState<"rank" | "name" | "score">("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const tableRows = useMemo(() => {
    const rows = ranked.map((r, i) => ({ ...r, rank: i + 1 }));
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "rank") cmp = a.rank - b.rank;
      else if (sortKey === "name") cmp = a.title.localeCompare(b.title);
      else {
        const as = Number.isFinite(a.score) ? a.score : -Infinity;
        const bs = Number.isFinite(b.score) ? b.score : -Infinity;
        cmp = as - bs;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [ranked, sortKey, sortDir]);

  const toggleSort = (key: "rank" | "name" | "score") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "asc");
    }
  };

  const selectCountry = (id: string) => {
    const m = markers.find((mk) => mk.id === id);
    if (m) setSelected(m);
  };

  return (
    <div
      className="relative max-w-7xl mx-auto my-6 md:my-8 px-4 md:px-6 md:h-[calc(100vh-7rem)] md:max-h-[920px] md:pr-[420px] md:overflow-hidden md:flex md:flex-col rounded-lg border border-[color:var(--hairline)] bg-[color:var(--bone)]/70 backdrop-blur-[1px] shadow-[0_2px_24px_-6px_rgba(31,28,22,0.12)]"
    >
      {/* MODE SWITCH + INDICATOR / PRESET PICKER */}
      <div className="z-30 w-full pt-4 md:pt-6 flex flex-col items-center gap-3 flex-shrink-0">
        {/* mode toggle */}
        <div className="flex items-center gap-2">
          {(
            [
              ["explore", "explore one indicator"],
              ["rank", "target ranking"],
            ] as const
          ).map(([m, label]) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.16em] transition"
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  background: active ? "var(--gold)" : "transparent",
                  color: active ? "white" : "var(--parchment-dim)",
                  border: `1px solid ${active ? "var(--gold)" : "var(--hairline)"}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {mode === "explore" ? (
          <div className="w-full max-w-2xl flex flex-col items-center gap-2 pointer-events-auto">
            <select
              value={indicator}
              onChange={(e) => setIndicator(e.target.value)}
              className="w-full rounded-full px-4 py-2.5 text-sm outline-none"
              style={{
                background: "var(--bone)",
                border: "1px solid var(--hairline)",
                color: "var(--basalt)",
                fontFamily: "var(--font-fraunces)",
              }}
              aria-label="select indicator"
            >
              {INDICATORS.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                  {DIRECTIONS[ind] && DIRECTIONS[ind] !== "neutral"
                    ? ` · ${DIRECTIONS[ind]} is better`
                    : DIRECTIONS[ind] === "neutral"
                    ? " · neutral"
                    : ""}
                </option>
              ))}
            </select>

            {/* Legend: ramp + min / global-avg tick / max */}
            <Legend
              min={exploreColors.stats.min}
              max={exploreColors.stats.max}
              avg={exploreColors.stats.avg}
              avgT={exploreColors.stats.avgT}
              unit={indicator}
            />
          </div>
        ) : (
          <div className="w-full max-w-2xl flex flex-col items-center gap-2 pointer-events-auto">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {PRESETS.map((p) => {
                const active = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    title={p.blurb}
                    className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.14em] transition"
                    style={{
                      fontFamily: "var(--font-jetbrains)",
                      background: active ? "var(--basalt)" : "transparent",
                      color: active ? "var(--bone)" : "var(--parchment-dim)",
                      border: `1px solid ${active ? "var(--basalt)" : "var(--hairline)"}`,
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
            {activePreset && (
              <p
                className="text-[11px] text-center max-w-md italic"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
              >
                {PRESETS.find((p) => p.id === activePreset)?.blurb}
              </p>
            )}
            <Legend min={0} max={100} avg={null} avgT={null} unit="composite score (0–100)" scoreMode />
          </div>
        )}

        {/* Blue Zones toggle */}
        <button
          onClick={() => setShowBlueZones((v) => !v)}
          className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] transition"
          style={{
            fontFamily: "var(--font-jetbrains)",
            background: showBlueZones ? BLUE_ZONE_COLOR : "transparent",
            color: showBlueZones ? "white" : "var(--parchment-dim)",
            border: `1px solid ${BLUE_ZONE_COLOR}`,
          }}
          title="The 5 longevity Blue Zones — biophysics ground-truth to eyeball against the ranking."
        >
          ✦ blue zones · {BLUE_ZONES.length}
        </button>
      </div>

      {/* GLOBE */}
      <div className="relative w-full mx-auto flex-1" style={{ minHeight: "440px" }}>
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, color-mix(in srgb, var(--gold) 8%, transparent) 0%, transparent 55%)",
          }}
        />
        {/* corner controls legend */}
        <div
          className="absolute bottom-3 right-3 z-20 pointer-events-none rounded-md px-3 py-2 shadow-sm"
          style={{
            background: "color-mix(in srgb, var(--bone) 92%, transparent)",
            border: "1px solid var(--hairline)",
            fontFamily: "var(--font-jetbrains)",
          }}
        >
          <div className="text-[9px] uppercase tracking-[0.22em] mb-1" style={{ color: "var(--gold)" }}>
            globe controls
          </div>
          <ul className="space-y-0.5 text-[10px]" style={{ color: "var(--parchment-dim)" }}>
            <li><span style={{ color: "var(--basalt)" }}>drag</span> · rotate</li>
            <li><span style={{ color: "var(--basalt)" }}>scroll</span> · zoom</li>
            <li><span style={{ color: "var(--basalt)" }}>click</span> · select country</li>
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

      {/* STATS READOUT — under the globe */}
      <div className="w-full mt-3 px-1 md:px-2 md:pb-4 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <Citizenship label="🇺🇸 USA rank" rank={usaRank} />
          <Citizenship label="🇮🇹 Italy rank" rank={itaRank} />
          <div
            className="rounded-md px-3 py-2"
            style={{ background: "var(--bone-2)", border: "1px solid var(--hairline)" }}
          >
            <div
              className="text-[9px] uppercase tracking-[0.18em] mb-1"
              style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
            >
              {mode === "explore" ? "global average" : "ranked countries"}
            </div>
            <div className="text-sm" style={{ color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}>
              {mode === "explore"
                ? fmtNum(exploreColors.stats.avg)
                : `${ranked.filter((r) => Number.isFinite(r.score)).length} / ${COUNTRIES.length}`}
            </div>
          </div>
          <div
            className="rounded-md px-3 py-2"
            style={{ background: "var(--bone-2)", border: "1px solid var(--hairline)" }}
          >
            <div
              className="text-[9px] uppercase tracking-[0.18em] mb-1"
              style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
            >
              top scorer
            </div>
            <div className="text-sm truncate" style={{ color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}>
              {top10[0] ? `${top10[0].title} · ${fmtNum(top10[0].score)}` : "—"}
            </div>
          </div>
        </div>

        {/* Top 10 chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {top10.map((r, i) => (
            <button
              key={r.id}
              onClick={() => selectCountry(r.id)}
              className="px-2 py-1 rounded-full text-[10px] tracking-[0.04em] transition hover:opacity-80"
              style={{
                fontFamily: "var(--font-jetbrains)",
                background: rampColor(r.score / 100),
                color: i < 5 ? "var(--bone)" : "var(--basalt)",
                border: "1px solid var(--hairline)",
              }}
              title={`#${i + 1} · ${fmtNum(r.score)}`}
            >
              {i + 1}. {r.title}
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE PANEL — weight sliders (rank) or hovered/selected detail */}
      <SidePanel
        mode={mode}
        weights={weights}
        setWeights={setWeights}
        setActivePreset={setActivePreset}
        indicators={INDICATORS}
        directions={DIRECTIONS}
        tableRows={tableRows}
        sortKey={sortKey}
        sortDir={sortDir}
        toggleSort={toggleSort}
        onSelect={selectCountry}
        selectedId={selected?.id ?? null}
        hovered={hovered}
      />
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────
function Legend({
  min,
  max,
  avg,
  avgT,
  unit,
  scoreMode = false,
}: {
  min: number;
  max: number;
  avg: number | null;
  avgT: number | null;
  unit: string;
  scoreMode?: boolean;
}) {
  return (
    <div className="w-full max-w-md">
      <div className="relative h-3 rounded-full overflow-visible" style={{ background: RAMP_CSS_GRADIENT, border: "1px solid var(--hairline)" }}>
        {avgT !== null && (
          <div
            className="absolute -top-1 -bottom-1 w-[2px]"
            style={{ left: `${avgT * 100}%`, background: "var(--basalt)" }}
            title={`global average: ${fmtNum(avg)}`}
          />
        )}
      </div>
      <div
        className="flex justify-between mt-1 text-[9px] uppercase tracking-[0.14em]"
        style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
      >
        <span>{scoreMode ? "0 worst" : fmtNum(min)}</span>
        {avgT !== null && avg !== null ? (
          <span style={{ color: "var(--basalt)" }}>avg {fmtNum(avg)}</span>
        ) : null}
        <span>{scoreMode ? "100 best" : fmtNum(max)}</span>
      </div>
      <div
        className="text-center text-[9px] uppercase tracking-[0.18em] mt-0.5"
        style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
      >
        {shortLabel(unit)}
      </div>
    </div>
  );
}

function Citizenship({
  label,
  rank,
}: {
  label: string;
  rank: { rank: number; of: number; row: ScoredCountry } | null;
}) {
  return (
    <div
      className="rounded-md px-3 py-2"
      style={{ background: "var(--bone-2)", border: "1px solid var(--hairline)" }}
    >
      <div
        className="text-[9px] uppercase tracking-[0.18em] mb-1"
        style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
      >
        {label}
      </div>
      <div className="text-sm" style={{ color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}>
        {rank ? `#${rank.rank} of ${rank.of} · ${fmtNum(rank.row.score)}` : "—"}
      </div>
    </div>
  );
}

// ── Side panel (weight sliders + ranked table, or detail) ─────────────────────
function SidePanel({
  mode,
  weights,
  setWeights,
  setActivePreset,
  indicators,
  directions,
  tableRows,
  sortKey,
  sortDir,
  toggleSort,
  onSelect,
  selectedId,
  hovered,
}: {
  mode: Mode;
  weights: Record<string, number>;
  setWeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setActivePreset: (id: string) => void;
  indicators: string[];
  directions: Record<string, Direction>;
  tableRows: Array<ScoredCountry & { rank: number }>;
  sortKey: "rank" | "name" | "score";
  sortDir: "asc" | "desc";
  toggleSort: (key: "rank" | "name" | "score") => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  hovered: CanonMarker | null;
}) {
  const [showSliders, setShowSliders] = useState(false);

  return (
    <aside
      className="md:absolute md:right-0 md:top-0 md:bottom-0 md:z-10 md:overflow-y-auto
                 mt-4 md:mt-0 border md:border-0 md:border-l rounded-md md:rounded-none"
      style={{
        width: "min(420px, 100%)",
        background: "var(--bone)",
        borderColor: "var(--hairline)",
      }}
    >
      <div className="px-5 md:px-6 pt-5 md:pt-6 pb-8 space-y-5">
        <div
          className="pb-3 border-b text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)", borderColor: "var(--hairline)" }}
        >
          {mode === "explore" ? "Earth · indicator atlas" : "Earth · target ranking"}
        </div>

        {/* Hovered preview */}
        {hovered && (
          <div
            className="rounded-md px-3 py-2"
            style={{ background: "var(--bone-2)", border: `1px solid ${hovered.color ?? "var(--hairline)"}` }}
          >
            <div className="text-sm" style={{ color: "var(--basalt)", fontFamily: "var(--font-fraunces)", fontWeight: 500 }}>
              {hovered.title}
            </div>
            {typeof hovered.value === "number" && Number.isFinite(hovered.value) && (
              <div className="text-[11px] mt-0.5" style={{ color: hovered.color ?? "var(--gold)", fontFamily: "var(--font-jetbrains)" }}>
                {hovered.kind === "world-indicator" ? "value / score: " : ""}
                {hovered.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            )}
            {hovered.kind === "blue-zone" && hovered.civilization && (
              <div className="text-[11px] mt-1 leading-snug" style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}>
                {hovered.civilization}
              </div>
            )}
          </div>
        )}

        {/* RANK MODE: weight sliders + ranked table */}
        {mode === "rank" && (
          <>
            <div>
              <button
                onClick={() => setShowSliders((v) => !v)}
                className="w-full flex items-center justify-between text-[10px] uppercase tracking-[0.18em] py-1"
                style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
              >
                <span>custom weights ({Object.values(weights).filter((w) => w > 0).length})</span>
                <span>{showSliders ? "−" : "+"}</span>
              </button>
              {showSliders && (
                <div className="space-y-2.5 mt-2 max-h-[280px] overflow-y-auto pr-1">
                  {indicators.map((ind) => {
                    const dir = directions[ind];
                    const disabled = dir === "neutral";
                    const w = weights[ind] ?? 0;
                    return (
                      <div key={ind} className={disabled ? "opacity-40" : ""}>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-[10px] truncate flex-1"
                            style={{ color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}
                            title={`${ind}${disabled ? " (neutral — excluded)" : ` · ${dir} is better`}`}
                          >
                            {shortLabel(ind)}
                          </span>
                          <span
                            className="text-[10px] tabular-nums w-6 text-right"
                            style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
                          >
                            {disabled ? "—" : w}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={5}
                          step={1}
                          value={w}
                          disabled={disabled}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setWeights((prev) => ({ ...prev, [ind]: val }));
                            setActivePreset("");
                          }}
                          className="w-full accent-[color:var(--gold)]"
                          aria-label={`weight for ${ind}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div
                className="grid grid-cols-[2rem_1fr_3rem] gap-2 pb-2 mb-1 border-b text-[9px] uppercase tracking-[0.16em]"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)", borderColor: "var(--hairline)" }}
              >
                <button onClick={() => toggleSort("rank")} className="text-left hover:text-[color:var(--gold)]">
                  # {sortKey === "rank" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </button>
                <button onClick={() => toggleSort("name")} className="text-left hover:text-[color:var(--gold)]">
                  country {sortKey === "name" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </button>
                <button onClick={() => toggleSort("score")} className="text-right hover:text-[color:var(--gold)]">
                  score {sortKey === "score" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </button>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {tableRows.map((r) => {
                  const active = r.id === selectedId;
                  const finite = Number.isFinite(r.score);
                  return (
                    <button
                      key={r.id}
                      onClick={() => onSelect(r.id)}
                      className="w-full grid grid-cols-[2rem_1fr_3rem] gap-2 py-1.5 px-1 text-left items-center transition border-b"
                      style={{
                        borderColor: "var(--hairline)",
                        background: active ? "var(--bone-2)" : "transparent",
                      }}
                    >
                      <span className="text-[11px] tabular-nums" style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                        {finite ? r.rank : "—"}
                      </span>
                      <span className="text-[12px] truncate flex items-center gap-1.5" style={{ color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}>
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: finite ? rampColor(r.score / 100) : NO_DATA_COLOR }}
                        />
                        {r.title}
                      </span>
                      <span className="text-[11px] tabular-nums text-right" style={{ color: finite ? "var(--basalt)" : "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}>
                        {finite ? r.score.toFixed(1) : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* selected row's top weighted readings */}
              {selectedId && (() => {
                const row = tableRows.find((r) => r.id === selectedId);
                if (!row || row.top.length === 0) return null;
                return (
                  <div className="mt-3 rounded-md px-3 py-2" style={{ background: "var(--bone-2)", border: "1px solid var(--hairline)" }}>
                    <div className="text-[9px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}>
                      {row.title} · top weighted
                    </div>
                    <dl className="space-y-1 text-[11px]" style={{ fontFamily: "var(--font-fraunces)" }}>
                      {row.top.map((t) => (
                        <div key={t.label} className="flex justify-between gap-2">
                          <dt className="truncate" style={{ color: "var(--parchment-dim)" }} title={t.label}>
                            {shortLabel(t.label)} <span style={{ color: "var(--gold)" }}>×{t.weight}</span>
                          </dt>
                          <dd className="tabular-nums flex-shrink-0" style={{ color: "var(--basalt)" }}>{fmtNum(t.value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* EXPLORE MODE: hint */}
        {mode === "explore" && !hovered && (
          <p className="text-sm leading-relaxed" style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}>
            Each pin is one of 211 countries, coloured by the selected indicator
            along the bone → gold → teal ramp. Dim grey pins have no reported
            value. Hover for the reading; the legend marks the global average.
            Switch to <span style={{ color: "var(--gold)" }}>target ranking</span> to
            build a composite score across many indicators.
          </p>
        )}

        <p
          className="pt-2 text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          build history. · earth data · free to read
        </p>
      </div>
    </aside>
  );
}
