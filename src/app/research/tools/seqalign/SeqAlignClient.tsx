"use client";

// SeqAlign client island — exact pairwise alignment (Needleman-Wunsch global /
// Smith-Waterman local) with BLOSUM62 / identity scoring. Render "json".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type SeqAlignOutput = {
  demo: boolean;
  mode: string;
  algorithm: string;
  matrix: string;
  gap_penalty: number;
  seq_a_length: number;
  seq_b_length: number;
  score: number;
  aligned_a: string;
  aligned_b: string;
  midline: string;
  alignment_length: number;
  matches: number;
  mismatches: number;
  gaps: number;
  percent_identity: number;
  note?: string;
};

export default function SeqAlignClient() {
  const [seqA, setSeqA] = useState("");
  const [seqB, setSeqB] = useState("");
  const [mode, setMode] = useState("global");
  const [matrix, setMatrix] = useState("auto");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("seqalign");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ seq_a: "demo" }) },
      "Aligning HEAGAWGHEE / PAWHEAE…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seqA.trim() || !seqB.trim()) return;
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seq_a: seqA.trim(), seq_b: seqB.trim(), mode, matrix }),
      },
      "Computing optimal alignment…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            sequence A
          </span>
          <textarea
            value={seqA}
            onChange={(e) => setSeqA(e.target.value)}
            placeholder="e.g. HEAGAWGHEE  (protein or nucleotide; FASTA header ok)"
            rows={2}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            sequence B
          </span>
          <textarea
            value={seqB}
            onChange={(e) => setSeqB(e.target.value)}
            placeholder="e.g. PAWHEAE"
            rows={2}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              disabled={busy}
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-3 py-2 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            >
              <option value="global">global (Needleman-Wunsch)</option>
              <option value="local">local (Smith-Waterman)</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">matrix</span>
            <select
              value={matrix}
              onChange={(e) => setMatrix(e.target.value)}
              disabled={busy}
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-3 py-2 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            >
              <option value="auto">auto</option>
              <option value="blosum62">BLOSUM62 (protein)</option>
              <option value="identity">identity (nucleotide)</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || !seqA.trim() || !seqB.trim()}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "aligning…" : "align"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <SeqAlignView result={result} />}
    </div>
  );
}

function SeqAlignView({ result }: { result: ResultEnvelope }) {
  const out = result.output as SeqAlignOutput;
  const cell = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        {out.algorithm} · {out.matrix}{out.demo ? " · DEMO" : ""}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)] mb-6">
        {cell("score", String(out.score))}
        {cell("identity", `${out.percent_identity}%`)}
        {cell("length", String(out.alignment_length))}
        {cell("gaps", String(out.gaps))}
      </div>

      <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">alignment</div>
      <pre className="overflow-x-auto border border-[color:var(--hairline)] bg-[color:var(--bone)] p-4 text-[13px] leading-[1.5] font-mono text-[color:var(--basalt)] whitespace-pre">
{out.aligned_a}
{out.midline}
{out.aligned_b}
      </pre>
      <div className="mt-2 text-[12px] text-[color:var(--basalt-3)]">
        {out.matches} matches · {out.mismatches} mismatches · {out.gaps} gaps
        {" · "}gap penalty {out.gap_penalty}
      </div>

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}
