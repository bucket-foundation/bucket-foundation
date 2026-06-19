"use client";

// QuantumBioRAG client island — claim-strength RAG over live OpenAlex with
// evidence-weighted stance + consensus. Render is "json" → typed view.

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Row = {
  title: string;
  venue: string;
  year: number | null;
  cited_by_count: number;
  url: string;
  stance: string;
  evidence: string;
  stance_confidence: number;
  evidence_strength: number;
};
type QBOutput = {
  claim: string;
  in_quantum_biology_scope: boolean;
  degraded?: boolean;
  verdict: string;
  support_strength: string;
  support_score: number;
  consensus: number;
  counts: { supports: number; contradicts: number; neutral: number };
  top_supporting: Row[];
  top_contradicting: Row[];
  neutral: Row[];
  note: string;
};

export default function QuantumBioRAGClient() {
  const [claim, setClaim] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("quantumbiorag");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claim: claim.trim(), limit: 18 }),
      },
      "Weighing the evidence…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            quantum-biology claim
          </span>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Quantum coherence enhances photosynthetic energy transfer."
            rows={3}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy || claim.trim().length < 8}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "weighing…" : "score the claim"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <QBView result={result} />}
    </div>
  );
}

function StrengthBar({ score }: { score: number }) {
  return (
    <div className="h-2 w-full bg-[color:var(--hairline)]">
      <div
        className="h-2 bg-[color:var(--gold)]"
        style={{ width: `${Math.round(score * 100)}%` }}
      />
    </div>
  );
}

function EvidenceList({ title, rows, tone }: { title: string; rows: Row[]; tone: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-6">
      <div className="small-caps tracking-[0.14em] mb-3" style={{ color: tone }}>
        {title} ({rows.length})
      </div>
      <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
        {rows.map((r, i) => (
          <div key={i} className="bg-[color:var(--bone)] p-5">
            <div className="flex items-start justify-between gap-4">
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="text-[15px] font-display leading-[1.4] text-[color:var(--basalt)] hover:text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
              >
                {r.title}
              </a>
              <span className="shrink-0 text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
                strength {r.evidence_strength.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
              {[r.venue, r.year, `${r.cited_by_count} cites`].filter(Boolean).join(" · ")}
            </div>
            {r.evidence && (
              <p className="mt-2 text-[13px] leading-[1.6] text-[color:var(--basalt-2)] italic border-l-2 border-[color:var(--gold)] pl-3">
                “{r.evidence}”
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QBView({ result }: { result: ResultEnvelope }) {
  const out = result.output as QBOutput;
  return (
    <div className="mt-10">
      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
          verdict{out.degraded ? " · degraded (no live literature)" : ""}
        </div>
        <p className="text-[18px] font-display leading-[1.4] text-[color:var(--basalt)]">
          {out.verdict}
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="flex justify-between text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)] mb-1">
              <span>support strength · {out.support_strength}</span>
              <span>{Math.round(out.support_score * 100)}%</span>
            </div>
            <StrengthBar score={out.support_score} />
          </div>
          <div>
            <div className="flex justify-between text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)] mb-1">
              <span>consensus</span>
              <span>{Math.round(out.consensus * 100)}%</span>
            </div>
            <StrengthBar score={out.consensus} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
          <span>supports {out.counts.supports}</span>
          <span>contradicts {out.counts.contradicts}</span>
          <span>neutral {out.counts.neutral}</span>
          {!out.in_quantum_biology_scope && <span>· broadened to quantum-bio scope</span>}
        </div>
      </div>

      <EvidenceList title="strongest supporting" rows={out.top_supporting} tone="var(--aegean-deep)" />
      <EvidenceList title="strongest contradicting" rows={out.top_contradicting} tone="var(--basalt)" />
      <EvidenceList title="neutral mentions" rows={out.neutral} tone="var(--basalt-3)" />

      <p className="mt-6 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">{out.note}</p>

      <PublishToCanon result={result} />
    </div>
  );
}
