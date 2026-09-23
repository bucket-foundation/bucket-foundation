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
          <FieldLabel>
            RNA / DNA sequence
          </FieldLabel>
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
          <SubmitButton disabled={busy || sequence.trim().replace(/\s/g, "").length < 4}>
            {busy ? "embedding…" : "embed sequence"}
          </SubmitButton>
          <DemoButton onClick={() => setSequence(EXAMPLE)} disabled={busy}>
            use an example
          </DemoButton>
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

      <StatGrid className="mt-6">
        <Stat label="length" value={`${out.length} nt`} />
        <Stat label="GC" value={`${(f.gc_fraction * 100).toFixed(0)}%`} />
        <Stat label="purine" value={`${(f.purine_fraction * 100).toFixed(0)}%`} />
        <Stat label="entropy" value={`${f.dinucleotide_entropy_bits.toFixed(2)} bits`} />
      </StatGrid>
      {f.mfe_per_nt_kcal_mol != null && (
        <StatGrid className="mt-px">
          <Stat label="MFE / nt" value={`${f.mfe_per_nt_kcal_mol} kcal/mol`} />
          <Stat label="longest run" value={String(f.longest_homopolymer)} />
        </StatGrid>
      )}

      {out.note && (
        <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>
      )}

      <PublishToCanon result={result} />
    </div>
  );
}
