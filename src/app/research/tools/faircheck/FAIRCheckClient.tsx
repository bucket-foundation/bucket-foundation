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
          <FieldLabel>
            dataset metadata (JSON object of fields)
          </FieldLabel>
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
          <SubmitButton disabled={busy || record.trim().length < 2}>
            {busy ? "scoring…" : "score FAIR"}
          </SubmitButton>
          <DemoButton onClick={runDemo} disabled={busy}>
            run a demo record
          </DemoButton>
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

      <StatGrid>
        <Stat label="findable" value={String(out.subscores.Findable)} />
        <Stat label="accessible" value={String(out.subscores.Accessible)} />
        <Stat label="interoperable" value={String(out.subscores.Interoperable)} />
        <Stat label="reusable" value={String(out.subscores.Reusable)} />
      </StatGrid>

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
