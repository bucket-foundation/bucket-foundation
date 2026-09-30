"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import CircleChart, { type ChartSeries } from "./CircleChart";
import type { SpaceViewId } from "./space-views";
import { sampleDataset } from "@/lib/explore/space-sample";
import { makeSlices, type Slice } from "@/lib/explore/slices";
import { visibleAt, yearRange } from "@/lib/explore/surface";
import type { Dataset } from "@/lib/explore/space";

const SurfaceView = dynamic(() => import("./SurfaceView"), { ssr: false, loading: () => <div className="absolute inset-0" /> });
const SliceStack = dynamic(() => import("./SliceStack"), { ssr: false, loading: () => <div className="absolute inset-0" /> });

interface Props {
  view: SpaceViewId;
  dataset?: Dataset;
  embedded?: boolean;
  index?: number;
  onIndex?(i: number): void;
  lowCoverage?: number;
}

const mono = { fontFamily: "var(--font-jetbrains)" };
const GOLD = "#D9A43A";
const BONE = "#EFE8D4";
const DIM = "#A89F88";

function Root({ embedded, view, children }: { embedded: boolean; view: SpaceViewId; children: ReactNode }) {
  const style = { background: "#141311", color: BONE, ...(embedded ? { height: "100%" } : { minHeight: "calc(100dvh - 4.5rem)" }) };
  const cls = "relative w-full flex flex-col items-center";
  return embedded ? (
    <div data-testid="space-view" data-view={view} className={cls} style={style}>
      {children}
    </div>
  ) : (
    <main data-testid="space-view" data-view={view} className={cls} style={style}>
      {children}
    </main>
  );
}

const LIST_WINDOW = 40;

function visibleWindow<T>(items: T[], index: number): { o: T; i: number }[] {
  const start = Math.max(0, Math.min(items.length - LIST_WINDOW, index - LIST_WINDOW / 2));
  return items.slice(start, start + LIST_WINDOW).map((o, k) => ({ o, i: start + k }));
}

function Components({ ds }: { ds: Dataset }) {
  return (
    <ol className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs" style={{ color: DIM }}>
      {ds.components.map((c) => (
        <li key={c.index}>
          <b>{c.index}</b> {c.top_terms.slice(0, 4).join(", ")} <span>{(c.variance_ratio * 100).toFixed(0)}%</span>
        </li>
      ))}
    </ol>
  );
}

