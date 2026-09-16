"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// The Awareness level, in place (ros-24): from the selected node, where
// knowledge goes. Reads GET /api/research-os/directions.

interface Lite {
  id: string;
  slug: string;
  title: string;
  kind: string;
  frontierFlag?: string | null;
}
interface DirectionsView {
  dependents: Lite[];
  frontier: Lite[];
  openQuestions: Lite[];
  reach: number[];
}

export default function DirectionsBlock({
  nodeId,
  branch,
  onSelect,
}: {
  nodeId: string;
  branch: string;
  onSelect: (node: Lite) => void;
}) {
  const [d, setD] = useState<DirectionsView | null>(null);

  useEffect(() => {
    let cancelled = false;
    setD(null);
    (async () => {
      try {
        const res = await fetch(`/api/research-os/directions?node=${encodeURIComponent(nodeId)}&branch=${encodeURIComponent(branch)}`, { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as DirectionsView;
        if (!cancelled) setD(j);
      } catch {
        /* unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nodeId, branch]);

  if (!d) return null;
  const total = d.reach.reduce((a, b) => a + b, 0);
  const chip = (n: Lite, tone: string) => (
    <button
      key={n.id}
      type="button"
      onClick={() => onSelect(n)}
      className={`px-2 py-0.5 rounded-full border text-[11px] hover:border-[color:var(--gold)] ${tone}`}
      title={n.kind}
    >
      {n.title}
    </button>
  );

  return (
    <div className="mt-3 border-t border-[color:var(--hairline)] pt-3 text-[12px] text-[color:var(--basalt-2)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">where this leads</span>
        <span className="text-[color:var(--basalt-3)]">
          {total === 0 ? "nothing built on this yet" : `${total} node${total === 1 ? "" : "s"} within three steps (${d.reach.join(" · ")})`}
        </span>
      </div>
      {d.dependents.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[color:var(--basalt-3)] mr-1">next</span>
          {d.dependents.map((n) => chip(n, "border-[color:var(--hairline)]"))}
        </div>
      )}
      {d.frontier.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[color:var(--gold-deep)] mr-1">frontier</span>
          {d.frontier.map((n) => chip(n, "border-[color:var(--gold)]"))}
        </div>
      )}
      {d.openQuestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[color:var(--aegean-deep)] mr-1">open questions</span>
          {d.openQuestions.map((n) => (
            <Link key={n.id} href={`/research-os/workspace?target=${encodeURIComponent(n.slug)}`} className="px-2 py-0.5 rounded-full border border-[color:var(--aegean-deep)] text-[11px] hover:bg-[color:var(--bone-2)]">
              {n.title} →
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
