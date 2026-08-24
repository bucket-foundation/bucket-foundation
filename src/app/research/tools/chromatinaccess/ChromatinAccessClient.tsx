"use client";

// ChromatinAccess client island, DNA accessibility / regulatory potential
// (REAL interpretable feature model). Render is "json". `sequence` is DNA or
// "demo".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Island = { start: number; end: number; gc: number; obs_exp_cpg: number };
type CAOutput = {
  method: string;
  demo: boolean;
  length_nt: number;
  gc_content: number;
  cpg_islands: Island[];
  n_cpg_islands: number;
  promoter_motifs: Record<string, number[]>;
  n_promoter_motifs: number;
  accessibility_score: number;
  call: string;
  note?: string;
};

export default function ChromatinAccessClient() {
  const [seq, setSeq] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("chromatinaccess");
  const clean = seq.replace(/[^A-Za-z]/g, "");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ sequence: "demo" }) },
      "Scoring demo sequence…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clean.length < 20) return;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ sequence: seq }) },
      "Scoring accessibility…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            DNA sequence (FASTA or raw, ≥ 20 nt)
          </span>
          <textarea
            value={seq}
            onChange={(e) => setSeq(e.target.value)}
            placeholder="GCGCGCGC…TATAAAA…GGGCGG…"
            rows={5}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || clean.length < 20}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "scoring…" : "score accessibility"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo promoter
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <CAView result={result} />}
    </div>
  );
}

function CAView({ result }: { result: ResultEnvelope }) {
  const out = result.output as CAOutput;
  const stat = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        accessibility model{out.demo ? " · DEMO" : ""} · {out.length_nt} nt · {out.call}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("accessibility", out.accessibility_score.toFixed(3))}
        {stat("GC content", `${(out.gc_content * 100).toFixed(1)}%`)}
        {stat("CpG islands", String(out.n_cpg_islands))}
        {stat("promoter motifs", String(out.n_promoter_motifs))}
      </div>

      {Object.entries(out.promoter_motifs).some(([, v]) => v.length > 0) && (
        <div className="mt-6">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">motifs found</div>
          <div className="flex flex-wrap gap-2 font-mono text-[12px]">
            {Object.entries(out.promoter_motifs)
              .filter(([, v]) => v.length > 0)
              .map(([k, v]) => (
                <span key={k} className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1">
                  {k}: {v.length}
                </span>
              ))}
          </div>
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}
