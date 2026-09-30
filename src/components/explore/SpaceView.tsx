"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import CircleChart, { type ChartSeries } from "./CircleChart";
import type { SpaceViewId } from "./space-views";
import { sampleDataset } from "@/lib/explore/space-sample";
import { makeSlices, type Slice } from "@/lib/explore/slices";
import type { Dataset } from "@/lib/explore/space";

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

  useEffect(() => {
    setActiveSlice(0);
    setOpened(null);
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
    </div>
  );

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
                <button type="button" data-testid={`slice-${i}`} aria-pressed={i === activeSlice} onClick={() => setOpened(i)} onFocus={() => setActiveSlice(i)} className="border hairline px-2 py-1 text-xs" style={{ ...mono, background: i === activeSlice ? GOLD : undefined, color: i === activeSlice ? "#141311" : undefined }}>
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
        <CircleChart components={ds.components} series={series} onStep={slice ? undefined : step} />
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
              {current?.coverage !== undefined && current.coverage < lowCoverage && (
                <span data-testid="low-coverage" style={{ color: GOLD }}>
                  {" "}
                  · low coverage
                </span>
              )}
            </p>
            <ul className="flex flex-wrap justify-center gap-2 mt-3">
              {ds.obs.map((o, i) => (
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
