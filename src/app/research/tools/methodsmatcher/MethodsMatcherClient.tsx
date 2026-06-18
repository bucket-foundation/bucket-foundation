"use client";

// MethodsMatcher client island — "which method (and which Bucket tool) answers
// this question?" Methods mined from the live OpenAlex literature; tool match
// from Bucket's own catalog. Render is "json" → typed view.

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Method = { method: string; papers_in_set: number; total_citations: number };
type OurTool = { slug: string; name: string; answers: string; matched_signals: string[]; score: number };
type Exemplar = { title: string; venue: string; year: number | null; cited_by_count: number; url: string };
type MethodsOutput = {
  question: string;
  degraded?: boolean;
  recommended_methods: Method[];
  our_tools: OurTool[];
  exemplar_papers: Exemplar[];
  recommendation: string;
};

export default function MethodsMatcherClient() {
  const [question, setQuestion] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("methodsmatcher");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      },
      "Mining the methods literature…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            research question
          </span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="How do I detect synaptic currents in patch-clamp recordings?"
            rows={3}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy || question.trim().length < 8}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "matching…" : "match a method"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <MatchView result={result} />}
    </div>
  );
}

function MatchView({ result }: { result: ResultEnvelope }) {
  const out = result.output as MethodsOutput;
  return (
    <div className="mt-10">
      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
          recommendation{out.degraded ? " · degraded (no live literature)" : ""}
        </div>
        <p className="text-[16px] leading-[1.75] text-[color:var(--basalt)]">{out.recommendation}</p>
      </div>

      {out.our_tools.length > 0 && (
        <div className="mt-6">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
            run on Bucket
          </div>
          <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
            {out.our_tools.map((t) => (
              <a
                key={t.slug}
                href={`/research/tools/${t.slug}`}
                className="bg-[color:var(--bone)] p-5 flex items-start justify-between gap-4 hover:bg-[color:var(--bone-2,var(--bone))]"
              >
                <div>
                  <div className="font-display uppercase text-[16px] tracking-[0.04em] text-[color:var(--basalt)]">
                    {t.name}
                  </div>
                  <div className="mt-1 text-[13px] text-[color:var(--basalt-2)]">{t.answers}</div>
                  <div className="mt-1 text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
                    matched: {t.matched_signals.join(", ")}
                  </div>
                </div>
                <span className="shrink-0 text-[12px] small-caps tracking-[0.1em] text-[color:var(--aegean-deep)]">
                  fit {t.score.toFixed(2)} →
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {out.recommended_methods.length > 0 && (
        <div className="mt-6">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
            methods recurring in the literature
          </div>
          <div className="flex flex-wrap gap-2">
            {out.recommended_methods.map((m, i) => (
              <span
                key={i}
                className="text-[12px] px-3 py-1.5 bg-[color:var(--bone)] border border-[color:var(--hairline)] text-[color:var(--basalt-2)]"
                title={`${m.papers_in_set} papers · ${m.total_citations} citations`}
              >
                {m.method} · {m.papers_in_set}
              </span>
            ))}
          </div>
        </div>
      )}

      {out.exemplar_papers.length > 0 && (
        <div className="mt-6">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
            exemplar papers
          </div>
          <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
            {out.exemplar_papers.map((p, i) => (
              <a
                key={i}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="bg-[color:var(--bone)] p-4 text-[14px] text-[color:var(--basalt)] hover:text-[color:var(--aegean-deep)]"
              >
                {p.title}
                <span className="block text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)] mt-1">
                  {[p.venue, p.year, `${p.cited_by_count} cites`].filter(Boolean).join(" · ")}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <PublishToCanon result={result} />
    </div>
  );
}
