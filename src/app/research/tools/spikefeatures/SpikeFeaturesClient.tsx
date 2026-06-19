"use client";

// SpikeFeatures client island — spike detection (MAD threshold + refractory +
// alignment) + waveform features (REAL detector). Render is "json".
// `trace` is a numeric array or the string "demo" (synthetic, known spike count).

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Detection = {
  threshold: number;
  noise_sigma: number;
  polarity: string;
  threshold_mad: number;
};
type Waveform = {
  n_aligned: number;
  mean_waveform: number[];
  features: {
    peak_to_trough_amplitude: number;
    trough_to_peak_ms: number;
    half_width_ms: number;
  };
};
type SpikeOutput = {
  method: string;
  backend: string;
  spikeinterface_available: boolean;
  demo: boolean;
  fs_hz: number;
  duration_s: number;
  n_samples: number;
  n_spikes: number;
  firing_rate_hz: number;
  detection: Detection;
  isi: { mean_isi_ms: number | null; cv_isi: number | null };
  waveform: Waveform;
  spike_times_ms: number[];
  ground_truth_n_spikes?: number;
  note?: string;
};

function parseTrace(raw: string): number[] | null {
  const toks = raw.trim().replace(/^\[|\]$/g, "").split(/[\s,]+/).filter(Boolean);
  const nums = toks.map(Number);
  if (nums.length === 0 || nums.some((x) => !Number.isFinite(x))) return null;
  return nums;
}

export default function SpikeFeaturesClient() {
  const [traceText, setTraceText] = useState("");
  const [fs, setFs] = useState("30000");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("spikefeatures");

  const runDemo = () => {
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trace: "demo" }),
      },
      "Detecting demo spikes…",
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nums = parseTrace(traceText);
    if (!nums) return;
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trace: nums, fs_hz: Number(fs) || 30000 }),
      },
      "Detecting spikes…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            voltage trace (samples — comma / space separated)
          </span>
          <textarea
            value={traceText}
            onChange={(e) => setTraceText(e.target.value)}
            placeholder="0.1, -0.4, -8.2, -3.1, 0.6, …"
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
            {busy ? "detecting…" : "detect spikes"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo train (known count)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <SpikeView result={result} />}
    </div>
  );
}

function SpikeView({ result }: { result: ResultEnvelope }) {
  const out = result.output as SpikeOutput;
  const wf = out.waveform.features;

  const stat = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">
        {label}
      </div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        {out.backend}
        {out.demo ? " · DEMO (synthetic train)" : ""} · {out.duration_s}s @ {out.fs_hz} Hz
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("spikes", String(out.n_spikes))}
        {stat("firing rate", `${out.firing_rate_hz.toFixed(1)} Hz`)}
        {stat("polarity", out.detection.polarity)}
        {stat("threshold", `±${out.detection.threshold.toFixed(2)}`)}
      </div>
      <div className="mt-px grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("peak-trough amp", wf.peak_to_trough_amplitude.toFixed(2))}
        {stat("trough→peak", `${wf.trough_to_peak_ms.toFixed(3)} ms`)}
        {stat("half-width", `${wf.half_width_ms.toFixed(3)} ms`)}
        {stat("mean ISI", out.isi.mean_isi_ms != null ? `${out.isi.mean_isi_ms.toFixed(1)} ms` : "—")}
      </div>

      {out.ground_truth_n_spikes != null && (
        <div
          className="mt-6 border p-4 text-[14px]"
          style={{
            borderColor: "var(--hairline)",
            background: "var(--bone)",
            color:
              out.n_spikes === out.ground_truth_n_spikes
                ? "var(--aegean-deep)"
                : "var(--basalt)",
          }}
        >
          {out.n_spikes === out.ground_truth_n_spikes
            ? `✓ detected all ${out.ground_truth_n_spikes} planted spikes (exact match).`
            : `detected ${out.n_spikes} of ${out.ground_truth_n_spikes} planted spikes.`}
        </div>
      )}

      {out.note && (
        <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>
      )}

      <PublishToCanon result={result} />
    </div>
  );
}
