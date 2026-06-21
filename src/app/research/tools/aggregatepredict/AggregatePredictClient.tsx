"use client";

// AggregatePredict client island — amyloid / aggregation-propensity hot-spots
// (REAL windowed model). Render is "json". `sequence` is a protein sequence or
// "demo".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Hotspot = { start: number; end: number; length: number; peak_score: number; segment: string };
type AGOutput = {
  method: string;
  demo: boolean;
  length_aa: number;
  mean_score: number;
  max_score: number;
  n_hotspots: number;
  hotspots: Hotspot[];
  aggregation_prone: boolean;
  note?: string;
};

export default function AggregatePredictClient() {
  const [seq, setSeq] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("aggregatepredict");
  const clean = seq.replace(/[^A-Za-z]/g, "");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ sequence: "demo" }) },
      "Scanning demo sequence…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clean.length < 7) return;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ sequence: seq }) },
      "Scanning for hot-spots…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            protein sequence (FASTA or raw, ≥ 7 aa)
          </span>
          <textarea
            value={seq}
            onChange={(e) => setSeq(e.target.value)}
            placeholder="MDEKQRSTKE VIILVFLVIF GSGSDEKRQE…"
            rows={5}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || clean.length < 7}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "scanning…" : "find hot-spots"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo sequence
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <AGView result={result} />}
    </div>
  );
}

function AGView({ result }: { result: ResultEnvelope }) {
  const out = result.output as AGOutput;
  const stat = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        aggregation propensity{out.demo ? " · DEMO" : ""} · {out.length_aa} aa ·{" "}
        {out.aggregation_prone ? "aggregation-prone" : "no hot-spots"}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("hot-spots", String(out.n_hotspots))}
        {stat("max score", out.max_score.toFixed(3))}
        {stat("mean score", out.mean_score.toFixed(3))}
        {stat("prone?", out.aggregation_prone ? "yes" : "no")}
      </div>

      {out.hotspots.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-left small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
                <th className="py-2 pr-4">residues</th>
                <th className="py-2 pr-4">len</th>
                <th className="py-2 pr-4">peak</th>
                <th className="py-2 pr-4">segment</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {out.hotspots.slice(0, 20).map((h, i) => (
                <tr key={i} className="border-t border-[color:var(--hairline)]">
                  <td className="py-1.5 pr-4">
                    {h.start}–{h.end}
                  </td>
                  <td className="py-1.5 pr-4">{h.length}</td>
                  <td className="py-1.5 pr-4">{h.peak_score.toFixed(3)}</td>
                  <td className="py-1.5 pr-4">{h.segment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}
