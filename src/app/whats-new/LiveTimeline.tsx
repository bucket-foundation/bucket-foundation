"use client";

import { useEffect, useState } from "react";
import { CATEGORY_LABEL, dayHeading, POLL_MS, rowLink, timeline, type TimelineEntry } from "@/lib/whats-new/timeline";
import { STATE_LABEL } from "./GenerationCard";
import ProductionCard from "./ProductionCard";
import type { Production } from "./page";

export function SmallRow({ entry, time }: { entry: TimelineEntry; time: string | null }) {
  const kind = entry.kind ?? entry.category ?? "update";
  const link = rowLink(entry);
  const machine = entry.machine_generated === true;
  const state = typeof entry.state === "string" ? (STATE_LABEL[entry.state] ?? "state unknown") : null;
  return (
    <li id={entry.id} className="py-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <span className="w-20 shrink-0 small-caps text-[10px] text-[color:var(--parchment-dim)]">{time ?? "no time"}</span>
      <span className="small-caps text-[10px] text-[color:var(--gold)]">{CATEGORY_LABEL[kind] ?? kind}</span>
      {machine && <span className="border hairline px-1 small-caps text-[10px] text-[color:var(--basalt)]">made by a machine</span>}
      {entry.autopublished === true && <span className="small-caps text-[10px] text-[color:var(--parchment-dim)]">not reviewed by a person</span>}
      <span className={`flex-1 min-w-[12rem] text-[color:var(--basalt)] ${entry.state === "refuted" ? "line-through decoration-1" : ""}`}>{String(entry.title ?? "")}</span>
      {state && <span className={`small-caps text-[10px] ${entry.state === "refuted" ? "text-[color:var(--basalt)] font-semibold" : "text-[color:var(--parchment-dim)]"}`}>{state}</span>}
      {link && (
        <a href={link.href} target="_blank" rel="noopener noreferrer" className="small-caps text-[10px] text-[color:var(--gold)] hover:text-[color:var(--basalt)]">
          {link.label} ↗
        </a>
      )}
    </li>
  );
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const days = timeline(entries);
  if (days.length === 0) return <p className="text-sm text-[color:var(--parchment-dim)]">Nothing has been posted yet.</p>;
  return (
    <div>
      {days.map((day) => ({ ...day, heading: dayHeading(day.day) })).map((day) => (
        <section key={day.day} className="mb-10" aria-label={day.heading}>
          <h3 className="small-caps text-[11px] tracking-[0.15em] text-[color:var(--gold-deep)] mb-3 border-b hairline pb-2">{day.heading}</h3>
          <ul className="divide-y divide-[color:var(--hairline)]">
            {day.rows.map((row) =>
              row.size === "large" ? (
                <li key={row.entry.id} className="py-6">
                  <div className="mb-2 small-caps text-[10px] text-[color:var(--parchment-dim)]">{row.time ?? "no time"}</div>
                  <ProductionCard production={row.entry as unknown as Production} />
                </li>
              ) : (
                <SmallRow key={row.entry.id} entry={row.entry} time={row.time} />
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function LiveTimeline({ initial }: { initial: TimelineEntry[] }) {
  const [entries, setEntries] = useState(initial);
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/whats-new/entries", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { entries?: TimelineEntry[] };
        if (!stopped && Array.isArray(body.entries)) setEntries(body.entries);
      } catch {
        return;
      }
    };
    const timer = window.setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);
  return <Timeline entries={entries} />;
}
