"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BTN_PRIMARY, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "@/components/ui";

interface Production {
  id: string;
  kind: string;
  status: "draft" | "submitted" | "accepted" | "returned";
  claim: string | null;
  target_node_id: string;
  related_node_id: string | null;
  node_id: string | null;
  notes: { at: string; decision?: string; reason?: string | null }[] | null;
  updated_at: string;
}
interface Data {
  productions: Production[];
  nodes: Record<string, { slug: string; title: string; kind: string }>;
}

const STATUS: Record<Production["status"], string> = { draft: "draft", submitted: "waiting on review", accepted: "accepted", returned: "returned" };
const KIND: Record<string, string> = { production: "production", extension: "extension", replication: "replication", peer_review: "peer review" };
const ORDER: Production["status"][] = ["returned", "submitted", "draft", "accepted"];

/** Everything the person has produced: what it is, what it acts on, where it stands, and the node it became. */
export default function ProductionsList() {
  const [data, setData] = useState<Data | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/research-os/production", { cache: "no-store" })
      .then(async (r) => {
        if (!alive) return;
        setStatus(r.status);
        if (r.ok) setData((await r.json()) as Data);
      })
      .catch(() => alive && setStatus(0));
    return () => {
      alive = false;
    };
  }, []);

  const groups = ORDER.map((st) => ({ st, rows: (data?.productions ?? []).filter((p) => p.status === st) })).filter((g) => g.rows.length > 0);
  const title = (id: string | null) => (id && data?.nodes[id]?.title) || "a node";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Research OS · production"
        title="your productions"
        lede="A production is a claim you organized from quotes and sources. Submitted, it waits on a teacher; accepted, it becomes a node on the graph with your name on it, and others can cite, extend, replicate, or review it."
        actions={
          <Link href="/research-os/workspace#production" className={BTN_PRIMARY}>
            produce
          </Link>
        }
      />
      {status === null ? (
        <LoadingState />
      ) : status === 503 ? (
        <ErrorState title="Research OS is unavailable on this deployment" />
      ) : !data ? (
        <ErrorState body="Could not load your productions." />
      ) : data.productions.length === 0 ? (
        <EmptyState title="Nothing produced yet" body="Work a target in the workspace, organize what you found, and save a draft." action={{ href: "/research-os/workspace", label: "open the workspace" }} />
      ) : (
        groups.map((g) => (
          <Panel key={g.st} title={STATUS[g.st]} meta={`${g.rows.length}`}>
            <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
              {g.rows.map((p) => {
                const last = p.notes?.length ? p.notes[p.notes.length - 1] : null;
                return (
                  <li key={p.id} className="py-3 flex flex-col gap-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-[14px] text-[color:var(--basalt)]">{p.claim?.trim() || `Untitled ${KIND[p.kind] ?? p.kind}`}</div>
                      <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)]">{KIND[p.kind] ?? p.kind}</span>
                    </div>
                    <div className="text-[12px] text-[color:var(--basalt-3)]">
                      {p.kind === "production" ? "on " : `${KIND[p.kind]} of `}
                      <Link href={`/research-os/n/${encodeURIComponent(data.nodes[p.kind === "production" ? p.target_node_id : p.related_node_id ?? p.target_node_id]?.slug ?? "")}`} className="underline underline-offset-4 hover:text-[color:var(--basalt)]">
                        {title(p.kind === "production" ? p.target_node_id : p.related_node_id ?? p.target_node_id)}
                      </Link>
                      {" · "}
                      {new Date(p.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {p.node_id && data.nodes[p.node_id] && (
                        <>
                          {" · now the node "}
                          <Link href={`/research-os/n/${encodeURIComponent(data.nodes[p.node_id].slug)}`} className="underline underline-offset-4 text-[color:var(--gold-deep)]">
                            {data.nodes[p.node_id].title}
                          </Link>
                        </>
                      )}
                    </div>
                    {g.st === "returned" && last?.reason && <p className="text-[12px] text-[color:var(--basalt-2)]">Reviewer: {last.reason}</p>}
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))
      )}
    </div>
  );
}
