"use client";

// ChannelDwell client island — single-channel idealization (half-amplitude
// threshold) + dwell-time analysis (REAL). Render is "json". `trace` is a
// current (pA) array or "demo".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

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
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            single-channel current (pA samples — comma / space separated)
          </span>
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
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            sample rate (Hz)
          </span>
          <input
            value={fs}
            onChange={(e) => setFs(e.target.value)}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || !parseTrace(traceText)}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "idealizing…" : "idealize record"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo record (known Pₒ)
          </button>
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
  const stat = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        single-channel idealization{out.demo ? " · DEMO (two-state Markov)" : ""} · {out.duration_s}s @ {out.fs_hz} Hz
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("P open", out.p_open.toFixed(4))}
        {stat("openings", String(out.n_openings))}
        {stat("τ open", out.tau_open_ms != null ? `${out.tau_open_ms.toFixed(3)} ms` : "—")}
        {stat("τ closed", out.tau_closed_ms != null ? `${out.tau_closed_ms.toFixed(3)} ms` : "—")}
      </div>
      <div className="mt-px grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("open level", `${out.levels.open.toFixed(2)} pA`)}
        {stat("closed level", `${out.levels.closed.toFixed(2)} pA`)}
        {stat("threshold", `${out.levels.threshold.toFixed(2)} pA`)}
        {stat("mean open", out.mean_open_ms != null ? `${out.mean_open_ms.toFixed(2)} ms` : "—")}
      </div>

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
