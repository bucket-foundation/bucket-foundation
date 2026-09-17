"use client";

import Link from "next/link";
import { useState } from "react";
import Section from "./Section";
import ProduceForm, { type ProduceKind } from "./ProduceForm";
import type { NodeData, Quote } from "./types";
import { EDGE_LABEL } from "./types";
import { BTN_SECONDARY } from "@/components/ui";

const STATUS: Record<string, string> = { draft: "draft", submitted: "waiting on review", accepted: "accepted", returned: "returned" };
const VERB: { kind: ProduceKind; label: string; hint: string; needs?: string }[] = [
  { kind: "production", label: "produce on this", hint: "a new claim built from this node" },
  { kind: "extension", label: "extend this", hint: "carry the claim further", needs: "extend" },
  { kind: "replication", label: "replicate this", hint: "redo the study or derivation", needs: "replicate" },
  { kind: "peer_review", label: "review this", hint: "assess a production", needs: "review" },
];

/** Production, in place: what has been produced on this node, and the four ways to produce from it. */
export default function ProductionsSection({ data, quotes, onChanged }: { data: NodeData; quotes: Quote[]; onChanged: () => void }) {
  const [open, setOpen] = useState<ProduceKind | null>(null);
  const mine = data.productions;
  const acting = data.acting;
  const isProduction = ["production", "extension", "replication", "peer_review", "hypothesis"].includes(data.node.kind);

  return (
    <Section id="produce" level="production" title="produce" meta={`${mine.length} of yours · ${acting.length} on the graph`}>
      <div className="flex flex-col gap-4">
        {acting.length > 0 && (
          <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
            {acting.map((r, i) => (
              <li key={i} className="py-1.5 text-[13px]">
                <Link href={`/research-os/n/${encodeURIComponent(r.node.slug)}`} className="text-[color:var(--basalt)] hover:underline underline-offset-4">{r.node.title}</Link>
                <span className="text-[color:var(--basalt-3)]"> {EDGE_LABEL[r.kind] ?? r.kind} this</span>
              </li>
            ))}
          </ul>
        )}
        {mine.length > 0 && (
          <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
            {mine.map((p) => (
              <li key={p.id} className="py-1.5 text-[13px] flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[color:var(--basalt)]">{p.claim?.trim() || `Untitled ${p.kind.replace("_", " ")}`}</span>
                <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)]">
                  {p.kind.replace("_", " ")} · {STATUS[p.status] ?? p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!data.signedIn ? (
          <p className="text-[12px] text-[color:var(--basalt-3)]">Sign in to produce.</p>
        ) : open ? (
          <ProduceForm kind={open} targetId={data.node.id} relatedId={open === "production" ? null : data.node.id} relatedTitle={data.node.title} quotes={quotes} onDone={() => { setOpen(null); onChanged(); }} onCancel={() => setOpen(null)} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {VERB.filter((v) => v.kind !== "peer_review" || isProduction).map((v) => {
              const allowed = !v.needs || data.verbs[v.needs] !== false;
              return (
                <button key={v.kind} type="button" title={v.hint} disabled={!allowed} onClick={() => setOpen(v.kind)} className={BTN_SECONDARY + " disabled:opacity-50"}>
                  {v.label}
                </button>
              );
            })}
            <Link href="/research-os/productions" className="inline-flex items-center px-2 text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)]">
              all your productions
            </Link>
          </div>
        )}
      </div>
    </Section>
  );
}
