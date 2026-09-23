"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isTransientOutage } from "@/lib/research-os/outage";

type Item = {
  id: string;
  node: { slug: string | null; title: string; branch: string | null; summary: string | null };
  prime: { id: string; label: string; category: string; english: string[]; sense: string | null };
};
type Decision = "approved" | "rejected";

const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const BTN = "px-3 py-2 min-h-[44px] text-[12px] small-caps tracking-[0.12em] border";

export default function NsmReviewPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "no_graph" | "failed">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/research-os/nsm/links", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { proposals?: Item[]; error?: string };
      if (res.status === 403) return setState("forbidden");
      if (isTransientOutage(res.status, data.error ?? null)) return setState("failed");
      if (res.status === 503) return setState("no_graph");
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

  async function decide(item: Item, decision: Decision) {
    setBusy(item.id);
    setNotice(null);
    try {
      const res = await fetch("/api/research-os/nsm/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, decision, reason: reasons[item.id] || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; alreadyDecided?: boolean };
      if (isTransientOutage(res.status, data.error ?? null)) {
        setNotice("The graph is busy this minute, so nothing was saved. Try again.");
        return;
      }
      if (!res.ok) {
        setNotice(`That did not save (${data.error ?? res.status}). Try again.`);
        return;
      }
      setItems((list) => (list ?? []).filter((x) => x.id !== item.id));
      setNotice(
        data.alreadyDecided
          ? "Someone decided this link already."
          : `${decision === "approved" ? "Approved" : "Rejected"}: ${item.node.title} uses ${item.prime.label}.`,
      );
    } catch {
      setNotice("No connection. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1000px]">
      <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">Semantic links</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--basalt-2)] max-w-[70ch]">
        Each row proposes that a science prime uses one of the 65 NSM semantic primes. Approve it when the idea cannot be defined without that meaning. Approved links will show on the node and on the semantic primes page; nothing shows before a reviewer approves it.
      </p>
      <p className="mt-2 text-[12px] text-[color:var(--basalt-3)] max-w-[70ch]">
        The queue mixes in pairs drawn at random. No row shows where it came from, why it was proposed, or its similarity score, so judge each pair on the idea and the prime alone.
      </p>
      {notice && (
        <p role="status" className="mt-4 text-[13px] text-[color:var(--basalt)] border-l-2 border-[color:var(--gold)] pl-3">
          {notice}
        </p>
      )}

      {state === "loading" && <p className="mt-6 text-[13px] text-[color:var(--basalt-3)]">Loading the queue.</p>}
      {state === "forbidden" && <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">The semantic link queue is for graph reviewers.</p>}
      {state === "no_graph" && <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">This deployment has no graph connected, so there is nothing to review here.</p>}
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
        <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">No links waiting. Run scripts/research-os/nsm-links.ts --apply to propose more.</p>
      )}

      {state === "ready" && items && items.length > 0 && (
        <ul className="mt-6 space-y-6">
          {items.map((item) => (
            <li key={item.id} className="border-t border-[color:var(--hairline)] pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="border border-[color:var(--hairline)] p-3 text-[13px] text-[color:var(--basalt-2)]">
                  <div className={LABEL}>science prime</div>
                  {item.node.slug ? (
                    <Link href={`/research-os/n/${encodeURIComponent(item.node.slug)}`} className="mt-1 block text-[15px] text-[color:var(--basalt)] hover:underline underline-offset-4">
                      {item.node.title}
                    </Link>
                  ) : (
                    <div className="mt-1 text-[15px] text-[color:var(--basalt)]">{item.node.title}</div>
                  )}
                  {item.node.branch && <div className="mt-1 text-[12px] text-[color:var(--basalt-3)]">{item.node.branch}</div>}
                  {item.node.summary && <p className="mt-2 text-[12px] leading-relaxed">{item.node.summary}</p>}
                </div>
                <div className="border border-[color:var(--hairline)] p-3 text-[13px] text-[color:var(--basalt-2)]">
                  <div className={LABEL}>{item.prime.category}</div>
                  <div className="mt-1 font-display text-[15px] text-[color:var(--basalt)]">{item.prime.label}</div>
                  <div className="mt-1 text-[12px] text-[color:var(--basalt-3)]">
                    {item.prime.english.join(", ")}
                    {item.prime.sense ? ` · “${item.prime.sense}”` : ""}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="flex-1 min-w-[220px]">
                  <span className="sr-only">Reason</span>
                  <input
                    type="text"
                    maxLength={600}
                    placeholder="Reason, optional"
                    value={reasons[item.id] ?? ""}
                    onChange={(e) => setReasons((r) => ({ ...r, [item.id]: e.target.value }))}
                    className="w-full border border-[color:var(--hairline)] bg-transparent px-2 py-2 text-[13px]"
                  />
                </label>
                <button type="button" disabled={busy === item.id} onClick={() => void decide(item, "approved")} className={`${BTN} border-[color:var(--gold)] text-[color:var(--basalt)]`}>
                  Approve
                </button>
                <button type="button" disabled={busy === item.id} onClick={() => void decide(item, "rejected")} className={`${BTN} border-[color:var(--hairline)] text-[color:var(--basalt-2)]`}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
