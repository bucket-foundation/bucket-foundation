"use client";

// CausalDesigner client island — build a causal DAG, identify backdoor paths +
// a valid adjustment set (real do-calculus), recommend an estimator. Render "json".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Estimator = {
  key: string;
  name: string;
  identifies: string;
  assumptions: string[];
  threats: string[];
};
type CausalOutput = {
  treatment: string;
  outcome: string;
  graph: { nodes: string[]; edges: string[][]; node_roles: Record<string, string> };
  backdoor_paths: { repr: string }[];
  n_backdoor_paths: number;
  adjustment_set: string[] | null;
  identifiable_by_adjustment: boolean;
  identification: string;
  do_not_adjust_for: string[];
  recommended_estimator: Estimator;
  estimator_notes: string[];
  demo: boolean;
  note?: string;
};

export default function CausalDesignerClient() {
  const [treatment, setTreatment] = useState("");
  const [outcome, setOutcome] = useState("");
  const [confounders, setConfounders] = useState("");
  const [edges, setEdges] = useState("");
  const [design, setDesign] = useState("");
  const [instrument, setInstrument] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("causaldesigner");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: true }) },
      "Designing demo study…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatment.trim() || !outcome.trim()) return;
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          treatment: treatment.trim(),
          outcome: outcome.trim(),
          confounders: confounders.trim() || undefined,
          edges: edges.trim() || undefined,
          design: design.trim() || undefined,
          instrument: instrument.trim() || undefined,
        }),
      },
      "Building DAG + finding adjustment set…",
    );
  };

  const field = (label: string, value: string, set: (v: string) => void, ph: string) => (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">{label}</span>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={ph}
        className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-2.5 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
        disabled={busy}
      />
    </label>
  );

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("treatment", treatment, setTreatment, "e.g. smoking")}
          {field("outcome", outcome, setOutcome, "e.g. cancer")}
        </div>
        {field("confounders (comma-separated, optional)", confounders, setConfounders, "e.g. age, income")}
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            causal edges (optional — &quot;A -&gt; B, C -&gt; D&quot;; if blank, confounders point at both T and Y)
          </span>
          <textarea
            value={edges}
            onChange={(e) => setEdges(e.target.value)}
            placeholder="gene -> smoking, gene -> cancer, smoking -> cancer"
            rows={3}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] leading-[1.6] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("design (optional)", design, setDesign, "e.g. difference-in-differences, RDD, IV…")}
          {field("instrument (optional, for IV)", instrument, setInstrument, "e.g. quarter_of_birth")}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || !treatment.trim() || !outcome.trim()}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "designing…" : "design study"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo (smoking → cancer)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <CausalView result={result} />}
    </div>
  );
}

function CausalView({ result }: { result: ResultEnvelope }) {
  const out = result.output as CausalOutput;
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        causal design{out.demo ? " · DEMO" : ""}
      </div>

      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 mb-6">
        <div className="text-[14px] text-[color:var(--basalt-2)] mb-1">
          {out.treatment} <span className="text-[color:var(--gold-deep,var(--basalt-3))]">→</span> {out.outcome}
        </div>
        <div
          className={`text-[15px] font-display ${
            out.identifiable_by_adjustment ? "text-[color:var(--basalt)]" : "text-[color:var(--basalt)]"
          }`}
        >
          {out.identification}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
            adjustment set (block backdoors)
          </div>
          {out.adjustment_set && out.adjustment_set.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {out.adjustment_set.map((v) => (
                <span key={v} className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1 text-[13px] font-mono">
                  {v}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[color:var(--basalt-2)]">
              {out.adjustment_set ? "∅ (no adjustment needed)" : "no valid set — use a design-based method"}
            </p>
          )}
        </div>
        <div>
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
            do NOT adjust for
          </div>
          {out.do_not_adjust_for.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {out.do_not_adjust_for.map((v) => (
                <span key={v} className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1 text-[13px] font-mono text-[color:var(--basalt-3)]">
                  {v} ({out.graph.node_roles[v]})
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[color:var(--basalt-3)]">none</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
          backdoor paths ({out.n_backdoor_paths})
        </div>
        {out.backdoor_paths.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {out.backdoor_paths.map((b, i) => (
              <li key={i} className="text-[13px] font-mono text-[color:var(--basalt-2)]">{b.repr}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-[color:var(--basalt-3)]">none — treatment is unconfounded given the graph.</p>
        )}
      </div>

      <div className="mt-8 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6">
        <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">
          recommended estimator
        </div>
        <div className="text-[18px] font-display text-[color:var(--basalt)]">{out.recommended_estimator.name}</div>
        <p className="mt-2 text-[14px] text-[color:var(--basalt-2)]">{out.recommended_estimator.identifies}</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1 text-[11px]">assumptions</div>
            <ul className="list-disc pl-5 text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">
              {out.recommended_estimator.assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
          <div>
            <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1 text-[11px]">threats to validity</div>
            <ul className="list-disc pl-5 text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">
              {out.recommended_estimator.threats.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}
