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

type CDOutput = {
  method: string;
  demo: boolean;
  fs_hz: number;
  n_samples: number;
  duration_s: number;
  levels: { closed: number; open: number; threshold: number };
  n_events: number;
  n_openings: number;
  n_closings: number;
  p_open: number;
  mean_open_ms: number | null;
  mean_closed_ms: number | null;
  tau_open_ms: number | null;
  tau_closed_ms: number | null;
  ground_truth_p_open?: number;
  note?: string;
};

function parseTrace(raw: string): number[] | null {
  const toks = raw.trim().replace(/^\[|\]$/g, "").split(/[\s,]+/).filter(Boolean);
  const nums = toks.map(Number);
  if (nums.length === 0 || nums.some((x) => !Number.isFinite(x))) return null;
  return nums;
}

export default function ChannelDwellClient() {
  const [traceText, setTraceText] = useState("");
  const [fs, setFs] = useState("10000");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("channeldwell");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ trace: "demo" }) },
      "Idealizing demo record…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nums = parseTrace(traceText);
    if (!nums) return;
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trace: nums, fs_hz: Number(fs) || 10000 }),
      },
      "Idealizing record…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <FieldLabel>
            single-channel current (pA samples — comma / space separated)
          </FieldLabel>
          <textarea
            value={traceText}
            onChange={(e) => setTraceText(e.target.value)}
            placeholder="0.0, 0.1, 2.0, 1.9, 0.0, …"
            rows={4}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2 max-w-[180px]">
          <FieldLabel>
            sample rate (Hz)
          </FieldLabel>
          <input
            value={fs}
            onChange={(e) => setFs(e.target.value)}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <SubmitButton disabled={busy || !parseTrace(traceText)}>
            {busy ? "idealizing…" : "idealize record"}
          </SubmitButton>
          <DemoButton onClick={runDemo} disabled={busy}>
            run a demo record (known Pₒ)
          </DemoButton>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <CDView result={result} />}
    </div>
  );
}

function CDView({ result }: { result: ResultEnvelope }) {
  const out = result.output as CDOutput;
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        single-channel idealization{out.demo ? " · DEMO (two-state Markov)" : ""} · {out.duration_s}s @ {out.fs_hz} Hz
      </div>
      <StatGrid>
        <Stat label="P open" value={out.p_open.toFixed(4)} />
        <Stat label="openings" value={String(out.n_openings)} />
        <Stat label="τ open" value={out.tau_open_ms != null ? `${out.tau_open_ms.toFixed(3)} ms` : "—"} />
        <Stat label="τ closed" value={out.tau_closed_ms != null ? `${out.tau_closed_ms.toFixed(3)} ms` : "—"} />
      </StatGrid>
      <StatGrid className="mt-px">
        <Stat label="open level" value={`${out.levels.open.toFixed(2)} pA`} />
        <Stat label="closed level" value={`${out.levels.closed.toFixed(2)} pA`} />
        <Stat label="threshold" value={`${out.levels.threshold.toFixed(2)} pA`} />
        <Stat label="mean open" value={out.mean_open_ms != null ? `${out.mean_open_ms.toFixed(2)} ms` : "—"} />
      </StatGrid>

      {out.ground_truth_p_open != null && (
        <div className="mt-6 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-4 text-[14px] text-[color:var(--aegean-deep)]">
          recovered Pₒ = {out.p_open.toFixed(4)} vs known {out.ground_truth_p_open.toFixed(4)} (Δ ={" "}
          {Math.abs(out.p_open - out.ground_truth_p_open).toFixed(4)}).
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}
