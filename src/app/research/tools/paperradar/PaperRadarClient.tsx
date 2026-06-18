"use client";

// PaperRadar client island — personalized recent-paper feed.
// Drives the uniform job lifecycle through /api/research/paperradar via the
// shared useToolRun hook. Render is "json" → typed feed view.

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type FeedItem = {
  title: string;
  authors: string[];
  venue: string;
  publication_date: string;
  cited_by_count: number;
  citation_velocity: number;
  score: number;
  relevance: number;
  recency: number;
  url: string;
  open_access: boolean;
  why_it_matters: string;
};
type PaperRadarOutput = {
  interests: string[];
  since: string;
  considered: number;
  degraded?: boolean;
  message?: string;
  feed: FeedItem[];
};

export default function PaperRadarClient() {
  const [interests, setInterests] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("paperradar");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interests: interests.trim(), limit: 12 }),
      },
      "Scanning OpenAlex for your topics…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            your topics / keywords (comma or newline separated)
          </span>
          <textarea
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="cryo-EM heterogeneity, protein dynamics, allostery"
            rows={3}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy || interests.trim().length < 3}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "scanning…" : "build my radar"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <FeedView result={result} />}
    </div>
  );
}

function FeedView({ result }: { result: ResultEnvelope }) {
  const out = result.output as PaperRadarOutput;
  if (out.degraded && (!out.feed || out.feed.length === 0)) {
    return (
      <div className="mt-10 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 text-[14px] text-[color:var(--basalt)]">
        {out.message ?? "OpenAlex is unreachable and there is no cached result. Try again shortly."}
      </div>
    );
  }
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        radar · {out.feed.length} papers from {out.considered} considered (since {out.since})
      </div>
      <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
        {out.feed.map((p, i) => (
          <div key={i} className="bg-[color:var(--bone)] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="text-[16px] font-display leading-[1.4] text-[color:var(--basalt)] hover:text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
              >
                {p.title}
              </a>
              <span className="shrink-0 text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)]">
                score {p.score.toFixed(2)}
              </span>
            </div>
            <div className="mt-2 text-[13px] text-[color:var(--basalt-2)]">
              {p.authors.join(", ")}
              {p.authors.length ? " · " : ""}
              {p.venue}
              {p.publication_date ? ` · ${p.publication_date}` : ""}
            </div>
            <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt)]">
              {p.why_it_matters}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
              <span>cites {p.cited_by_count}</span>
              <span>velocity {p.citation_velocity}/yr</span>
              <span>relevance {p.relevance.toFixed(2)}</span>
              {p.open_access && <span className="text-[color:var(--aegean-deep)]">open access</span>}
            </div>
          </div>
        ))}
      </div>
      <PublishToCanon result={result} />
    </div>
  );
}
