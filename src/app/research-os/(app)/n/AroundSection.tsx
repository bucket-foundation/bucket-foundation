"use client";

import Link from "next/link";
import Section from "./Section";
import type { Lite, NodeData } from "./types";
import { EDGE_LABEL, branchName } from "./types";

function NodeList({ items, empty }: { items: Lite[]; empty: string }) {
  if (items.length === 0) return <p className="text-[12px] text-[color:var(--basalt-3)]">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((n) => (
        <li key={n.id}>
          <Link href={`/research-os/n/${encodeURIComponent(n.slug)}`} className={"inline-block text-[12px] border px-2 py-1 rounded-sm hover:bg-[color:var(--bone-2)] " + (n.frontierFlag ? "border-[color:var(--gold-deep)]" : "border-[color:var(--hairline)]")}>
            {n.title}
            {n.branch && <span className="ml-1 text-[color:var(--basalt-3)]">· {branchName(n.branch)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Awareness, in place: what this node rests on, what rests on it, where it leads, and what it touches across branches. */
export default function AroundSection({ data }: { data: NodeData }) {
  const { prerequisites, dependents, related, directions } = data;
  const reach = directions.reach.reduce((a, b) => a + b, 0);
  return (
    <Section id="around" level="awareness" title="around" meta={reach ? `${reach} nodes within three steps` : undefined}>
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">rests on</h3>
          <NodeList items={prerequisites} empty="A root: nothing before it." />
        </div>
        <div>
          <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">unlocks</h3>
          <NodeList items={dependents} empty="Nothing rests on it yet." />
        </div>
        <div>
          <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">where it leads</h3>
          <NodeList items={directions.frontier} empty="No frontier reachable within three steps." />
        </div>
        <div>
          <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">open questions reachable</h3>
          <NodeList items={directions.openQuestions} empty="None flagged." />
        </div>
        <div className="md:col-span-2">
          <h3 className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">relations</h3>
          {related.length === 0 ? (
            <p className="text-[12px] text-[color:var(--basalt-3)]">No relations beyond prerequisites.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
              {related.map((r, i) => (
                <li key={i} className="py-1.5 text-[13px]">
                  {r.direction === "out" ? (
                    <>
                      <span className="text-[color:var(--basalt-3)]">this {EDGE_LABEL[r.kind] ?? r.kind} </span>
                      <Link href={`/research-os/n/${encodeURIComponent(r.node.slug)}`} className="text-[color:var(--basalt)] hover:underline underline-offset-4">{r.node.title}</Link>
                    </>
                  ) : (
                    <>
                      <Link href={`/research-os/n/${encodeURIComponent(r.node.slug)}`} className="text-[color:var(--basalt)] hover:underline underline-offset-4">{r.node.title}</Link>
                      <span className="text-[color:var(--basalt-3)]"> {EDGE_LABEL[r.kind] ?? r.kind} this</span>
                    </>
                  )}
                  {r.node.branch && r.node.branch !== data.node.branch && <span className="ml-2 text-[11px] small-caps text-[color:var(--gold-deep)]">across branches · {branchName(r.node.branch)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}
