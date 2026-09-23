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
          <FieldLabel>
            fluorescence trace (F samples — comma / space separated)
          </FieldLabel>
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
          <FieldLabel>
            frame rate (Hz)
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
            {busy ? "analyzing…" : "compute ΔF/F"}
          </SubmitButton>
          <DemoButton onClick={runDemo} disabled={busy}>
            run a demo trace (known count)
          </DemoButton>
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
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        ΔF/F + transient detection{out.demo ? " · DEMO (synthetic trace)" : ""} · {out.duration_s}s @ {out.fs_hz} Hz
      </div>
      <StatGrid>
        <Stat label="events" value={String(out.n_events)} />
        <Stat label="event rate" value={`${out.event_rate_hz.toFixed(3)} Hz`} />
        <Stat label="max ΔF/F" value={out.dff.max.toFixed(3)} />
        <Stat label="noise σ" value={out.dff.noise_sigma.toFixed(4)} />
      </StatGrid>

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
