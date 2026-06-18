"use client";

// ReviewGuard client island — cross-paper supporting vs contradicting evidence
// for a claim, via deterministic sentence-level stance detection over OpenAlex
// abstracts. Render is "json" → typed view.

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
  overlap: number;
  evidence: string;
  confidence: number;
};
type ReviewOutput = {
  claim: string;
  claim_polarity: string;
  degraded?: boolean;
  verdict: string;
  counts: { supports: number; contradicts: number; neutral: number };
  supporting: Row[];
  contradicting: Row[];
  neutral: Row[];
  note: string;
};

export default function ReviewGuardClient() {
  const [claim, setClaim] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("reviewguard");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claim: claim.trim(), limit: 14 }),
      },
      "Checking the literature for and against…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            claim to check
          </span>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Cold exposure increases mitochondrial uncoupling in brown fat."
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
          {busy ? "checking…" : "check the claim"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <GuardView result={result} />}
    </div>
  );
}

function StanceList({ title, rows, tone }: { title: string; rows: Row[]; tone: string }) {
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
                conf {r.confidence.toFixed(2)}
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

function GuardView({ result }: { result: ResultEnvelope }) {
  const out = result.output as ReviewOutput;
  return (
    <div className="mt-10">
      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
          verdict{out.degraded ? " · degraded (no live literature)" : ""}
        </div>
        <p className="text-[18px] font-display leading-[1.4] text-[color:var(--basalt)]">
          {out.verdict}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
          <span>supports {out.counts.supports}</span>
          <span>contradicts {out.counts.contradicts}</span>
          <span>neutral {out.counts.neutral}</span>
        </div>
      </div>

      <StanceList title="supporting" rows={out.supporting} tone="var(--aegean-deep)" />
      <StanceList title="contradicting" rows={out.contradicting} tone="var(--basalt)" />
      <StanceList title="neutral mentions" rows={out.neutral} tone="var(--basalt-3)" />

      <p className="mt-6 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">{out.note}</p>

      <PublishToCanon result={result} />
    </div>
  );
}
