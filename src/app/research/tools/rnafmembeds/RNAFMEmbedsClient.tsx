"use client";

// RNA-FM-Embeds client island — RNA embedding service. Real RNA-FM model when
// weights present, else a REAL k-mer + structural-feature embedding (honestly
// marked). Render is "json" → typed view.

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type StructuralFeatures = {
  gc_fraction: number;
  purine_fraction: number;
  longest_homopolymer: number;
  dinucleotide_entropy_bits: number;
  mfe_per_nt_kcal_mol?: number;
};
type EmbedOutput = {
  mode: string;
  model: string;
  is_real_model: boolean;
  length: number;
  embedding_dim: number;
  embedding: number[];
  structural_features: StructuralFeatures;
  note?: string;
};

const EXAMPLE = "GGGGAAAACCCCUUUUAGCGAUCG";

export default function RNAFMEmbedsClient() {
  const [sequence, setSequence] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("rnafmembeds");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sequence: sequence.trim(), k: 3 }),
      },
      "Embedding sequence…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            RNA / DNA sequence
          </span>
          <textarea
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            placeholder={EXAMPLE}
            rows={4}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || sequence.trim().replace(/\s/g, "").length < 4}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "embedding…" : "embed sequence"}
          </button>
          <button
            type="button"
            onClick={() => setSequence(EXAMPLE)}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            use an example
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <EmbedView result={result} />}
    </div>
  );
}

function EmbedView({ result }: { result: ResultEnvelope }) {
  const out = result.output as EmbedOutput;
  const f = out.structural_features;
  const preview = out.embedding.slice(0, 16);

  const stat = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">
        {label}
      </div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        mode {out.mode} · {out.is_real_model ? "RNA-FM model" : "real fallback"}
      </div>

      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6">
        <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">
          embedding
        </div>
        <div className="text-[15px] text-[color:var(--basalt)] mb-3">
          {out.model} · {out.embedding_dim}-d
        </div>
        <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
          first {preview.length} of {out.embedding_dim} dims
        </div>
        <pre className="font-mono text-[12px] leading-[1.6] text-[color:var(--basalt-2)] whitespace-pre-wrap break-all">
          [{preview.map((x) => x.toFixed(4)).join(", ")}{out.embedding.length > preview.length ? ", …" : ""}]
        </pre>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("length", `${out.length} nt`)}
        {stat("GC", `${(f.gc_fraction * 100).toFixed(0)}%`)}
        {stat("purine", `${(f.purine_fraction * 100).toFixed(0)}%`)}
        {stat("entropy", `${f.dinucleotide_entropy_bits.toFixed(2)} bits`)}
      </div>
      {f.mfe_per_nt_kcal_mol != null && (
        <div className="mt-px grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
          {stat("MFE / nt", `${f.mfe_per_nt_kcal_mol} kcal/mol`)}
          {stat("longest run", String(f.longest_homopolymer))}
        </div>
      )}

      {out.note && (
        <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>
      )}

      <PublishToCanon result={result} />
    </div>
  );
}
