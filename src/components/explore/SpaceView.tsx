"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import CircleChart, { type ChartSeries } from "./CircleChart";
import Scrubber from "./Scrubber";
import { useWheelStep } from "./useWheelStep";
import type { SpaceViewId } from "./space-views";
import { sampleDataset } from "@/lib/explore/space-sample";
import { makeSlices, type Slice } from "@/lib/explore/slices";
import { visibleAt } from "@/lib/explore/surface";
import { clampIndex, describeItem, yearSteps } from "@/lib/explore/scrub";
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

function Root({ embedded, view, children, rootRef, ready }: { embedded: boolean; view: SpaceViewId; children: ReactNode; rootRef: React.RefObject<HTMLDivElement>; ready: boolean }) {
  const style = { background: "#141311", color: BONE, ...(embedded ? { height: "100%" } : { minHeight: "calc(100dvh - 4.5rem)" }) };
  const cls = "relative w-full flex flex-col items-center";
  return embedded ? (
    <div ref={rootRef} data-testid="space-view" data-view={view} data-ready={ready ? "true" : "false"} className={cls} style={style}>
      {children}
    </div>
  ) : (
    <div ref={rootRef} data-testid="space-view" data-view={view} data-ready={ready ? "true" : "false"} className={cls} style={style}>
      {children}
    </div>
  );
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
  const current = ds.obs[index];
  const meanCoverage = useMemo(() => {
    const cs = ds.obs.map((o) => o.coverage).filter((c): c is number => typeof c === "number");
    return cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : null;
  }, [ds]);
  const years = useMemo(() => yearSteps(ds.obs), [ds]);
  const [yearIndex, setYearIndex] = useState<number | null>(null);
  const yi = yearIndex === null ? Math.max(0, years.length - 1) : clampIndex(yearIndex, years.length);
  const shownYear = years.length ? years[yi] : 0;
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  useEffect(() => {
    setActiveSlice(0);
    setOpened(null);
    setYearIndex(null);
  }, [ds]);

  useEffect(() => {
    setOpened(null);
  }, [view]);

  const stepCurrent = useCallback(
    (d: number) => {
      if (view === "circle" || view === "sphere") setIndex(clampIndex(index + d, count));
      else if (view === "slices" && opened !== null) setOpened(clampIndex(opened + d, slices.length));
      else if (view === "slices" || view === "cylinder") setActiveSlice((i) => clampIndex(i + d, slices.length));
      else setYearIndex(clampIndex(yi + d, years.length));
    },
    [view, index, count, opened, slices.length, yi, years.length, setIndex],
  );
  useWheelStep(rootRef, stepCurrent);

  useEffect(() => {
    if (opened === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpened(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened]);

  const metaOf = (o: typeof current) => (o ? Object.values(o.meta).filter((v): v is string => typeof v === "string" && v.length > 0) : []);
  const lowTag = current?.coverage !== undefined && current.coverage < lowCoverage ? <span data-testid="low-coverage" style={{ color: GOLD }}> · low coverage</span> : null;
  const obsScrubber = (
    <Scrubber count={count} index={index} label={current ? describeItem(current.title, index, count, metaOf(current)) : "no observations"} suffix={undefined} ariaLabel={`${ds.label} observations`} onIndex={setIndex} labelTestId="space-current" />
  );

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
    const sliceScrubber = (
      <Scrubber count={slices.length} index={activeSlice} label={slices[activeSlice] ? `${slices[activeSlice].label} · slice ${activeSlice + 1} / ${slices.length}` : "no slices"} ariaLabel="slices" onIndex={setActiveSlice} labelTestId="slice-current" />
    );
    const yearScrubber = (
      <Scrubber count={years.length} index={yi} label={years.length ? `${shownYear} · ${visible} of ${count} observations` : "no dated observations"} ariaLabel="year" onIndex={setYearIndex} labelTestId="time-year" />
    );
    return (
      <Root embedded={embedded} view={view} rootRef={rootRef} ready={ready}>
        {badge}
        <div className="w-full flex-1 relative" style={{ minHeight: 420 }}>
          <SurfaceView mode={view} dataset={ds} slices={slices} year={shownYear} selected={index} activeSlice={activeSlice} onSelect={setIndex} />
        </div>
        <div className="w-full max-w-3xl px-4 pb-4 text-sm">
          <p data-testid="surface-status" data-visible={visible} className="sr-only">
            {view === "cylinder" ? `surface of ${slices.length} slices` : `${visible} of ${count} observations`}
          </p>
          {view === "cylinder" ? sliceScrubber : view === "sphere" ? obsScrubber : yearScrubber}
        </div>
      </Root>
    );
  }

  if (view === "slices" && opened === null) {
    return (
      <Root embedded={embedded} view={view} rootRef={rootRef} ready={ready}>
        {badge}
        <div className="w-full flex-1 relative" style={{ minHeight: 420 }}>
          <SliceStack dataset={ds} slices={slices} active={activeSlice} onActive={setActiveSlice} onOpen={setOpened} />
        </div>
        <div className="w-full max-w-3xl px-4 pb-4 text-sm">
          <Scrubber count={slices.length} index={activeSlice} label={slices[activeSlice] ? `${slices[activeSlice].label} · slice ${activeSlice + 1} / ${slices.length}` : "no slices"} ariaLabel="slices" onIndex={setActiveSlice} labelTestId="slice-current" />
          <div className="flex justify-center mt-3">
            <button type="button" data-testid="slice-open-btn" onClick={() => setOpened(activeSlice)} className="border hairline px-3 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D9A43A]" style={mono}>
              Open circle chart
            </button>
          </div>
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
    <Root embedded={embedded} view={view} rootRef={rootRef} ready={ready}>
      {badge}
      {slice && (
        <button type="button" data-testid="slice-back" onClick={() => setOpened(null)} className="absolute top-3 right-3 border hairline px-2 py-1 text-xs" style={mono}>
          Back to slices
        </button>
      )}
      <div className="w-full flex-1 max-w-3xl" style={{ minHeight: 420 }}>
        <CircleChart components={ds.components} series={series} scale={ds.scale} />
      </div>
      <div className="w-full max-w-3xl px-4 pb-6 text-sm">
        {slice ? (
          <Scrubber count={slices.length} index={opened ?? 0} label={`${slice.label} · ${slice.obsIds.length} observations`} ariaLabel="slices" onIndex={setOpened} labelTestId="slice-open" />
        ) : (
          <>
            {obsScrubber}
            {lowTag && <p className="text-center text-xs mt-1">{lowTag}</p>}
          </>
        )}
        <Components ds={ds} />
      </div>
    </Root>
  );
}
