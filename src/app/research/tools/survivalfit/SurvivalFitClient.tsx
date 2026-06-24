"use client";

// SurvivalFit client island — Kaplan-Meier + Mantel-Cox log-rank. Render "json".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type KMStep = { time: number; n_risk: number; n_event: number; survival: number; std_err: number };
type KM = {
  n_subjects: number;
  n_events: number;
  n_censored: number;
  median_survival: number | null;
  steps: KMStep[];
};
type LogRank = {
  observed_group1: number;
  expected_group1: number;
  chi_square: number;
  df: number;
  p_value: number;
  "significant_at_0.05": boolean;
  group1: string;
  group2: string;
};
type SurvivalOutput = {
  demo: boolean;
  overall: KM;
  per_group?: Record<string, KM>;
  logrank?: LogRank;
  note?: string;
};

function parseNums(s: string): number[] {
  return s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}
function parseLabels(s: string): string[] {
  return s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
}

export default function SurvivalFitClient() {
  const [durations, setDurations] = useState("");
  const [events, setEvents] = useState("");
  const [groups, setGroups] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("survivalfit");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: true }) },
      "Estimating two-group survival…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = parseNums(durations);
    if (d.length < 2) return;
    const body: Record<string, unknown> = { durations: d };
    const ev = parseNums(events);
    if (ev.length === d.length) body.events = ev;
    const gp = parseLabels(groups);
    if (gp.length === d.length) body.groups = gp;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
      "Computing Kaplan-Meier…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            durations (time to event/censoring)
          </span>
          <input
            value={durations}
            onChange={(e) => setDurations(e.target.value)}
            placeholder="e.g. 6 7 10 13 1 1 2 3"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            events — 1 = event, 0 = censored (optional; default all 1)
          </span>
          <input
            value={events}
            onChange={(e) => setEvents(e.target.value)}
            placeholder="e.g. 1 1 1 1 1 1 1 1"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            groups (optional; 2 distinct labels → log-rank test)
          </span>
          <input
            value={groups}
            onChange={(e) => setGroups(e.target.value)}
            placeholder="e.g. A A A A B B B B"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || parseNums(durations).length < 2}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "estimating…" : "estimate"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo (two groups)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <SurvivalView result={result} />}
    </div>
  );
}

function KMTable({ km }: { km: KM }) {
  return (
    <div className="overflow-x-auto border border-[color:var(--hairline)] mb-4">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-[color:var(--bone)] text-[color:var(--basalt-3)] small-caps tracking-[0.1em] text-[11px]">
            <th className="text-right px-3 py-2">time</th>
            <th className="text-right px-3 py-2">at risk</th>
            <th className="text-right px-3 py-2">events</th>
            <th className="text-right px-3 py-2">S(t)</th>
            <th className="text-right px-3 py-2">SE</th>
          </tr>
        </thead>
        <tbody>
          {km.steps.map((s, i) => (
            <tr key={i} className="border-t border-[color:var(--hairline)] bg-[color:var(--bone)]">
              <td className="px-3 py-2 text-right font-mono text-[color:var(--basalt)]">{s.time}</td>
              <td className="px-3 py-2 text-right font-mono text-[color:var(--basalt-2)]">{s.n_risk}</td>
              <td className="px-3 py-2 text-right font-mono text-[color:var(--basalt-2)]">{s.n_event}</td>
              <td className="px-3 py-2 text-right font-mono text-[color:var(--basalt)]">{s.survival}</td>
              <td className="px-3 py-2 text-right font-mono text-[color:var(--basalt-2)]">{s.std_err}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SurvivalView({ result }: { result: ResultEnvelope }) {
  const out = result.output as SurvivalOutput;

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        Kaplan-Meier{out.demo ? " · DEMO" : ""}
      </div>

      <div className="mb-4 text-[14px] text-[color:var(--basalt-2)]">
        {out.overall.n_subjects} subjects · {out.overall.n_events} events ·{" "}
        {out.overall.n_censored} censored · median survival ={" "}
        <span className="font-mono text-[color:var(--basalt)]">
          {out.overall.median_survival === null ? "not reached" : out.overall.median_survival}
        </span>
      </div>

      {out.per_group ? (
        Object.entries(out.per_group).map(([lab, km]) => (
          <div key={lab} className="mb-4">
            <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">
              group {lab} · median {km.median_survival === null ? "not reached" : km.median_survival}
            </div>
            <KMTable km={km} />
          </div>
        ))
      ) : (
        <KMTable km={out.overall} />
      )}

      {out.logrank && (
        <div
          className={`border p-5 mb-2 ${out.logrank["significant_at_0.05"] ? "border-[color:var(--gold)]" : "border-[color:var(--hairline)]"} bg-[color:var(--bone)]`}
        >
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
            log-rank test ({out.logrank.group1} vs {out.logrank.group2})
          </div>
          <div className="text-[15px] font-mono text-[color:var(--basalt)]">
            χ²({out.logrank.df}) = {out.logrank.chi_square} · p = {out.logrank.p_value}
            {out.logrank["significant_at_0.05"] ? " · significant" : " · n.s."}
          </div>
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}
