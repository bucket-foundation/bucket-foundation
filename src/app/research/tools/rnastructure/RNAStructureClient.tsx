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

type Summary = {
  n_base_pairs: number;
  paired_bases: number;
  unpaired_bases: number;
  paired_fraction: number;
  n_helices: number;
};
type StrongPair = { i: number; j: number; prob: number };
type RNAStructureOutput = {
  degraded?: boolean;
  message?: string;
  library?: string;
  vienna_version?: string;
  input_was_dna?: boolean;
  sequence?: string;
  length?: number;
  gc_fraction?: number;
  mfe_structure?: string;
  mfe_kcal_mol?: number;
  ensemble_energy_kcal_mol?: number;
  mfe_ensemble_frequency?: number;
  mean_pair_confidence?: number;
  summary?: Summary;
  high_confidence_pairs?: StrongPair[];
  per_base_max_prob?: number[];
  note?: string;
};

const EXAMPLE = "GGGGAAAACCCC";

export default function RNAStructureClient() {
  const [sequence, setSequence] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("rnastructure");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sequence: sequence.trim() }),
      },
      "Folding with ViennaRNA…",
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
            {busy ? "folding…" : "fold sequence"}
          </SubmitButton>
          <DemoButton onClick={() => setSequence(EXAMPLE)} disabled={busy}>
            use a hairpin example
          </DemoButton>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <FoldView result={result} />}
    </div>
  );
}

function FoldView({ result }: { result: ResultEnvelope }) {
  const out = result.output as RNAStructureOutput;

  if (out.degraded) {
    return (
      <div className="mt-10 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 text-[14px] text-[color:var(--basalt)]">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
          backend unavailable
        </div>
        {out.message ?? "ViennaRNA is not installed on the tools host."}
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        {out.library} {out.vienna_version} · {out.length} nt
        {out.input_was_dna ? " · DNA folded as RNA" : ""}
      </div>

      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 overflow-x-auto">
        <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
          MFE structure
        </div>
        <pre className="font-mono text-[13px] leading-[1.5] text-[color:var(--basalt)] whitespace-pre">
{out.sequence ?? ""}
{"\n"}
{out.mfe_structure ?? ""}
        </pre>
      </div>

      <StatGrid className="mt-6">
        <Stat label="MFE" value={`${out.mfe_kcal_mol ?? "—"} kcal/mol`} />
        <Stat label="ensemble" value={`${out.ensemble_energy_kcal_mol ?? "—"} kcal/mol`} />
        <Stat label="MFE freq" value={out.mfe_ensemble_frequency != null ? out.mfe_ensemble_frequency.toFixed(3) : "—"} />
        <Stat label="mean pair conf" value={out.mean_pair_confidence != null ? out.mean_pair_confidence.toFixed(3) : "—"} />
      </StatGrid>

      {out.summary && (
        <StatGrid className="mt-6">
          <Stat label="base pairs" value={String(out.summary.n_base_pairs)} />
          <Stat label="helices" value={String(out.summary.n_helices)} />
          <Stat label="paired" value={`${(out.summary.paired_fraction * 100).toFixed(0)}%`} />
          <Stat label="GC" value={`${out.gc_fraction != null ? (out.gc_fraction * 100).toFixed(0) : "—"}%`} />
        </StatGrid>
      )}

      {out.high_confidence_pairs && out.high_confidence_pairs.length > 0 && (
        <div className="mt-6">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
            high-confidence base pairs (p ≥ 0.5)
          </div>
          <div className="flex flex-wrap gap-2">
            {out.high_confidence_pairs.slice(0, 24).map((p, i) => (
              <span
                key={i}
                className="font-mono text-[12px] px-3 py-1.5 bg-[color:var(--bone)] border border-[color:var(--hairline)] text-[color:var(--basalt-2)]"
              >
                {p.i}–{p.j} · {p.prob.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {out.note && (
        <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>
      )}

      <PublishToCanon result={result} />
    </div>
  );
}
