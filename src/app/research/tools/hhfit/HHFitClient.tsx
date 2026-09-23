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
          <FieldLabel>
            voltage trace (mV samples — comma / space separated)
          </FieldLabel>
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
            <FieldLabel>
              current (pA)
            </FieldLabel>
            <input
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-2 max-w-[150px]">
            <FieldLabel>
              dt (ms)
            </FieldLabel>
            <input
              value={dt}
              onChange={(e) => setDt(e.target.value)}
              className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
              disabled={busy}
            />
          </label>
        </div>
        <div className="flex items-center gap-4">
          <SubmitButton disabled={busy || !parseTrace(traceText)}>
            {busy ? "fitting…" : "fit my trace"}
          </SubmitButton>
          <DemoButton onClick={runDemo} disabled={busy}>
            run a demo trace (known params)
          </DemoButton>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <FitView result={result} />}
    </div>
  );
}

function Truth({ value }: { value?: string }) {
  return value ? <div className="text-[11px] text-[color:var(--aegean-deep)] mt-1">true: {value}</div> : null;
}

function FitView({ result }: { result: ResultEnvelope }) {
  const out = result.output as HHFitOutput;
  const fit = out.fit;
  const gt = out.ground_truth;

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        passive-membrane RC fit · {out.fit_quality}
        {out.demo ? " · DEMO (synthetic trace)" : ""} · {out.n_samples} samples
      </div>

      <StatGrid>
        <Stat label="R" value={`${fit.R_megaohm} MΩ`}>
          <Truth value={gt ? `${(gt.R_gigaohm * 1000).toFixed(1)} MΩ` : undefined} />
        </Stat>
        <Stat label="C" value={`${fit.C_pf} pF`}>
          <Truth value={gt ? `${gt.C_pf} pF` : undefined} />
        </Stat>
        <Stat label="τ" value={`${fit.tau_ms} ms`}>
          <Truth value={gt ? `${gt.tau_ms} ms` : undefined} />
        </Stat>
        <Stat label="V₀" value={`${fit.V0_mv} mV`}>
          <Truth value={gt ? `${gt.V0_mv} mV` : undefined} />
        </Stat>
      </StatGrid>
      <StatGrid className="mt-px">
        <Stat label="R²" value={fit.r_squared.toFixed(4)} />
        <Stat label="RMSE" value={`${fit.rmse_mv} mV`} />
        <Stat label="converged" value={fit.converged ? "yes" : "no"} />
        <Stat label="iterations" value={String(fit.n_iterations)} />
      </StatGrid>

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
