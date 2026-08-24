"use client";

// CalciumTraceML client island, ΔF/F + transient detection (REAL signal
// processing). Render is "json". `trace` is a numeric array or "demo".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type CaEvent = {
  onset_s: number;
  peak_s: number;
  duration_s: number;
  amplitude_dff: number;
  decay_tau_s: number | null;
};
type CaOutput = {
  method: string;
  demo: boolean;
  fs_hz: number;
  n_samples: number;
  duration_s: number;
  dff: { max: number; mean: number; noise_sigma: number };
  n_events: number;
  event_rate_hz: number;
  events: CaEvent[];
  ground_truth_n_events?: number;
  note?: string;
};

function parseTrace(raw: string): number[] | null {
  const toks = raw.trim().replace(/^\[|\]$/g, "").split(/[\s,]+/).filter(Boolean);
  const nums = toks.map(Number);
  if (nums.length === 0 || nums.some((x) => !Number.isFinite(x))) return null;
  return nums;
}

export default function CalciumTraceClient() {
  const [traceText, setTraceText] = useState("");
  const [fs, setFs] = useState("30");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("calciumtraceml");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ trace: "demo" }) },
      "Computing demo ΔF/F…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nums = parseTrace(traceText);
    if (!nums) return;
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trace: nums, fs_hz: Number(fs) || 30 }),
      },
      "Computing ΔF/F…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            fluorescence trace (F samples — comma / space separated)
          </span>
          <textarea
            value={traceText}
            onChange={(e) => setTraceText(e.target.value)}
            placeholder="100.2, 101.4, 160.0, 142.3, 118.0, …"
            rows={4}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2 max-w-[180px]">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            frame rate (Hz)
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
            {busy ? "analyzing…" : "compute ΔF/F"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo trace (known count)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <CaView result={result} />}
    </div>
  );
}

function CaView({ result }: { result: ResultEnvelope }) {
  const out = result.output as CaOutput;
  const stat = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        ΔF/F + transient detection{out.demo ? " · DEMO (synthetic trace)" : ""} · {out.duration_s}s @ {out.fs_hz} Hz
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("events", String(out.n_events))}
        {stat("event rate", `${out.event_rate_hz.toFixed(3)} Hz`)}
        {stat("max ΔF/F", out.dff.max.toFixed(3))}
        {stat("noise σ", out.dff.noise_sigma.toFixed(4))}
      </div>

      {out.events.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-left small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
                <th className="py-2 pr-4">onset (s)</th>
                <th className="py-2 pr-4">peak (s)</th>
                <th className="py-2 pr-4">dur (s)</th>
                <th className="py-2 pr-4">amp ΔF/F</th>
                <th className="py-2 pr-4">decay τ (s)</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {out.events.slice(0, 30).map((ev, i) => (
                <tr key={i} className="border-t border-[color:var(--hairline)]">
                  <td className="py-1.5 pr-4">{ev.onset_s.toFixed(3)}</td>
                  <td className="py-1.5 pr-4">{ev.peak_s.toFixed(3)}</td>
                  <td className="py-1.5 pr-4">{ev.duration_s.toFixed(3)}</td>
                  <td className="py-1.5 pr-4">{ev.amplitude_dff.toFixed(3)}</td>
                  <td className="py-1.5 pr-4">{ev.decay_tau_s != null ? ev.decay_tau_s.toFixed(3) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {out.ground_truth_n_events != null && (
        <div
          className="mt-6 border p-4 text-[14px]"
          style={{
            borderColor: "var(--hairline)",
            background: "var(--bone)",
            color: out.n_events === out.ground_truth_n_events ? "var(--aegean-deep)" : "var(--basalt)",
          }}
        >
          {out.n_events === out.ground_truth_n_events
            ? `✓ detected all ${out.ground_truth_n_events} planted transients (exact match).`
            : `detected ${out.n_events} of ${out.ground_truth_n_events} planted transients.`}
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}
