"use client";

// TractionForceML client island, block-matching PIV displacement field (REAL
// normalized cross-correlation). Render is "json". Inputs: reference + deformed
// 2-D arrays, or "demo".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type TFOutput = {
  method: string;
  demo: boolean;
  image_shape: [number, number];
  params: { window: number; step: number; search: number };
  n_vectors: number;
  mean_displacement_px: number;
  max_displacement_px: number;
  dominant_shift_px: { u: number; v: number };
  strain_energy_proxy: number;
  ground_truth_shift_px?: { u: number; v: number };
  note?: string;
};

function parseImage(raw: string): number[][] | null {
  const t = raw.trim();
  try {
    const v = JSON.parse(t);
    if (Array.isArray(v) && v.length > 0 && Array.isArray(v[0])) {
      const rows = v as number[][];
      if (rows.every((r) => r.every((x) => Number.isFinite(Number(x))))) return rows;
    }
  } catch {
    /* fall through */
  }
  const lines = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const rows = lines.map((l) => l.split(/[\s,]+/).map(Number));
  if (rows.some((r) => r.length !== rows[0].length || r.some((x) => !Number.isFinite(x)))) return null;
  return rows;
}

export default function TractionForceClient() {
  const [refText, setRefText] = useState("");
  const [defText, setDefText] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("tractionforceml");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ reference: "demo" }) },
      "Computing demo PIV…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = parseImage(refText);
    const def = parseImage(defText);
    if (!ref || !def) return;
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference: ref, deformed: def }),
      },
      "Computing PIV field…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            reference (relaxed) bead image — rows, or JSON 2-D array
          </span>
          <textarea
            value={refText}
            onChange={(e) => setRefText(e.target.value)}
            rows={4}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[12px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            deformed bead image — same shape
          </span>
          <textarea
            value={defText}
            onChange={(e) => setDefText(e.target.value)}
            rows={4}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[12px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || !parseImage(refText) || !parseImage(defText)}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "computing…" : "compute PIV field"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo (known shift)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <TFView result={result} />}
    </div>
  );
}

function TFView({ result }: { result: ResultEnvelope }) {
  const out = result.output as TFOutput;
  const stat = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );
  const gtMatch =
    out.ground_truth_shift_px &&
    out.dominant_shift_px.u === out.ground_truth_shift_px.u &&
    out.dominant_shift_px.v === out.ground_truth_shift_px.v;

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        block-matching PIV{out.demo ? " · DEMO (synthetic beads)" : ""} · {out.image_shape[0]}×{out.image_shape[1]}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("vectors", String(out.n_vectors))}
        {stat("mean |u|", `${out.mean_displacement_px.toFixed(2)} px`)}
        {stat("max |u|", `${out.max_displacement_px.toFixed(2)} px`)}
        {stat("dominant", `u=${out.dominant_shift_px.u}, v=${out.dominant_shift_px.v}`)}
      </div>
      <div className="mt-px grid grid-cols-1 gap-px bg-[color:var(--hairline)]">
        {stat("strain-energy proxy (Σ|u|²)", out.strain_energy_proxy.toFixed(2))}
      </div>

      {out.ground_truth_shift_px && (
        <div
          className="mt-6 border p-4 text-[14px]"
          style={{
            borderColor: "var(--hairline)",
            background: "var(--bone)",
            color: gtMatch ? "var(--aegean-deep)" : "var(--basalt)",
          }}
        >
          {gtMatch
            ? `✓ recovered the imposed shift exactly (u=${out.ground_truth_shift_px.u}, v=${out.ground_truth_shift_px.v}).`
            : `recovered u=${out.dominant_shift_px.u}, v=${out.dominant_shift_px.v} vs imposed u=${out.ground_truth_shift_px.u}, v=${out.ground_truth_shift_px.v}.`}
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}
