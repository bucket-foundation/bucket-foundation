"use client";

// CitationGraph client island, local citation neighborhood + degree centrality
// from the live OpenAlex graph. Render is "json" → typed view.

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Node = {
  id: string;
  title: string;
  year: number | null;
  venue: string;
  cited_by_count: number;
  url: string;
  role: string;
  centrality: number;
};
type CGOutput = {
  input: string;
  resolved_as: string;
  degraded?: boolean;
  message?: string;
  seed?: {
    id: string;
    title: string;
    year: number | null;
    venue: string;
    cited_by_count: number;
    url: string;
    n_references: number;
  };
  neighborhood?: {
    n_nodes: number;
    n_edges: number;
    n_references_fetched: number;
    n_citations_fetched: number;
  };
  key_related_works: Node[];
  most_central: Node[];
  note?: string;
};

export default function CitationGraphClient() {
  const [paper, setPaper] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("citationgraph");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paper: paper.trim(), limit: 18 }),
      },
      "Building the citation neighborhood…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            DOI · OpenAlex ID · or paper title
          </span>
          <input
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            placeholder="10.1038/nature12373  ·  W2755950973  ·  proton coupled electron transfer in photosystem II"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy || paper.trim().length < 4}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "building…" : "build neighborhood"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <CGView result={result} />}
    </div>
  );
}

function NodeRow({ n }: { n: Node }) {
  return (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="flex items-start justify-between gap-4">
        <a
          href={n.url}
          target="_blank"
          rel="noreferrer"
          className="text-[15px] font-display leading-[1.4] text-[color:var(--basalt)] hover:text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
        >
          {n.title || n.id}
        </a>
        <span className="shrink-0 text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
          centrality {n.centrality.toFixed(2)}
        </span>
      </div>
      <div className="mt-1 text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
        {[n.role, n.venue, n.year, `${n.cited_by_count} cites`].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}

function CGView({ result }: { result: ResultEnvelope }) {
  const out = result.output as CGOutput;

  if (!out.seed) {
    return (
      <div className="mt-10 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
          could not resolve
        </div>
        <p className="text-[14px] text-[color:var(--basalt-2)]">{out.message}</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
          seed paper · resolved as {out.resolved_as}
          {out.degraded ? " · degraded" : ""}
        </div>
        <a
          href={out.seed.url}
          target="_blank"
          rel="noreferrer"
          className="text-[18px] font-display leading-[1.4] text-[color:var(--basalt)] hover:text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
        >
          {out.seed.title}
        </a>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
          {[out.seed.venue, out.seed.year, `${out.seed.cited_by_count} cites`]
            .filter(Boolean)
            .map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          {out.neighborhood && (
            <>
              <span>{out.neighborhood.n_nodes} nodes</span>
              <span>{out.neighborhood.n_edges} edges</span>
            </>
          )}
        </div>
      </div>

      {out.most_central.length > 0 && (
        <>
          <div className="mt-6 small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] mb-3">
            most central
          </div>
          <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
            {out.most_central.map((n) => (
              <NodeRow key={n.id} n={n} />
            ))}
          </div>
        </>
      )}

      {out.key_related_works.length > 0 && (
        <>
          <div className="mt-8 small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] mb-3">
            key related works
          </div>
          <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
            {out.key_related_works.map((n) => (
              <NodeRow key={n.id} n={n} />
            ))}
          </div>
        </>
      )}

      {out.note && (
        <p className="mt-6 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">{out.note}</p>
      )}

      <PublishToCanon result={result} />
    </div>
  );
}
