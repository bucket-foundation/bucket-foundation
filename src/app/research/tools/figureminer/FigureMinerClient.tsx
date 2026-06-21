"use client";

// FigureMiner client island — text-layer caption + statistics + measurement
// mining (REAL deterministic parsing). Render is "json". `text` is paper text
// or "demo".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Caption = { kind: string; number: string; caption: string };
type PerFigure = {
  figure: string;
  n_stats: number;
  n_measurements: number;
  sample_sizes: number[];
};
type FMOutput = {
  method: string;
  backend: string;
  demo: boolean;
  n_chars: number;
  n_figures: number;
  n_tables: number;
  captions: Caption[];
  stats: {
    counts: Record<string, number>;
    sample_sizes: number[];
    fold_changes: number[];
  };
  measurements: { n_measurements: number; by_unit: Record<string, number> };
  per_figure: PerFigure[];
  ground_truth?: Record<string, number>;
  note?: string;
};

export default function FigureMinerClient() {
  const [text, setText] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("figureminer");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "demo" }) },
      "Mining demo paper…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 20) return;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) },
      "Mining figures…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            paper text (paste the body / figure captions)
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Figure 1. Knockdown reduced expression (n = 12, p < 0.001)…"
            rows={6}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] leading-[1.6] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || text.trim().length < 20}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "mining…" : "mine figures"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo paper
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <FMView result={result} />}
    </div>
  );
}

function FMView({ result }: { result: ResultEnvelope }) {
  const out = result.output as FMOutput;
  const stat = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        text-layer mining ({out.backend}){out.demo ? " · DEMO" : ""}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("figures", String(out.n_figures))}
        {stat("tables", String(out.n_tables))}
        {stat("p-values", String(out.stats.counts.p_values ?? 0))}
        {stat("measurements", String(out.measurements.n_measurements))}
      </div>

      {out.captions.length > 0 && (
        <div className="mt-6">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">captions</div>
          <ul className="flex flex-col gap-2">
            {out.captions.slice(0, 10).map((c, i) => (
              <li key={i} className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">
                <span className="font-display text-[color:var(--basalt)]">
                  {c.kind} {c.number}.
                </span>{" "}
                {c.caption.slice(0, 240)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(out.measurements.by_unit).length > 0 && (
        <div className="mt-6">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">measurements by unit</div>
          <div className="flex flex-wrap gap-2 font-mono text-[12px]">
            {Object.entries(out.measurements.by_unit).map(([u, n]) => (
              <span key={u} className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1">
                {u}: {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {out.ground_truth && (
        <div className="mt-6 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-4 text-[13px] text-[color:var(--aegean-deep)]">
          ✓ demo: extracted {out.n_figures + out.n_tables} figure/table blocks,
          {" "}
          {out.stats.counts.p_values ?? 0} p-value(s), {out.stats.fold_changes.length} fold-change(s).
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}
