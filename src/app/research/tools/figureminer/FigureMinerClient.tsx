"use client";

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";
import { DemoButton } from "../_shared/DemoButton";
import { FieldLabel } from "../_shared/FieldLabel";
import { Stat, StatGrid } from "../_shared/Stat";
import { SubmitButton } from "../_shared/SubmitButton";

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
          <FieldLabel>
            paper text (paste the body / figure captions)
          </FieldLabel>
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
          <SubmitButton disabled={busy || text.trim().length < 20}>
            {busy ? "mining…" : "mine figures"}
          </SubmitButton>
          <DemoButton onClick={runDemo} disabled={busy}>
            run a demo paper
          </DemoButton>
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
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        text-layer mining ({out.backend}){out.demo ? " · DEMO" : ""}
      </div>
      <StatGrid>
        <Stat label="figures" value={String(out.n_figures)} />
        <Stat label="tables" value={String(out.n_tables)} />
        <Stat label="p-values" value={String(out.stats.counts.p_values ?? 0)} />
        <Stat label="measurements" value={String(out.measurements.n_measurements)} />
      </StatGrid>

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
