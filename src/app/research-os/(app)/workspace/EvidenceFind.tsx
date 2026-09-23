"use client";

import { OUTAGE_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isSearchResponse, MAX_CARDS, type EvidenceCard, type EvidenceSearchResponse } from "@/lib/research-os/evidence-search/types";

export interface EvidenceFindProps {
  token: string | null;
  branch: string;
  targetNodeId: string | null;
}

type Phase = "idle" | "searching" | "done" | "error";

export default function EvidenceFind({ token, branch, targetNodeId }: EvidenceFindProps) {
  const [available, setAvailable] = useState<{ corpusRevision: string; sources: number } | null>(null);
  const [probeFailed, setProbeFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<EvidenceSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    void (async () => {
      try {
        const res = await fetch("/api/research-os/evidence-search", { headers: { authorization: `Bearer ${token}` } });
        if (!live) return;
        if (!res.ok) {
          if (isTransientOutage(res.status, await readErrorCode(res))) setProbeFailed(true);
          return;
        }
        setProbeFailed(false);
        const body = (await res.json()) as { available?: boolean; corpusRevision?: string; sources?: number };
        if (body.available && typeof body.corpusRevision === "string") setAvailable({ corpusRevision: body.corpusRevision, sources: body.sources ?? 0 });
      } catch {
      }
    })();
    return () => {
      live = false;
    };
  }, [token]);

  useEffect(() => {
    inFlight.current?.abort();
    seq.current += 1;
    setResult(null);
    setError(null);
    setPhase("idle");
  }, [branch, targetNodeId]);

  const run = useCallback(async () => {
    if (!token || !query.trim()) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const mine = ++seq.current;
    setPhase("searching");
    setError(null);
    try {
      const res = await fetch("/api/research-os/evidence-search", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ schemaVersion: 1, query: query.trim(), branch, targetNodeId, limit: MAX_CARDS }),
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      if (mine !== seq.current) return;
      if (!res.ok) {
        const code = (body as { error?: string })?.error ?? null;
        const message = (body as { message?: string })?.message;
        setResult(null);
        setError(isTransientOutage(res.status, code) ? OUTAGE_COPY.body : message || `The search answered ${res.status}.`);
        setPhase("error");
        return;
      }
      if (!isSearchResponse(body)) {
        setResult(null);
        setError("The search answered in a shape this page does not know.");
        setPhase("error");
        return;
      }
      setResult(body);
      setPhase("done");
    } catch (e) {
      if (controller.signal.aborted || mine !== seq.current) return;
      setResult(null);
      setError(e instanceof Error ? e.message : "The search could not be reached.");
      setPhase("error");
    }
  }, [token, query, branch, targetNodeId]);

  if (!available) {
    return probeFailed ? (
      <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
        {OUTAGE_COPY.body}
      </p>
    ) : null;
  }

  const cards: EvidenceCard[] = result?.cards ?? [];
  const announcement =
    phase === "searching"
      ? "Searching public evidence."
      : phase === "error"
        ? `Search failed. ${error ?? ""}`
        : result
          ? result.cards.length === 0
            ? "No admitted source matched."
            : `${result.cards.length} sources, ${result.mode === "hybrid" ? "by meaning and keyword" : "by keyword"}.`
          : "";

  return (
    <div className="mt-4 border-t border-[color:var(--hairline)] pt-3">
      <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">public evidence</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="mt-1"
      >
        <label htmlFor="evidence-query" className="sr-only">
          Search admitted public sources
        </label>
        <input
          id="evidence-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ask in your own words…"
          className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60"
        />
        <button type="submit" disabled={!query.trim() || phase === "searching"} className="mt-2 text-[12px] small-caps underline disabled:no-underline disabled:opacity-60">
          {phase === "searching" ? "searching…" : "search sources"}
        </button>
      </form>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {phase === "error" && <p className="mt-2 text-[12px] text-[color:var(--basalt-2)]">{error}</p>}
      {phase === "done" && result && result.mode === "lexical" && (
        <p className="mt-2 text-[11px] text-[color:var(--basalt-3)]">Keyword search is in use: the meaning search is unavailable right now.</p>
      )}
      {phase === "done" && cards.length === 0 && <p className="mt-2 text-[12px] text-[color:var(--basalt-2)]">No admitted source matched that.</p>}

      <ul className="mt-2 flex flex-col gap-3">
        {cards.map((c) => (
          <li key={c.sourceId} className="text-[12px] text-[color:var(--basalt-2)]">
            <div className="flex items-baseline gap-2">
              <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">{c.kind}</span>
              <span className="text-[13px] text-[color:var(--basalt)]">{c.title}</span>
            </div>
            <p className="mt-0.5">
              {c.kind === "passage" ? <>&ldquo;{c.excerpt}&rdquo;</> : c.excerpt}
            </p>
            <div className="mt-0.5 text-[11px] text-[color:var(--basalt-3)]">
              {c.locator ? `${c.citation.replace(/\.\s*$/, "")}, ${c.locator}` : c.citation}
            </div>
            <div className="mt-1 flex items-center gap-3">
              <Link href={`/research-os/n/${c.slug}`} className="underline underline-offset-4">
                open source
              </Link>
              {c.quoteAvailable && <span className="text-[11px] text-[color:var(--basalt-3)]">quotable from its page</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
