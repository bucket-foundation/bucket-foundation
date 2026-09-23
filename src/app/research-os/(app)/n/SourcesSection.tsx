"use client";

import { OUTAGE_COPY, isTransientOutage } from "@/lib/research-os/outage";
import { useState } from "react";
import Section from "./Section";
import type { NodeData, Quote } from "./types";
import { BTN_PRIMARY } from "@/components/ui";

interface QuoteResponse {
  kind: "quote" | "summary";
  quotable_span: string | null;
  locator: string | null;
  citation: string;
  source: { author?: string; year?: number; title?: string; publisher?: string; doi?: string; url?: string; license?: string };
}

export default function SourcesSection({ data, quotes, onQuote, onChanged }: { data: NodeData; quotes: Quote[]; onQuote: (q: Quote) => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [got, setGot] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const p = data.node.provenance ?? {};
  const line =
    p.type === "source_excerpt" || p.type === "canon_claim"
      ? [typeof p.video === "string" ? `From "${p.video}"` : null, typeof p.timestamp === "string" ? `at ${p.timestamp}` : null, typeof p.concept === "string" ? `concept: ${String(p.concept).replace(/-/g, " ")}` : null].filter(Boolean).join(" · ")
      : p.type === "canon_figure"
        ? [typeof p.lifespan === "string" ? p.lifespan : null, Array.isArray(p.works) ? `${(p.works as { title: string }[]).length} primary works` : null].filter(Boolean).join(" · ")
        : p.type === "canon_site"
          ? [typeof p.year === "number" ? (p.year < 0 ? `${-p.year} BCE` : `${p.year} CE`) : null, typeof p.lat === "number" ? `${p.lat}, ${p.lng}` : null].filter(Boolean).join(" · ")
          : [p.author, p.year, p.title, p.publisher].filter(Boolean).join(" · ");
  const url = typeof p.url === "string" ? p.url : typeof p.wikipedia === "string" ? p.wikipedia : null;

  async function quote() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/research-os/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "quote", nodeId: data.node.id }) });
      const j = (await res.json().catch(() => ({}))) as QuoteResponse & { error?: string; message?: string };
      if (!res.ok) {
        setError(isTransientOutage(res.status, j.error ?? null) ? OUTAGE_COPY.body : (j.message ?? j.error ?? "Could not quote."));
        return;
      }
      setGot(j);
      onQuote({ quotable_span: j.quotable_span, citation: j.citation, locator: j.locator });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section id="sources" level="awareness" title="sources" meta={quotes.length ? `${quotes.length} quoted` : undefined}>
      <div className="flex flex-col gap-3">
        {line ? <p className="text-[13px] text-[color:var(--basalt-2)]">{line}</p> : <p className="text-[13px] text-[color:var(--basalt-3)]">No provenance recorded on this node.</p>}
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="text-[12px] underline underline-offset-4 text-[color:var(--aegean-deep)] break-all">
            {url}
          </a>
        )}
        {typeof p.doi === "string" && <span className="text-[12px] font-mono text-[color:var(--basalt-3)]">doi {p.doi}</span>}
        {!data.signedIn ? (
          <p className="text-[12px] text-[color:var(--basalt-3)]">Sign in to quote.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy} onClick={() => void quote()} className={BTN_PRIMARY}>
              {busy ? "quoting" : "quote this source"}
            </button>
            <span className="text-[12px] text-[color:var(--basalt-3)]">A quote with a locator is the evidence Check and Produce read.</span>
          </div>
        )}
        {error && <p className="text-[12px] text-[color:var(--crimson)]">{error}</p>}
        {got && (
          <blockquote className="border-l-2 border-[color:var(--gold)] pl-4 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
            {got.quotable_span}
            <footer className="mt-1 text-[12px] text-[color:var(--basalt-3)]">
              {got.citation}
              {got.locator ? ` · ${got.locator}` : " · summary, no locator"}
            </footer>
          </blockquote>
        )}
        {quotes.length > 0 && !got && (
          <ul className="text-[12px] text-[color:var(--basalt-3)]">
            {quotes.map((q, i) => (
              <li key={i}>{q.citation}</li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
