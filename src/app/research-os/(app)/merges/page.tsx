"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Side = { slug: string; title: string; branch: string | null; kind: string; tier: number; edges: number };
type Proposal = { id: string; reason: string; similarity: number; evidence: string; keep: Side; drop: Side };
type Decision = "merge" | "merge_swapped" | "reject";

const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const BTN = "px-3 py-2 min-h-[44px] text-[12px] small-caps tracking-[0.12em] border";
const REASON: Record<string, string> = {
  verifier_duplicate: "the verifier called them one concept",
  same_title: "same title",
  near_title: "near titles",
};

function SideCard({ s, role }: { s: Side; role: string }) {
  return (
    <div className="border border-[color:var(--hairline)] p-3 text-[13px] text-[color:var(--basalt-2)]">
      <div className={LABEL}>{role}</div>
      <Link href={`/research-os/n/${encodeURIComponent(s.slug)}`} className="mt-1 block text-[15px] text-[color:var(--basalt)] hover:underline underline-offset-4">
        {s.title}
      </Link>
      <div className="mt-1 text-[12px] text-[color:var(--basalt-3)]">
        {[s.branch, s.kind, `grade tier ${s.tier}`, `${s.edges} ${s.edges === 1 ? "edge" : "edges"}`].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}

/**
 * ros-graph-dedup's review queue: nodes that name one concept, found by
 * scripts/research-os/find-duplicates.ts. Merging moves every edge of the
 * dropped node to the kept one and supersedes it, so both branches' links
 * survive on one node.
 */
export default function MergesPage() {
  const [items, setItems] = useState<Proposal[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "no_graph" | "failed">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/research-os/merges", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { proposals?: Proposal[]; error?: string };
      if (res.status === 403) return setState("forbidden");
      if (res.status === 503 && data.error === "research_os_unavailable") return setState("no_graph");
      if (!res.ok || !Array.isArray(data.proposals)) return setState("failed");
      setItems(data.proposals);
      setState("ready");
    } catch {
      setState("failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(p: Proposal, decision: Decision) {
    setBusy(p.id);
    setNotice(null);
    try {
      const res = await fetch("/api/research-os/merges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: p.id, decision }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; warning?: string; alreadyDecided?: boolean; moved?: { tiers_raised?: number } | null };
      if (!res.ok) {
        setNotice(data.error === "node_gone" ? "One of the two nodes has changed since this pair was queued. Refresh the list." : `That did not save (${data.error ?? res.status}). Try again.`);
        return;
      }
      setItems((list) => (list ?? []).filter((x) => x.id !== p.id));
      const [keep, drop] = decision === "merge_swapped" ? [p.drop, p.keep] : [p.keep, p.drop];
      const raised = data.moved?.tiers_raised ?? 0;
      setNotice(
        data.alreadyDecided
          ? "Someone decided this pair already."
          : decision === "reject"
            ? `Kept both: ${p.keep.title} and ${p.drop.title}.`
            : `Merged ${drop.title} (${drop.branch}) into ${keep.title} (${keep.branch}).${raised > 0 ? ` Grade tier raised on ${raised} ${raised === 1 ? "idea" : "ideas"}.` : ""}${data.warning ? ` Warning: ${data.warning}.` : ""}`,
      );
    } catch {
      setNotice("No connection. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1000px]">
      <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">Duplicates</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--basalt-2)] max-w-[70ch]">
        Nodes that may name one concept in two places. Merging moves every edge of one onto the other and supersedes it, so the links from both branches stay on one node.
      </p>
      {notice && (
        <p role="status" className="mt-4 text-[13px] text-[color:var(--basalt)] border-l-2 border-[color:var(--gold)] pl-3">
          {notice}
        </p>
      )}

      {state === "loading" && <p className="mt-6 text-[13px] text-[color:var(--basalt-3)]">Loading the queue.</p>}
      {state === "forbidden" && <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">The duplicate queue is for graph reviewers.</p>}
      {state === "no_graph" && <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">This deployment has no graph connected, so there is nothing to merge here.</p>}
      {state === "failed" && (
        <p role="alert" className="mt-6 text-[13px] text-[color:var(--gold-deep)]">
          The queue did not load this minute.{" "}
          <button type="button" onClick={() => void load()} className="underline underline-offset-4">
            Try again
          </button>
          .
        </p>
      )}
      {state === "ready" && items && items.length === 0 && (
        <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">No pairs waiting. Run scripts/research-os/find-duplicates.ts --apply to look again.</p>
      )}

      {state === "ready" && items && items.length > 0 && (
        <ul className="mt-6 space-y-6">
          {items.map((p) => (
            <li key={p.id} className="border-t border-[color:var(--hairline)] pt-4">
              <div className="flex flex-wrap items-baseline gap-x-3 text-[12px]">
                <span className="small-caps tracking-[0.12em] text-[color:var(--gold-deep)]">{REASON[p.reason] ?? p.reason}</span>
                <span className="text-[color:var(--basalt-3)]">similarity {p.similarity.toFixed(2)}</span>
              </div>
              <p className="mt-1 text-[13px] text-[color:var(--basalt-2)] max-w-[75ch]">{p.evidence}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <SideCard s={p.keep} role="suggested keeper" />
                <SideCard s={p.drop} role="the other" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy === p.id} onClick={() => void decide(p, "merge")} className={`${BTN} border-[color:var(--gold-deep)] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50`}>
                  merge, keep the suggested keeper
                </button>
                <button type="button" disabled={busy === p.id} onClick={() => void decide(p, "merge_swapped")} className={`${BTN} border-[color:var(--hairline)] text-[color:var(--basalt-2)] disabled:opacity-50`}>
                  merge, keep the other
                </button>
                <button type="button" disabled={busy === p.id} onClick={() => void decide(p, "reject")} className={`${BTN} border-[color:var(--hairline)] text-[color:var(--basalt-2)] disabled:opacity-50`}>
                  keep both
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
