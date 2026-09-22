"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BTN_PRIMARY, ErrorState, LoadingState } from "@/components/ui";

interface Loop {
  access: { owned: number; imports: number; pendingRequests: number };
  awareness: { opened: number; atLeastAwareness: number };
  // decksStarted is null when the Academy read did not complete. Zero is
  // the first-run line, so the two have to stay distinguishable here.
  understanding: { nodes: number; decksStarted: number | null };
  internalization: { nodes: number; held: number; bridges: number; nextBridge: { slug: string; title: string } | null };
  production: { drafts: number; submitted: number; accepted: number; returned: number; nodes: number; latest: { id: string; status: string; kind: string; claim: string | null } | null };
  empty: boolean;
}

const n = (v: number, one: string, many = one + "s") => `${v} ${v === 1 ? one : many}`;

/**
 * The five levels as the person's live state, at the top of home. Each
 * column says where they stand and names the one next action for that
 * level, so the loop reads as a loop. A first run shows the way in.
 */
export default function LoopPanel() {
  const [loop, setLoop] = useState<Loop | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/research-os/loop", { cache: "no-store" })
      .then(async (r) => {
        if (!alive) return;
        setStatus(r.status);
        if (r.ok) setLoop((await r.json()) as Loop);
      })
      .catch(() => alive && setStatus(0));
    return () => {
      alive = false;
    };
  }, []);

  if (status === null) return <LoadingState label="Reading your loop" />;
  if (status === 503) return <ErrorState title="Research OS is unavailable on this deployment" />;
  if (!loop) return <ErrorState body="Could not read your loop." />;

  if (loop.empty) {
    return (
      <section aria-label="Start here" className="bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] p-5 md:p-6">
        <div className="small-caps text-[11px] tracking-[0.18em] text-[color:var(--aegean-deep)]">start here</div>
        <ol className="mt-3 grid md:grid-cols-3 gap-4">
          {[
            ["1", "Place yourself", "Ten questions find what you already know in a branch, so you start where you are.", "/research-os/learn", "pick a deck"],
            ["2", "Work a target", "Read, quote, and check your way up the seed path in the workspace. Each node you hold moves up a level.", "/research-os/workspace", "open the workspace"],
            ["3", "Produce", "Organize what you found into a claim, submit it, and when it is accepted it becomes a node on the graph with your name on it.", "/research-os/workspace#production", "see the form"],
          ].map(([k, title, body, href, cta]) => (
            <li key={k} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[22px] text-[color:var(--gold-deep)]">{k}</span>
                <span className="text-[15px] text-[color:var(--basalt)]">{title}</span>
              </div>
              <p className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">{body}</p>
              <Link href={href} className={(k === "1" ? BTN_PRIMARY : "underline underline-offset-4 text-[13px] text-[color:var(--aegean-deep)]") + " self-start"}>
                {cta}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const cols: { name: string; state: string; detail: string; href: string; cta: string; lit: boolean }[] = [
    {
      name: "Access",
      state: n(loop.access.owned, "node") + " you own",
      detail: `${n(loop.access.imports, "import")}${loop.access.pendingRequests ? ` · ${n(loop.access.pendingRequests, "request")} pending` : ""}`,
      href: "/research-os/profile",
      cta: loop.access.owned ? "your nodes" : "import a source",
      lit: loop.access.owned > 0,
    },
    {
      name: "Awareness",
      state: n(loop.awareness.opened, "node") + " opened",
      detail: `${loop.awareness.atLeastAwareness} at awareness or above`,
      href: "/research-os/map",
      cta: "the map",
      lit: loop.awareness.opened > 0,
    },
    {
      name: "Understanding",
      state: n(loop.understanding.nodes, "node") + " held",
      detail:
        loop.understanding.decksStarted === null
          ? "Learn progress could not be read this minute"
          : `${n(loop.understanding.decksStarted, "deck")} started in Learn`,
      href: "/research-os/learn",
      cta: loop.understanding.decksStarted ? "keep learning" : "start a deck",
      lit: loop.understanding.nodes > 0,
    },
    {
      name: "Internalization",
      state: n(loop.internalization.held, "connection") + " held",
      detail: loop.internalization.bridges ? `${n(loop.internalization.bridges, "bridge")} one step away` : `${loop.internalization.nodes} internalized`,
      href: loop.internalization.nextBridge ? `/research-os/n/${encodeURIComponent(loop.internalization.nextBridge.slug)}` : "/research-os/workspace",
      cta: loop.internalization.nextBridge ? `cross to ${loop.internalization.nextBridge.title}` : "transfer",
      lit: loop.internalization.held > 0 || loop.internalization.nodes > 0,
    },
    {
      name: "Production",
      state: n(loop.production.accepted, "accepted", "accepted"),
      detail: `${loop.production.drafts} draft · ${loop.production.submitted} submitted${loop.production.returned ? ` · ${loop.production.returned} returned` : ""} · ${n(loop.production.nodes, "node")} on the graph`,
      href: "/research-os/productions",
      cta: loop.production.drafts + loop.production.submitted + loop.production.accepted ? "your productions" : "produce",
      lit: loop.production.accepted > 0,
    },
  ];

  return (
    <section aria-label="Your loop" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cols.map((c, i) => (
        <div key={c.name} className={"relative bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] p-4 border-t-2 " + (c.lit ? "border-[color:var(--gold)]" : "border-[color:var(--hairline)]")}>
          <div className="flex items-baseline justify-between gap-2">
            <div className="small-caps text-[10px] tracking-[0.2em] text-[color:var(--aegean-deep)]">{c.name}</div>
            <span aria-hidden className="text-[10px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]">{i + 1}</span>
          </div>
          <div className="mt-2 font-display text-[18px] leading-tight text-[color:var(--basalt)]">{c.state}</div>
          <div className="mt-1 text-[11px] leading-[1.5] text-[color:var(--basalt-3)] min-h-[2.4em]">{c.detail}</div>
          <Link href={c.href} className="mt-3 inline-block text-[12px] small-caps tracking-[0.12em] underline underline-offset-4 text-[color:var(--basalt)] hover:text-[color:var(--gold-deep)]">
            {c.cta} →
          </Link>
        </div>
      ))}
    </section>
  );
}
