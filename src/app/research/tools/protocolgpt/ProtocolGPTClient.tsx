"use client";

// ProtocolGPT client island, freeform methods/SOP → structured protocol via
// deterministic rule extraction. Render is "json" → typed view.

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Step = {
  n: number;
  action: string;
  durations: string[];
  temperatures: string[];
  speeds: string[];
  volumes: string[];
  masses: string[];
  concentrations: string[];
  reagents: string[];
  safety_flags: string[];
};
type Reagent = { name: string; amount: string; concentration: string };
type Hazard = { flag: string; triggers: string[]; guidance: string };
type ProtocolOutput = {
  title: string;
  n_steps: number;
  degraded?: boolean;
  message?: string;
  steps: Step[];
  reagents: Reagent[];
  safety_flags: Hazard[];
  summary?: { n_reagents: number; n_safety_flags: number; n_timed_steps: number };
  note?: string;
};

const EXAMPLE = `Prepare a 50 mL culture in LB medium with 100 µg/ml ampicillin. Inoculate with a single colony and grow overnight at 37°C with shaking. Harvest the cells by centrifugation at 4000 rpm for 10 min. Resuspend the pellet in 5 mL lysis buffer containing 1 mM EDTA and 10 mM Tris. Sonicate on ice for 2 min.`;

export default function ProtocolGPTClient() {
  const [methods, setMethods] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("protocolgpt");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ methods: methods.trim() }),
      },
      "Structuring the protocol…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            methods / SOP description
          </span>
          <textarea
            value={methods}
            onChange={(e) => setMethods(e.target.value)}
            placeholder={EXAMPLE}
            rows={7}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || methods.trim().length < 15}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "structuring…" : "structure protocol"}
          </button>
          <button
            type="button"
            onClick={() => setMethods(EXAMPLE)}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.1em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            load example
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <ProtocolView result={result} />}
    </div>
  );
}

function ProtocolView({ result }: { result: ResultEnvelope }) {
  const out = result.output as ProtocolOutput;

  if (out.degraded) {
    return (
      <div className="mt-10 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
          no steps detected
        </div>
        <p className="text-[14px] text-[color:var(--basalt-2)]">{out.message}</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
          {out.title}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
          <span>{out.n_steps} steps</span>
          {out.summary && <span>{out.summary.n_reagents} reagents</span>}
          {out.summary && <span>{out.summary.n_timed_steps} timed</span>}
          {out.summary && <span>{out.summary.n_safety_flags} safety flags</span>}
        </div>
      </div>

      {/* Steps */}
      <div className="mt-6 small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] mb-3">
        protocol
      </div>
      <ol className="flex flex-col gap-px bg-[color:var(--hairline)]">
        {out.steps.map((s) => (
          <li key={s.n} className="bg-[color:var(--bone)] p-5">
            <div className="flex gap-4">
              <span className="shrink-0 font-display text-[18px] text-[color:var(--gold-deep,var(--aegean-deep))]">
                {s.n}
              </span>
              <div className="flex-1">
                <p className="text-[15px] leading-[1.5] text-[color:var(--basalt)]">{s.action}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ...s.durations.map((x) => ["time", x] as const),
                    ...s.temperatures.map((x) => ["temp", x] as const),
                    ...s.speeds.map((x) => ["speed", x] as const),
                    ...s.volumes.map((x) => ["vol", x] as const),
                    ...s.concentrations.map((x) => ["conc", x] as const),
                    ...s.masses.map((x) => ["mass", x] as const),
                  ].map(([k, v], i) => (
                    <span
                      key={i}
                      className="text-[11px] small-caps tracking-[0.08em] px-2 py-0.5 border border-[color:var(--hairline)] text-[color:var(--basalt-2)]"
                    >
                      {k}: {v}
                    </span>
                  ))}
                  {s.safety_flags.map((f, i) => (
                    <span
                      key={`sf-${i}`}
                      className="text-[11px] small-caps tracking-[0.08em] px-2 py-0.5 border border-[color:var(--basalt)] text-[color:var(--basalt)]"
                    >
                      ⚠ {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* Reagents */}
      {out.reagents.length > 0 && (
        <>
          <div className="mt-8 small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] mb-3">
            reagents
          </div>
          <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
            {out.reagents.map((r, i) => (
              <div
                key={i}
                className="bg-[color:var(--bone)] px-5 py-3 flex items-baseline justify-between gap-4"
              >
                <span className="text-[14px] text-[color:var(--basalt)]">{r.name}</span>
                <span className="text-[12px] small-caps tracking-[0.08em] text-[color:var(--basalt-3)]">
                  {[r.concentration, r.amount].filter(Boolean).join(" · ") || "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Safety */}
      {out.safety_flags.length > 0 && (
        <>
          <div className="mt-8 small-caps tracking-[0.14em] text-[color:var(--basalt)] mb-3">
            safety flags
          </div>
          <div className="flex flex-col gap-3">
            {out.safety_flags.map((h, i) => (
              <div
                key={i}
                className="border-l-2 border-[color:var(--gold)] bg-[color:var(--bone)] pl-4 py-2"
              >
                <div className="text-[13px] font-display text-[color:var(--basalt)]">⚠ {h.flag}</div>
                <p className="text-[12px] leading-[1.5] text-[color:var(--basalt-2)] mt-0.5">
                  {h.guidance}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {out.note && (
        <p className="mt-6 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">{out.note}</p>
      )}

      <PublishToCanon result={result} />
    </div>
  );
}
