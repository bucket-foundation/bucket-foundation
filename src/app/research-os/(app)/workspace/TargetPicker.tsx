"use client";

import { OUTAGE_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BTN_SECONDARY, LoadingState, PageHeader, Panel, STAGE_LABEL } from "@/components/ui";
import type { LearnerAssignment } from "@/lib/research-os/class-db";
import { targetIsLinkable } from "@/lib/research-os/assignments";

interface Hit {
  id: string;
  slug: string;
  title: string;
  kind: string;
  branch: string;
  summary: string | null;
  stage: string | null;
}
// The server type, so a change to what /assignments returns is a compile
// error here rather than a blank link on the page (Bucket critic C40).
type Assignment = LearnerAssignment;

/** The workspace with no target: pick any node on the graph to work toward. */
export default function TargetPicker() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // "outage" is a read a retry may clear; "unavailable" is one it will
  // not. The rule was asked and its answer thrown away here, so both
  // rendered the same dead end.
  const [assignments, setAssignments] = useState<Assignment[] | "unavailable" | "outage" | null>(null);

  useEffect(() => {
    fetch("/api/research-os/assignments?mine=1", { cache: "no-store" })
      .then(async (r) => {
        // An outage answers 503. Rendering "None open." would tell the
        // learner they have no assignments (Bucket critic C44).
        if (!r.ok) return { unavailable: true as const, transient: isTransientOutage(r.status, await readErrorCode(r)) };
        return (await r.json()) as { assignments?: Assignment[] };
      })
      .then((j) => ("unavailable" in j ? setAssignments(j.transient ? "outage" : "unavailable") : setAssignments(j.assignments ?? [])))
      // A fetch that rejects never reached the server, which a retry may
      // clear.
      .catch(() => setAssignments("outage"));
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/research-os/search?q=${encodeURIComponent(q)}&limit=12`, { cache: "no-store" });
        if (r.ok) {
          setSearchNote(null);
          setHits(((await r.json()) as { results: Hit[] }).results);
        } else {
          setSearchNote(isTransientOutage(r.status, await readErrorCode(r)) ? OUTAGE_COPY.body : null);
          setHits([]);
        }
      } finally {
        setBusy(false);
      }
    }, 180);
    return () => window.clearTimeout(t);
  }, [q]);

  const open = (slug: string) => `/research-os/workspace?target=${encodeURIComponent(slug)}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Research OS · workspace" title="what are you working toward?" lede="Pick any node on the graph. The workspace lays out the path to it from what you already hold, and the tools work on every step." />
      <Panel title="find a target">
        <input id="target-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="a law, a claim, a concept, a paper, a figure" className="w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/60" />
        {busy && <LoadingState label="Searching the graph" />}
        {searchNote && (
          <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
            {searchNote}
          </p>
        )}
        {hits.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-[color:var(--hairline)]">
            {hits.map((h) => (
              <li key={h.id} className="py-2 flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <a href={open(h.slug)} className="text-[14px] text-[color:var(--basalt)] hover:underline underline-offset-4">{h.title}</a>
                  <div className="text-[11px] text-[color:var(--basalt-3)]">
                    {h.kind.replace("_", " ")} · {h.branch.replace(/^\d+-/, "")}
                    {h.stage ? ` · you: ${STAGE_LABEL[h.stage] ?? h.stage}` : ""}
                  </div>
                </div>
                <Link href={`/research-os/n/${encodeURIComponent(h.slug)}`} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)]">the node</Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="grid md:grid-cols-2 gap-6">
        <Panel title="your assignments">
          {assignments === null ? (
            <LoadingState />
          ) : assignments === "outage" ? (
            <p className="text-[13px] text-[color:var(--basalt-3)]">{OUTAGE_COPY.body}</p>
          ) : assignments === "unavailable" ? (
            <p className="text-[13px] text-[color:var(--basalt-3)]">Assignments could not be read right now.</p>
          ) : assignments.length === 0 ? (
            <p className="text-[13px] text-[color:var(--basalt-3)]">None open.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
              {assignments.map((a) => (
                <li key={a.id} className="py-2">
                  {!targetIsLinkable(a) ? (
                    <span className="text-[14px] text-[color:var(--basalt-3)]">target not shared with you</span>
                  ) : (
                    <a href={open(a.targetSlug)} className="text-[14px] text-[color:var(--basalt)] hover:underline underline-offset-4">{a.targetTitle}</a>
                  )}
                  <div className="text-[11px] text-[color:var(--basalt-3)]">{a.title} · {a.className} · {a.status.replace("_", " ")}</div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="elsewhere">
          <div className="flex flex-col gap-2">
            <Link href="/research-os/map" className={BTN_SECONDARY + " self-start"}>pick from the map</Link>
            <Link href="/research-os/learn" className={BTN_SECONDARY + " self-start"}>pick from a deck</Link>
            <a href={open("why-the-sky-is-blue")} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)]">the seed path: why the sky is blue</a>
          </div>
        </Panel>
      </div>
    </div>
  );
}
