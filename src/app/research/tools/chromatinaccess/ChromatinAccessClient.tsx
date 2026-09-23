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
import { DemoButton } from "../_shared/DemoButton";
import { FieldLabel } from "../_shared/FieldLabel";
import { Stat, StatGrid } from "../_shared/Stat";
import { SubmitButton } from "../_shared/SubmitButton";

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
          <FieldLabel>
            DNA sequence (FASTA or raw, ≥ 20 nt)
          </FieldLabel>
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
          <SubmitButton disabled={busy || clean.length < 20}>
            {busy ? "scoring…" : "score accessibility"}
          </SubmitButton>
          <DemoButton onClick={runDemo} disabled={busy}>
            run a demo promoter
          </DemoButton>
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
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        accessibility model{out.demo ? " · DEMO" : ""} · {out.length_nt} nt · {out.call}
      </div>
      <StatGrid>
        <Stat label="accessibility" value={out.accessibility_score.toFixed(3)} />
        <Stat label="GC content" value={`${(out.gc_content * 100).toFixed(1)}%`} />
        <Stat label="CpG islands" value={String(out.n_cpg_islands)} />
        <Stat label="promoter motifs" value={String(out.n_promoter_motifs)} />
      </StatGrid>

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
