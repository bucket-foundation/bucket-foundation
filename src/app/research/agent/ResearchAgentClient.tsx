"use client";

// Research-agent client island. Posts a question to /api/research-agent and
// renders the grounded brief: plan → method match → cited findings →
// limitations/abstention → full source list → the exact calls made
// (reproducibility ledger). Reuses the founder-GPU-offline notice from the
// research-tools shared kit so a 502/503 degrades gracefully instead of erroring.

import { useState } from "react";
import { ToolOfflineNotice, detectToolOffline } from "../tools/_shared/ToolOfflineNotice";

type Citation = { id: string; title: string; url?: string; doi?: string };
type Finding = { statement: string; citations: Citation[] };
type Source = {
  id: string;
  kind: "canon" | "openalex" | "pubmed" | "atlas" | "methods";
  title: string;
  snippet: string;
  url?: string;
  doi?: string;
  year?: number | null;
  meta?: Record<string, unknown>;
  provenance: { retriever: string; call: string };
};
type Plan = { restated: string; sub_questions: string[]; method_outline: string[] };
type MethodMatch = {
  recommendation: string;
  methods: Array<{ method: string; papers_in_set: number }>;
  tools: Array<{ slug: string; name: string; answers: string }>;
  degraded: boolean;
};
type CallLog = { retriever: string; call: string; ok: boolean; count: number; note?: string };
type Brief = {
  question: string;
  abstained: boolean;
  confidence: "high" | "medium" | "low";
  plan: Plan;
  method_match: MethodMatch;
  findings: Finding[];
  limitations: string[];
  sources: Source[];
  calls: CallLog[];
  provider: "local" | "anthropic";
  notes: string[];
};

const EXAMPLES = [
  "How does mitochondrial uncoupling affect lifespan?",
  "What is the evidence that structured (EZ) water exists at hydrophilic surfaces?",
  "Which funders dominate the global research economy, and at what scale?",
];

const KIND_LABEL: Record<Source["kind"], string> = {
  canon: "Bucket canon",
  openalex: "OpenAlex",
  pubmed: "PubMed",
  atlas: "research-atlas",
  methods: "MethodsMatcher",
};

export default function ResearchAgentClient() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [errStatus, setErrStatus] = useState<number | null>(null);

  async function run(q: string) {
    const qq = q.trim();
    if (qq.length < 8) return;
    setBusy(true);
    setBrief(null);
    setErrMsg("");
    setErrStatus(null);
    try {
      const r = await fetch("/api/research-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: qq }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setErrStatus(r.status);
        setErrMsg(e?.error ?? `request failed (${r.status})`);
        return;
      }
      setBrief((await r.json()) as Brief);
    } catch {
      setErrStatus(null);
      setErrMsg("Could not reach the research agent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(question);
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            research question
          </span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="How does mitochondrial uncoupling affect lifespan?"
            rows={3}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || question.trim().length < 8}
            className="font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "researching…" : "run the agent"}
          </button>
          {!busy && (
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setQuestion(ex);
                    void run(ex);
                  }}
                  className="text-[11px] px-3 py-1.5 border border-[color:var(--hairline)] text-[color:var(--basalt-2)] hover:border-[color:var(--gold)]"
                >
                  {ex.length > 42 ? ex.slice(0, 42) + "…" : ex}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      {busy && (
        <div className="mt-8 text-[14px] text-[color:var(--basalt-2)] flex items-center gap-3">
          <span className="inline-block w-3 h-3 rounded-full bg-[color:var(--gold)] animate-pulse" />
          Planning, retrieving, and synthesizing on the GPU… (this can take a
          minute — local inference is slow but free).
        </div>
      )}

      {errMsg &&
        (detectToolOffline(errStatus, errMsg) ? (
          <ToolOfflineNotice toolName="The research agent" />
        ) : (
          <div className="mt-8 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-5 text-[14px] text-[color:var(--basalt)]">
            <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
              could not complete
            </div>
            {errMsg}
          </div>
        ))}

      {brief && <BriefView brief={brief} />}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">{label}</div>
      {children}
    </div>
  );
}

