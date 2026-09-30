"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import CircleChart, { type ChartSeries } from "./CircleChart";
import { sampleDataset } from "@/lib/explore/space-sample";
import type { Dataset } from "@/lib/explore/space";
import type { SpaceViewId } from "./space-views";

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

export default function SpaceView({ dataset, embedded = false, index: controlled, onIndex, lowCoverage = 0.3 }: Props) {
  const ds = useMemo(() => dataset ?? sampleDataset(), [dataset]);
  const [local, setLocal] = useState(0);
  const index = controlled ?? local;
  const count = ds.obs.length;
  const setIndex = useCallback((i: number) => (onIndex ? onIndex(i) : setLocal(i)), [onIndex]);
  const step = useCallback((d: number) => setIndex(count ? (index + d + count) % count : 0), [count, index, setIndex]);
  const current = ds.obs[index];
  const series: ChartSeries[] = [
    { id: "mean", name: "average", scores: ds.mean, stroke: BONE, fill: BONE, opacity: 0.04, dash: "5 4" },
    ...(current ? [{ id: current.id, name: current.title, scores: current.scores, stroke: GOLD, fill: GOLD, opacity: 0.22 }] : []),
  ];
  return (
    <Root embedded={embedded}>
      <div className="absolute top-3 left-3 flex items-center gap-2 text-xs" style={mono}>
        <span>{ds.label}</span>
        {ds.sample && (
          <span data-testid="sample-badge" className="border hairline px-2 py-0.5" style={{ color: GOLD }}>
            sample data
          </span>
        )}
      </div>
      <div className="w-full flex-1 max-w-3xl" style={{ minHeight: 420 }}>
        <CircleChart components={ds.components} series={series} onStep={step} />
      </div>
      <div className="w-full max-w-3xl px-4 pb-6 text-sm">
        <p data-testid="space-current" className="text-center" style={mono}>
          {current ? `${current.title} · ${index + 1} / ${count}` : "no observations"}
          {current?.coverage !== undefined && current.coverage < lowCoverage && <span data-testid="low-coverage" style={{ color: GOLD }}> · low coverage</span>}
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
        <ol className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs" style={{ color: "#A89F88" }}>
          {ds.components.map((c) => (
            <li key={c.index}>
              <b>{c.index}</b> {c.top_terms.slice(0, 4).join(", ")} <span>{(c.variance_ratio * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ol>
      </div>
    </Root>
  );
}

function Root({ embedded, children }: { embedded: boolean; children: ReactNode }) {
  const style = { background: "#141311", color: BONE, ...(embedded ? { height: "100%" } : { minHeight: "calc(100dvh - 4.5rem)" }) };
  const cls = "relative w-full flex flex-col items-center";
  return embedded ? (
    <div data-testid="space-view" data-view="circle" className={cls} style={style}>
      {children}
    </div>
  ) : (
    <main data-testid="space-view" data-view="circle" className={cls} style={style}>
      {children}
    </main>
  );
}
