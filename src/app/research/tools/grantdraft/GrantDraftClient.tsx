"use client";

// GrantDraft client island — funder/grant finder + specific-aims drafter,
// grounded in REAL awarded grants (research-atlas NSF corpus / OpenAlex
// fallback). Render is "json" → typed view.

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Grant = {
  title: string;
  pi: string;
  org: string;
  program: string;
  amount_usd: number;
  agency: string;
  relevance: number;
  url: string;
};
type Funder = { program: string; agency: string; n: number; total_usd: number };
type Aim = {
  aim: string;
  text: string;
  grounded_in: { title: string; program: string; amount_usd: number; url: string } | null;
};
type GrantDraftOutput = {
  topic: string;
  source: string;
  degraded?: boolean;
  matched_grants: Grant[];
  top_funders: Funder[];
  specific_aims: Aim[];
};

const usd = (n: number) => (n ? `$${Math.round(n).toLocaleString()}` : "—");

export default function GrantDraftClient() {
  const [topic, setTopic] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("grantdraft");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), limit: 8 }),
      },
      "Matching real awarded grants…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            research topic
          </span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="biomolecular condensates and phase separation"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy || topic.trim().length < 4}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "drafting…" : "find funders + draft aims"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <DraftView result={result} />}
    </div>
  );
}

function DraftView({ result }: { result: ResultEnvelope }) {
  const out = result.output as GrantDraftOutput;
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        grant draft · source {out.source}
        {out.degraded ? " · degraded (no live data)" : ""}
      </div>

      {/* Specific aims, grounded in real awards */}
      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8">
        <div className="font-display uppercase text-[15px] tracking-[0.06em] text-[color:var(--basalt)] mb-4">
          Specific Aims (draft)
        </div>
        <div className="flex flex-col gap-5">
          {out.specific_aims.map((a, i) => (
            <div key={i}>
              <div className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] mb-1">
                {a.aim}
              </div>
              <p className="text-[15px] leading-[1.75] text-[color:var(--basalt)]">{a.text}</p>
              {a.grounded_in && (
                <a
                  href={a.grounded_in.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)] underline decoration-[color:var(--gold)] underline-offset-4"
                >
                  grounded in: {a.grounded_in.title} ({usd(a.grounded_in.amount_usd)})
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top funders */}
      {out.top_funders.length > 0 && (
        <div className="mt-6">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
            programs funding this area
          </div>
          <div className="flex flex-wrap gap-2">
            {out.top_funders.map((f, i) => (
              <span
                key={i}
                className="text-[12px] px-3 py-1.5 bg-[color:var(--bone)] border border-[color:var(--hairline)] text-[color:var(--basalt-2)]"
              >
                {f.program} · {f.n} award{f.n > 1 ? "s" : ""}
                {f.total_usd ? ` · ${usd(f.total_usd)}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Matched real grants */}
      <div className="mt-6">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
          matched awarded grants
        </div>
        <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
          {out.matched_grants.map((g, i) => (
            <div key={i} className="bg-[color:var(--bone)] p-5">
              <div className="flex items-start justify-between gap-4">
                <a
                  href={g.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[15px] font-display leading-[1.4] text-[color:var(--basalt)] hover:text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
                >
                  {g.title}
                </a>
                <span className="shrink-0 text-[12px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
                  {usd(g.amount_usd)}
                </span>
              </div>
              <div className="mt-1 text-[12px] text-[color:var(--basalt-2)]">
                {[g.pi, g.org, g.program, g.agency].filter(Boolean).join(" · ")}
                {" · "}rel {g.relevance.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PublishToCanon result={result} />
    </div>
  );
}