function BriefView({ brief }: { brief: Brief }) {
  return (
    <div className="mt-10">
      {/* Header: abstain / confidence / provider */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] small-caps tracking-[0.12em]">
        {brief.abstained ? (
          <span className="px-2.5 py-1 border border-[color:var(--gold-deep,var(--basalt-3))] text-[color:var(--gold-deep,var(--basalt-3))]">
            abstained — grounding insufficient
          </span>
        ) : (
          <span className="px-2.5 py-1 border border-[color:var(--hairline)] text-[color:var(--basalt-2)]">
            confidence: {brief.confidence}
          </span>
        )}
        <span className="text-[color:var(--basalt-3)]">
          synthesized on: {brief.provider === "local" ? "founder GPU (local llama.cpp)" : "hosted fallback"}
        </span>
        <span className="text-[color:var(--basalt-3)]">{brief.sources.length} sources retrieved</span>
      </div>

      {/* PLAN */}
      <Section label="plan">
        <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6">
          <p className="text-[15px] text-[color:var(--basalt)] leading-[1.7]">{brief.plan.restated}</p>
          {brief.plan.sub_questions.length > 0 && (
            <ul className="mt-4 list-disc pl-5 text-[14px] text-[color:var(--basalt-2)] space-y-1">
              {brief.plan.sub_questions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {brief.plan.method_outline.length > 0 && (
            <ol className="mt-4 list-decimal pl-5 text-[13px] text-[color:var(--basalt-3)] space-y-1">
              {brief.plan.method_outline.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </div>
      </Section>

      {/* METHOD MATCH */}
      {(brief.method_match.recommendation || brief.method_match.tools.length > 0) && (
        <Section label={`instrument match${brief.method_match.degraded ? " · degraded" : ""}`}>
          <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6">
            <p className="text-[14px] text-[color:var(--basalt)] leading-[1.7]">
              {brief.method_match.recommendation}
            </p>
            {brief.method_match.tools.length > 0 && (
              <div className="mt-4 flex flex-col gap-px bg-[color:var(--hairline)]">
                {brief.method_match.tools.map((t) => (
                  <a
                    key={t.slug}
                    href={`/research/tools/${t.slug}`}
                    className="bg-[color:var(--bone)] p-4 hover:bg-[color:var(--bone-2,var(--bone))]"
                  >
                    <span className="font-display uppercase text-[15px] tracking-[0.04em] text-[color:var(--basalt)]">
                      {t.name}
                    </span>
                    <span className="block text-[13px] text-[color:var(--basalt-2)] mt-1">{t.answers}</span>
                  </a>
                ))}
              </div>
            )}
            {brief.method_match.methods.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {brief.method_match.methods.map((m, i) => (
                  <span
                    key={i}
                    className="text-[12px] px-3 py-1.5 bg-[color:var(--bone)] border border-[color:var(--hairline)] text-[color:var(--basalt-2)]"
                  >
                    {m.method} · {m.papers_in_set}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* FINDINGS */}
      {brief.findings.length > 0 ? (
        <Section label="findings — every claim cites a retrieved source">
          <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
            {brief.findings.map((f, i) => (
              <div key={i} className="bg-[color:var(--bone)] p-5">
                <p className="text-[15px] text-[color:var(--basalt)] leading-[1.75]">{f.statement}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {f.citations.map((c) => (
                    <a
                      key={c.id}
                      href={c.url || (c.doi ? `https://doi.org/${c.doi}` : undefined)}
                      target={c.url || c.doi ? "_blank" : undefined}
                      rel="noreferrer"
                      className="text-[11px] px-2.5 py-1 bg-[color:var(--bone)] border border-[color:var(--hairline)] text-[color:var(--aegean-deep)] hover:border-[color:var(--gold)]"
                      title={c.title}
                    >
                      {c.id}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section label="findings">
          <div className="border border-[color:var(--gold-deep,var(--basalt-3))] bg-[color:var(--bone)] p-6 text-[14px] text-[color:var(--basalt)] leading-[1.7]">
            The agent abstained — the retrieved evidence was not sufficient to
            make a cited claim. See the limitations below. This is the safe
            failure mode: it will not guess.
          </div>
        </Section>
      )}

      {/* LIMITATIONS */}
      {brief.limitations.length > 0 && (
        <Section label="limitations / abstentions">
          <ul className="list-disc pl-5 text-[14px] text-[color:var(--basalt-2)] space-y-1.5">
            {brief.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* SOURCES */}
      <Section label="sources retrieved (closed citation set)">
        <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
          {brief.sources.map((s) => (
            <div key={s.id} className="bg-[color:var(--bone)] p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[14px] text-[color:var(--basalt)] leading-[1.6]">
                  {s.url || s.doi ? (
                    <a
                      href={s.url || `https://doi.org/${s.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[color:var(--aegean-deep)]"
                    >
                      {s.title}
                    </a>
                  ) : (
                    s.title
                  )}
                </span>
                <span className="shrink-0 text-[10px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)]">
                  {KIND_LABEL[s.kind]}
                  {s.year ? ` · ${s.year}` : ""}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[color:var(--basalt-3)] font-mono break-all">{s.id}</div>
              {s.doi && <div className="mt-0.5 text-[11px] text-[color:var(--basalt-3)]">doi: {s.doi}</div>}
            </div>
          ))}
        </div>
      </Section>

      {/* REPRODUCIBILITY LEDGER */}
      <Section label="how to reproduce — the exact calls the agent made">
        <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-4 overflow-x-auto">
          <ol className="space-y-2">
            {brief.calls.map((c, i) => (
              <li key={i} className="text-[12px] font-mono text-[color:var(--basalt-2)] leading-[1.5]">
                <span className={c.ok ? "text-[color:var(--aegean-deep)]" : "text-[color:var(--gold-deep,var(--basalt-3))]"}>
                  {c.ok ? "ok" : "fail"}
                </span>{" "}
                [{c.retriever} · {c.count}] {c.call}
                {c.note ? `  — ${c.note}` : ""}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {brief.notes.length > 0 && (
        <Section label="agent notes">
          <ul className="list-disc pl-5 text-[12px] text-[color:var(--basalt-3)] space-y-1">
            {brief.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
