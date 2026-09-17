"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState, Panel } from "@/components/ui";

interface N {
  id: string;
  slug: string;
  title: string;
  branch: string;
}
interface Data {
  held: { from: N; to: N; kind: string }[];
  bridges: { held: N; next: N; kind: string }[];
}

const branchName = (b: string) => b.replace(/^\d+-/, "").replace(/-/g, " ");
const KIND: Record<string, string> = { derives_from: "derives from", generalizes: "generalizes", example_of: "is an example of", cites: "cites", extends: "extends", replicates: "replicates", answers: "answers", contradicts: "contradicts", reviews: "reviews" };

/** Internalization on home: the connections a person holds across branches, and the bridges one step away. */
export default function ConnectionsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/research-os/connections", { cache: "no-store" })
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

  return (
    <Panel title="across branches" meta={data ? `${data.held.length} held · ${data.bridges.length} one step away` : undefined}>
      {status === null ? (
        <LoadingState />
      ) : status === 503 ? (
        <ErrorState title="Research OS is unavailable on this deployment" />
      ) : !data ? (
        <ErrorState body="Could not load your connections." />
      ) : data.held.length === 0 && data.bridges.length === 0 ? (
        <EmptyState title="No connections yet" body="Understanding a node in one branch and a node it derives from in another puts a connection here. Learn and work until two branches touch." action={{ href: "/research-os/learn", label: "learn" }} />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">held</div>
            {data.held.length === 0 ? (
              <p className="mt-1 text-[13px] text-[color:var(--basalt-3)]">None yet.</p>
            ) : (
              <ul className="mt-1 flex flex-col divide-y divide-[color:var(--hairline)]">
                {data.held.slice(0, 8).map((h) => (
                  <li key={`${h.from.id}-${h.to.id}-${h.kind}`} className="py-2 text-[13px] text-[color:var(--basalt)]">
                    <Link href={`/research-os/n/${encodeURIComponent(h.from.slug)}`} className="hover:underline underline-offset-4">{h.from.title}</Link>
                    <span className="text-[color:var(--basalt-3)]"> {KIND[h.kind] ?? h.kind} </span>
                    <Link href={`/research-os/n/${encodeURIComponent(h.to.slug)}`} className="hover:underline underline-offset-4">{h.to.title}</Link>
                    <div className="text-[11px] text-[color:var(--basalt-3)]">{branchName(h.from.branch)} · {branchName(h.to.branch)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">one step away</div>
            {data.bridges.length === 0 ? (
              <p className="mt-1 text-[13px] text-[color:var(--basalt-3)]">None yet.</p>
            ) : (
              <ul className="mt-1 flex flex-col divide-y divide-[color:var(--hairline)]">
                {data.bridges.slice(0, 8).map((b) => (
                  <li key={`${b.held.id}-${b.next.id}-${b.kind}`} className="py-2 text-[13px]">
                    <Link href={`/research-os/n/${encodeURIComponent(b.next.slug)}`} className="text-[color:var(--basalt)] hover:underline underline-offset-4">{b.next.title}</Link>
                    <div className="text-[11px] text-[color:var(--basalt-3)]">
                      {branchName(b.next.branch)} · {KIND[b.kind] ?? b.kind} {b.held.title} ({branchName(b.held.branch)}), which you hold
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
