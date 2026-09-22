"use client";

import { OUTAGE_COPY, UNCONFIGURED_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ErrorState, LoadingState, StageChip } from "@/components/ui";
import type { NodeData, Quote } from "./types";
import { KIND_LABEL, branchName } from "./types";
import LearnSection from "./LearnSection";
import SourcesSection from "./SourcesSection";
import CheckSection from "./CheckSection";
import TransferSection from "./TransferSection";
import AroundSection from "./AroundSection";
import MakeupSection from "./MakeupSection";
import ProductionsSection from "./ProductionsSection";
import ClassSection from "./ClassSection";
import AccessBlock from "../workspace/AccessBlock";
import Section from "./Section";
import { useSession } from "@/providers/SessionProvider";
import { isIdeaNode } from "@/lib/research-os/idea";

const SECTIONS: { id: string; label: string; level: string }[] = [
  { id: "learn", label: "Learn", level: "understanding" },
  { id: "sources", label: "Sources", level: "awareness" },
  { id: "check", label: "Check", level: "understanding" },
  { id: "transfer", label: "Transfer", level: "internalization" },
  { id: "around", label: "Around", level: "awareness" },
  { id: "makeup", label: "Made of", level: "understanding" },
  { id: "produce", label: "Produce", level: "production" },
  { id: "class", label: "Class", level: "" },
  { id: "access", label: "Access", level: "access" },
];

const EVIDENCE_LABEL: Record<string, string> = {
  open: "opened it", quote: "quoted a source", check: "checked an explanation", academy_mastery: "mastered it in Learn", transfer_item: "answered a transfer prompt",
  corroboration: "corroborated two sources", production_submitted: "submitted a production", production_returned: "had a production returned", teacher_review: "a teacher reviewed",
  explanation: "wrote an explanation",
};

/** The node page: one node, the person's standing on it, and every verb of the five levels in place. */
export default function NodeView({ slug }: { slug: string }) {
  const { accessToken } = useSession();
  const [data, setData] = useState<NodeData | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/research-os/node?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      // The code is read before any setState, so no render happens
      // with the status set and the code still null, which showed
      // one frame of the permanent copy for a passing outage.
      const outageCode = res.ok ? null : await readErrorCode(res);
      setErrorCode(outageCode);
      setStatus(res.status);
        if (!res.ok) setErrorCode(await readErrorCode(res));
      if (res.ok) setData((await res.json()) as NodeData);
    } catch {
      setStatus(0);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === null) return <LoadingState label="Opening the node" />;
  if (status === 404) return <ErrorState title="No such node" body="It may be private, or the slug may have changed." />;
  if (isTransientOutage(status, errorCode)) return <ErrorState title={OUTAGE_COPY.title} body={OUTAGE_COPY.body} retry={() => location.reload()} />;
  if (status === 503) return <ErrorState title={UNCONFIGURED_COPY.title} body={UNCONFIGURED_COPY.body} />;
  if (!data) return <ErrorState body="Could not open the node." retry={() => void load()} />;

  const { node, standing } = data;
  // "Made of" is for ideas on the public graph, the nodes the decomposition covers.
  const provenanceType = typeof node.provenance?.type === "string" ? node.provenance.type : null;
  const showMakeup = node.visibility === "public" && isIdeaNode({ kind: node.kind, provenanceType });
  const last = standing.evidence.length ? standing.evidence[standing.evidence.length - 1] : null;
  const raisedBy = last ? `${EVIDENCE_LABEL[String(last.kind)] ?? String(last.kind)}${last.at ? ` · ${new Date(String(last.at)).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}` : null;

  return (
    <div className="flex flex-col gap-6">
      <nav className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] flex flex-wrap gap-x-2">
        <Link href="/research-os/map" className="hover:underline underline-offset-4">map</Link>
        <span aria-hidden>/</span>
        <Link href={`/research-os/map?branch=${encodeURIComponent(node.branch)}`} className="hover:underline underline-offset-4">{branchName(node.branch)}</Link>
        <span aria-hidden>/</span>
        <span className="text-[color:var(--basalt-3)]">tier {node.tier}</span>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="small-caps tracking-[0.14em] px-2 py-0.5 border border-[color:var(--hairline)] rounded-sm text-[color:var(--basalt-2)]">{KIND_LABEL[node.kind] ?? node.kind}</span>
          {node.frontierFlag && <span className="small-caps tracking-[0.14em] px-2 py-0.5 border border-[color:var(--gold-deep)] rounded-sm text-[color:var(--gold-deep)]">{node.frontierFlag.replace("_", " ")}</span>}
          {node.visibility !== "public" && <span className="small-caps tracking-[0.14em] px-2 py-0.5 border border-[color:var(--hairline)] rounded-sm text-[color:var(--basalt-3)]">{node.visibility}</span>}
          {node.isOwner && <span className="small-caps tracking-[0.14em] text-[color:var(--gold-deep)]">yours</span>}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] chisel text-[color:var(--basalt)] [text-wrap:balance]">{node.title}</h1>
        {node.summary && <p className="text-[15px] leading-[1.7] text-[color:var(--basalt-2)] max-w-[68ch]">{node.summary}</p>}
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-[color:var(--basalt-3)]">
          {data.signedIn ? (
            <>
              <span>your standing</span>
              <StageChip stage={standing.stage} />
              {raisedBy && <span>raised by: {raisedBy}</span>}
            </>
          ) : (
            <span>Sign in to hold a standing on this node.</span>
          )}
        </div>
      </header>

      <nav aria-label="Verbs" className="sticky top-[58px] z-20 -mx-4 md:mx-0 px-4 md:px-0 bg-[color:var(--bone)]/90 backdrop-blur-[2px] border-y border-[color:var(--hairline)]">
        <div className="flex gap-1 overflow-x-auto">
          {SECTIONS.filter((s) => s.id !== "makeup" || showMakeup).map((s) => (
            <a key={s.id} href={`#${s.id}`} className="small-caps text-[10px] tracking-[0.18em] px-3 py-3 whitespace-nowrap text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)] border-b-2 border-transparent hover:border-[color:var(--gold)]">
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <LearnSection data={data} />
      <SourcesSection data={data} quotes={quotes} onQuote={(q) => setQuotes((prev) => (prev.some((p) => p.citation === q.citation && p.quotable_span === q.quotable_span) ? prev : [...prev, q]))} onChanged={load} />
      <CheckSection data={data} quotes={quotes} onChanged={load} />
      <TransferSection data={data} onChanged={load} />
      <AroundSection data={data} />
      {showMakeup && <MakeupSection slug={node.slug} branch={node.branch} />}
      <ProductionsSection data={data} quotes={quotes} onChanged={load} />
      <ClassSection data={data} onChanged={load} />
      <Section id="access" level="access" title="access" meta={node.visibility}>
        <AccessBlock nodeId={node.id} token={accessToken} />
      </Section>
    </div>
  );
}
