"use client";

// FAIRCheck client island, FAIR (Findable/Accessible/Interoperable/Reusable)
// rubric over a dataset metadata record. Render is "json". `record` is a JSON
// object/string of metadata fields, or "demo".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Gap = { principle: string; letter: string; score: number; priority: number; fix: string };
type FAIROutput = {
  overall_fair_score: number;
  grade: string;
  verdict: string;
  subscores: { Findable: number; Accessible: number; Interoperable: number; Reusable: number };
  sub_principles: Record<string, number>;
  detected: {
    persistent_identifier: string | null;
    license_kind?: string;
    matched_vocabularies?: string[];
    missing_core_metadata?: string[];
  };
  prioritized_gaps: Gap[];
  demo: boolean;
  note?: string;
};

const PLACEHOLDER = `{
  "title": "My dataset",
  "doi": "10.5281/zenodo.1234567",
  "repository": "Zenodo",
  "license": "CC-BY-4.0",
  "formats": ["csv", "json"],
  "access_protocol": "https",
  "vocabularies": ["schema.org", "DataCite"],
  "provenance": "...",
  "references": ["10.1038/..."]
}`;

export default function FAIRCheckClient() {
  const [record, setRecord] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("faircheck");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ record: "demo" }) },
      "Scoring demo record…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (record.trim().length < 2) return;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ record }) },
      "Scoring FAIR compliance…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            dataset metadata (JSON object of fields)
          </span>
          <textarea
            value={record}
            onChange={(e) => setRecord(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={10}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] leading-[1.6] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || record.trim().length < 2}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "scoring…" : "score FAIR"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo record
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <FAIRView result={result} />}
    </div>
  );
}

function FAIRView({ result }: { result: ResultEnvelope }) {
  const out = result.output as FAIROutput;
  const cell = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        FAIR assessment{out.demo ? " · DEMO" : ""}
      </div>

      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 mb-6">
        <div className="flex items-baseline gap-4">
          <span className="text-[40px] font-display text-[color:var(--basalt)] leading-none">
            {out.overall_fair_score}
          </span>
          <span className="text-[14px] text-[color:var(--basalt-3)]">/ 100</span>
          <span className="ml-auto text-[28px] font-display inlay-gold">{out.grade}</span>
        </div>
        <p className="mt-3 text-[14px] text-[color:var(--basalt-2)]">{out.verdict}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {cell("findable", String(out.subscores.Findable))}
        {cell("accessible", String(out.subscores.Accessible))}
        {cell("interoperable", String(out.subscores.Interoperable))}
        {cell("reusable", String(out.subscores.Reusable))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-[12px]">
        <span className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1">
          PID: {out.detected.persistent_identifier ?? "none"}
        </span>
        {out.detected.license_kind && (
          <span className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1">
            license: {out.detected.license_kind}
          </span>
        )}
        {out.detected.matched_vocabularies && out.detected.matched_vocabularies.length > 0 && (
          <span className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1">
            vocabularies: {out.detected.matched_vocabularies.join(", ")}
          </span>
        )}
      </div>

      {out.prioritized_gaps.length > 0 && (
        <div className="mt-8">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
            prioritized fixes (highest leverage first)
          </div>
          <ol className="flex flex-col gap-3">
            {out.prioritized_gaps.slice(0, 10).map((g, i) => (
              <li key={i} className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)] flex gap-3">
                <span className="font-mono text-[color:var(--aegean-deep)] shrink-0">
                  {g.principle} ({g.score.toFixed(2)})
                </span>
                <span>{g.fix}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}