export default function SpaceView({ view, dataset, embedded = false, index: controlled, onIndex, lowCoverage = 0.3 }: Props) {
  const ds = useMemo(() => dataset ?? sampleDataset(), [dataset]);
  const [local, setLocal] = useState(0);
  const [activeSlice, setActiveSlice] = useState(0);
  const [opened, setOpened] = useState<number | null>(null);
  const slices = useMemo(() => makeSlices(ds), [ds]);
  const index = controlled ?? local;
  const count = ds.obs.length;
  const setIndex = useCallback((i: number) => (onIndex ? onIndex(i) : setLocal(i)), [onIndex]);
  const step = useCallback((d: number) => setIndex(count ? (index + d + count) % count : 0), [count, index, setIndex]);
  const current = ds.obs[index];
  const range = useMemo(() => yearRange(ds.obs), [ds]);
  const meanCoverage = useMemo(() => {
    const cs = ds.obs.map((o) => o.coverage).filter((c): c is number => typeof c === "number");
    return cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : null;
  }, [ds]);
  const [year, setYear] = useState<number | null>(null);
  const shownYear = year ?? range?.[1] ?? 0;

  useEffect(() => {
    setActiveSlice(0);
    setOpened(null);
    setYear(null);
  }, [ds]);

  useEffect(() => {
    setOpened(null);
  }, [view]);

  useEffect(() => {
    if (opened === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpened(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened]);

  const badge = (
    <div className="absolute top-3 left-3 flex items-center gap-2 text-xs" style={mono}>
      <span>{ds.label}</span>
      {ds.sample && (
        <span data-testid="sample-badge" className="border hairline px-2 py-0.5" style={{ color: GOLD }}>
          sample data
        </span>
      )}
      {meanCoverage !== null && (
        <span data-testid="coverage-stat" className="border hairline px-2 py-0.5" style={{ color: DIM }}>
          mean coverage {Math.round(meanCoverage * 100)}%
        </span>
      )}
      {ds.basis === "own" && (
        <span data-testid="basis-label" className="border hairline px-2 py-0.5" style={{ color: DIM }}>
          own basis, unscaled
        </span>
      )}
    </div>
  );

  if (view === "cylinder" || view === "sphere" || view === "sphere-time") {
    const visible = view === "sphere-time" ? ds.obs.filter((o) => visibleAt(o, shownYear)).length : count;
    return (
      <Root embedded={embedded} view={view}>
        {badge}
        <div className="w-full flex-1 relative" style={{ minHeight: 420 }}>
          <SurfaceView mode={view} dataset={ds} slices={slices} year={shownYear} selected={index} onSelect={setIndex} />
        </div>
        <div className="w-full max-w-3xl px-4 pb-4 text-sm">
          {view === "sphere-time" && range && (
            <label htmlFor="space-year" className="flex items-center gap-3 text-xs" style={mono}>
              <span>year</span>
              <input id="space-year" data-testid="time-slider" type="range" min={range[0]} max={range[1]} value={shownYear} onChange={(e) => setYear(Number(e.target.value))} className="flex-1 accent-[#D9A43A]" />
              <span data-testid="time-year">{shownYear}</span>
            </label>
          )}
          <p data-testid="surface-status" data-visible={visible} className="text-center mt-2" style={mono}>
            {view === "cylinder" ? `surface of ${slices.length} slices` : `${visible} of ${count} observations${current ? ` · ${current.title}` : ""}`}
          </p>
        </div>
      </Root>
    );
  }

  if (view === "slices" && opened === null) {
    return (
      <Root embedded={embedded} view={view}>
        {badge}
        <div className="w-full flex-1 relative" style={{ minHeight: 420 }}>
          <SliceStack dataset={ds} slices={slices} active={activeSlice} onActive={setActiveSlice} onOpen={setOpened} />
        </div>
        <div className="w-full max-w-3xl px-4 pb-4 text-sm">
          <p data-testid="slice-current" className="text-center" style={mono}>
            {slices[activeSlice] ? `${slices[activeSlice].label} · slice ${activeSlice + 1} / ${slices.length}` : "no slices"}
          </p>
          <ul data-testid="slice-rail" className="flex flex-wrap justify-center gap-2 mt-3">
            {slices.map((s, i) => (
              <li key={s.index}>
                <button type="button" data-testid={`slice-${i}`} aria-pressed={i === activeSlice} onClick={() => setOpened(i)} onFocus={() => setActiveSlice(i)} className="border hairline px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D9A43A]" style={{ ...mono, background: i === activeSlice ? GOLD : undefined, color: i === activeSlice ? "#141311" : undefined }}>
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Root>
    );
  }

  const slice: Slice | null = view === "slices" && opened !== null ? slices[opened] ?? null : null;
  const members = slice ? ds.obs.filter((o) => slice.obsIds.includes(o.id)).slice(0, 12) : [];
  const series: ChartSeries[] = slice
    ? [
        { id: "mean", name: "average", scores: ds.mean, stroke: BONE, fill: BONE, opacity: 0.04, dash: "5 4" },
        ...members.map((o) => ({ id: o.id, name: o.title, scores: o.scores, stroke: DIM, fill: DIM, opacity: 0.03, dash: "2 3" })),
        { id: `slice-${slice.index}`, name: slice.label, scores: slice.scores, stroke: GOLD, fill: GOLD, opacity: 0.22 },
      ]
    : [
        { id: "mean", name: "average", scores: ds.mean, stroke: BONE, fill: BONE, opacity: 0.04, dash: "5 4" },
        ...(current ? [{ id: current.id, name: current.title, scores: current.scores, stroke: GOLD, fill: GOLD, opacity: 0.22 }] : []),
      ];

  return (
    <Root embedded={embedded} view={view}>
      {badge}
      {slice && (
        <button type="button" data-testid="slice-back" onClick={() => setOpened(null)} className="absolute top-3 right-3 border hairline px-2 py-1 text-xs" style={mono}>
          Back to slices
        </button>
      )}
      <div className="w-full flex-1 max-w-3xl" style={{ minHeight: 420 }}>
        <CircleChart components={ds.components} series={series} onStep={slice ? undefined : step} scale={ds.scale} />
      </div>
      <div className="w-full max-w-3xl px-4 pb-6 text-sm">
        {slice ? (
          <p data-testid="slice-open" className="text-center" style={mono}>
            {slice.label} · {slice.obsIds.length} observations
          </p>
        ) : (
          <>
            <p data-testid="space-current" className="text-center" style={mono}>
              {current ? `${current.title} · ${index + 1} / ${count}` : "no observations"}
              {current && Object.values(current.meta).filter((v) => typeof v === "string" && v).length > 0 && <span data-testid="space-meta" style={{ color: DIM }}> · {Object.values(current.meta).filter((v) => typeof v === "string" && v).join(" · ")}</span>}
              {current?.coverage !== undefined && current.coverage < lowCoverage && (
                <span data-testid="low-coverage" style={{ color: GOLD }}>
                  {" "}
                  · low coverage
                </span>
              )}
            </p>
            <ul className="flex flex-wrap justify-center gap-2 mt-3">
              {visibleWindow(ds.obs, index).map(({ o, i }) => (
                <li key={o.id}>
                  <button type="button" aria-pressed={i === index} onClick={() => setIndex(i)} className="border hairline px-2 py-1 text-xs" style={{ ...mono, background: i === index ? GOLD : undefined, color: i === index ? "#141311" : undefined }}>
                    {o.title}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <Components ds={ds} />
      </div>
    </Root>
  );
}
