"use client";

// HH-FitML client island — passive-membrane (RC) parameter fit to a current-
// clamp trace via scipy least-squares (REAL numerical fit). Render is "json".
// `trace` is a numeric array or the string "demo" (synthetic, known ground truth).

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Fit = {
  R_megaohm: number;
  R_gigaohm: number;
  C_pf: number;
  tau_ms: number;
  V0_mv: number;
  r_squared: number;
  rmse_mv: number;
  converged: boolean;
  n_iterations: number;
};
type GroundTruth = { R_gigaohm: number; C_pf: number; tau_ms: number; V0_mv: number };
type HHFitOutput = {
  method: string;
  model: string;
  demo: boolean;
  current_pa: number;
  dt_ms: number;
  stim_onset_ms: number;
  n_samples: number;
  fit: Fit;
  fit_quality: string;
  spike_count_estimate: number;
  ground_truth?: GroundTruth;
  note?: string;
};

// parse a pasted trace ("1.2, -3.4 ..." or JSON array) into a number[].
function parseTrace(raw: string): number[] | null {
  const toks = raw.trim().replace(/^\[|\]$/g, "").split(/[\s,]+/).filter(Boolean);
  const nums = toks.map(Number);
  if (nums.length === 0 || nums.some((x) => !Number.isFinite(x))) return null;
  return nums;
}

export default function HHFitClient() {
  const [traceText, setTraceText] = useState("");
  const [current, setCurrent] = useState("100");
  const [dt, setDt] = useState("0.1");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("hhfit");

  const runDemo = () => {
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trace: "demo" }),
      },
      "Fitting demo trace…",
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nums = parseTrace(traceText);
    if (!nums) return;
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trace: nums,
          current_pa: Number(current) || 100,
          dt_ms: Number(dt) || 0.1,
        }),
      },
      "Fitting membrane params…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            voltage trace (mV samples — comma / space separated)
          </span>
          <textarea
            value={traceText}
            onChange={(e) => setTraceText(e.target.value)}
            placeholder="-65.0, -64.8, -63.2, -60.1, …"
            rows={4}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-2 max-w-[150px]">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
              current (pA)
            </span>
            <input
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-2 max-w-[150px]">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
              dt (ms)
            </span>
            <input
              value={dt}
              onChange={(e) => setDt(e.target.value)}
              className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
              disabled={busy}
            />
          </label>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || !parseTrace(traceText)}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "fitting…" : "fit my trace"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo trace (known params)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <FitView result={result} />}
    </div>
  );
}

function FitView({ result }: { result: ResultEnvelope }) {
  const out = result.output as HHFitOutput;
  const fit = out.fit;
  const gt = out.ground_truth;

  const stat = (label: string, value: string, truth?: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">
        {label}
      </div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
      {truth && (
        <div className="text-[11px] text-[color:var(--aegean-deep)] mt-1">true: {truth}</div>
      )}
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        passive-membrane RC fit · {out.fit_quality}
        {out.demo ? " · DEMO (synthetic trace)" : ""} · {out.n_samples} samples
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("R", `${fit.R_megaohm} MΩ`, gt ? `${(gt.R_gigaohm * 1000).toFixed(1)} MΩ` : undefined)}
        {stat("C", `${fit.C_pf} pF`, gt ? `${gt.C_pf} pF` : undefined)}
        {stat("τ", `${fit.tau_ms} ms`, gt ? `${gt.tau_ms} ms` : undefined)}
        {stat("V₀", `${fit.V0_mv} mV`, gt ? `${gt.V0_mv} mV` : undefined)}
      </div>
      <div className="mt-px grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("R²", fit.r_squared.toFixed(4))}
        {stat("RMSE", `${fit.rmse_mv} mV`)}
        {stat("converged", fit.converged ? "yes" : "no")}
        {stat("iterations", String(fit.n_iterations))}
      </div>

      <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">
        Model: <span className="font-mono text-[12px]">{out.model}</span>
      </p>

      {out.note && (
        <p className="mt-4 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>
      )}

      <PublishToCanon result={result} />
    </div>
  );
}
