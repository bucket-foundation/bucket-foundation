"use client";

import { useState } from "react";
import { PublishToCanon, RunError, RunStatus, useToolRun } from "../_shared/runner";

type Mode = "predict" | "scan";
type PredictOut = {
  mode?: string;
  predicted_ddG_kcal_mol?: number;
  call?: string;
  [k: string]: unknown;
};
type ScanRow = { mutation: string; ddG: number; call: string };
type ScanOut = { mode: "scan"; wt: string; position: number; results: ScanRow[] };

export default function StabilityDesignerClient() {
  const [sequence, setSequence] = useState("");
  const [mode, setMode] = useState<Mode>("predict");
  const [mutation, setMutation] = useState("");
  const [position, setPosition] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("stabilitydesigner");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = { sequence: sequence.trim(), mode };
    if (mode === "predict") body.mutation = mutation.trim();
    else body.position = Number(position);
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
      mode === "scan" ? "Scanning the position…" : "Predicting ΔΔG…",
    );
  };

  const seqLen = sequence.replace(/[^A-Za-z]/g, "").length;
  const valid =
    seqLen >= 5 &&
    (mode === "predict" ? /^[A-Za-z]\d+[A-Za-z]$/.test(mutation.trim()) : Number(position) >= 1);

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            sequence
          </span>
          <textarea
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            placeholder="MKTAYIAKQR..."
            rows={3}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>

        <div className="flex gap-4">
          {(["predict", "scan"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={busy}
              className={`text-[12px] small-caps tracking-[0.12em] px-4 py-2 border transition-colors ${
                mode === m
                  ? "border-[color:var(--gold)] text-[color:var(--basalt)] bg-[color:var(--bone)]"
                  : "border-[color:var(--hairline)] text-[color:var(--basalt-3)]"
              }`}
            >
              {m === "predict" ? "single mutation" : "scan position"}
            </button>
          ))}
        </div>

        {mode === "predict" ? (
          <label className="flex flex-col gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
              mutation (e.g. A23V)
            </span>
            <input
              value={mutation}
              onChange={(e) => setMutation(e.target.value)}
              placeholder="A23V"
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] max-w-[200px]"
              disabled={busy}
            />
          </label>
        ) : (
          <label className="flex flex-col gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
              position (1-based)
            </span>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="23"
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] max-w-[200px]"
              disabled={busy}
            />
          </label>
        )}

        <button
          type="submit"
          disabled={busy || !valid}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "running…" : mode === "scan" ? "scan" : "predict"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && result.render === "json" && (
        <div className="mt-10 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8">
          {(result.output as ScanOut).mode === "scan" ? (
            <ScanView out={result.output as ScanOut} />
          ) : (
            <PredictView out={result.output as PredictOut} />
          )}
          <PublishToCanon result={result} />
        </div>
      )}
    </div>
  );
}

function PredictView({ out }: { out: PredictOut }) {
  const ddg = out.predicted_ddG_kcal_mol;
  const stabilizing = typeof ddg === "number" && ddg < 0;
  return (
    <div>
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
        predicted ΔΔG
      </div>
      <div className="font-display text-[40px] text-[color:var(--basalt)]">
        {typeof ddg === "number" ? ddg.toFixed(2) : "—"}{" "}
        <span className="text-[16px] text-[color:var(--basalt-3)]">kcal/mol</span>
      </div>
      <div className="mt-2 text-[14px] text-[color:var(--basalt-2)]">
        {out.call ?? (stabilizing ? "stabilizing" : "destabilizing")}
      </div>
    </div>
  );
}

function ScanView({ out }: { out: ScanOut }) {
  return (
    <div>
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
        scan · {out.wt}
        {out.position} · most stabilizing first
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px] text-[color:var(--basalt)]">
          <thead>
            <tr className="text-left small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
              <th className="py-2 pr-6">mutation</th>
              <th className="py-2 pr-6">ΔΔG</th>
              <th className="py-2">call</th>
            </tr>
          </thead>
          <tbody>
            {out.results.map((r) => (
              <tr key={r.mutation} className="border-t border-[color:var(--hairline)]">
                <td className="py-1.5 pr-6 font-mono">{r.mutation}</td>
                <td className="py-1.5 pr-6 font-mono">{r.ddG.toFixed(2)}</td>
                <td className="py-1.5">{r.call}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
