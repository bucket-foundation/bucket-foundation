"use client";

// gRNA-Optimizer client island — CRISPR SpCas9 guide design (REAL PAM scan +
// on/off-target scoring). Render is "json" → typed view.

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Guide = {
  rank: number;
  protospacer: string;
  pam: string;
  strand: string;
  start: number;
  cut_site: number;
  on_target_score: number;
  off_target_risk: number;
  off_target_level: string;
  composite_score: number;
  gc_fraction: number;
  flags: string[];
};
type GRNAOutput = {
  method: string;
  pam: string;
  guide_len: number;
  target_length: number;
  n_candidates: number;
  guides: Guide[];
  note?: string;
};

const EXAMPLE = "ATGCGTACGTTAGCGATCGGGGCCAATTCCGGTACGATCGATCGGGAATTCCGG";

const levelColor = (lvl: string) =>
  lvl === "high"
    ? "var(--basalt)"
    : lvl === "moderate"
      ? "var(--aegean-deep)"
      : "var(--basalt-3)";

export default function GRNAOptimizerClient() {
  const [sequence, setSequence] = useState("");
  const [pam, setPam] = useState("NGG");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("grnaoptimizer");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sequence: sequence.trim(), pam: pam.trim() || "NGG", limit: 20 }),
      },
      "Scanning PAMs + scoring guides…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            target DNA
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
        <label className="flex flex-col gap-2 max-w-[180px]">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            PAM (IUPAC)
          </span>
          <input
            value={pam}
            onChange={(e) => setPam(e.target.value.toUpperCase())}
            placeholder="NGG"
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || sequence.trim().replace(/\s/g, "").length < 23}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "designing…" : "design guides"}
          </button>
          <button
            type="button"
            onClick={() => setSequence(EXAMPLE)}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            use an example target
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <GuideView result={result} />}
    </div>
  );
}

function GuideView({ result }: { result: ResultEnvelope }) {
  const out = result.output as GRNAOutput;
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        PAM {out.pam} · {out.guide_len} nt · {out.n_candidates} candidate
        {out.n_candidates === 1 ? "" : "s"} over {out.target_length} nt
      </div>

      {out.guides.length === 0 ? (
        <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 text-[14px] text-[color:var(--basalt)]">
          No guides found for this PAM in the target. Try a different PAM or a
          longer target region.
        </div>
      ) : (
        <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
          {out.guides.map((g) => (
            <div key={`${g.protospacer}-${g.strand}-${g.start}`} className="bg-[color:var(--bone)] p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="font-mono text-[14px] text-[color:var(--basalt)] tracking-wide">
                  <span className="text-[color:var(--basalt-3)] mr-2">#{g.rank}</span>
                  {g.protospacer}
                  <span className="text-[color:var(--aegean-deep)]"> {g.pam}</span>
                </div>
                <span className="shrink-0 text-[12px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
                  composite {g.composite_score.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[color:var(--basalt-2)]">
                <span>strand {g.strand}</span>
                <span>cut @ {g.cut_site}</span>
                <span>on-target {g.on_target_score.toFixed(2)}</span>
                <span style={{ color: levelColor(g.off_target_level) }}>
                  off-target {g.off_target_level} ({g.off_target_risk.toFixed(2)})
                </span>
                <span>GC {(g.gc_fraction * 100).toFixed(0)}%</span>
              </div>
              {g.flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {g.flags.map((f, i) => (
                    <span
                      key={i}
                      className="text-[11px] small-caps tracking-[0.1em] px-2 py-1 border border-[color:var(--hairline)] text-[color:var(--basalt-3)]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {out.note && (
        <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>
      )}

      <PublishToCanon result={result} />
    </div>
  );
}
