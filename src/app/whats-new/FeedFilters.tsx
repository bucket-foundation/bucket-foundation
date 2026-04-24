"use client";

import { useMemo, useState } from "react";
import {
  FeedEvent,
  FeedEventType,
  TYPE_LABEL,
  dayKey,
  formatDayHeader,
} from "./types";
import EventCard from "./EventCard";

const ALL_TYPES: FeedEventType[] = [
  "add_paper",
  "add_figure",
  "add_branch",
  "add_canon_entry",
  "add_landscape",
  "update_dossier",
  "promote",
  "demote",
  "retract",
];

export default function FeedFilters({ events }: { events: FeedEvent[] }) {
  const branches = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => e.branch && s.add(e.branch));
    return Array.from(s).sort();
  }, [events]);

  const [branch, setBranch] = useState<string>("");
  const [types, setTypes] = useState<Set<FeedEventType>>(new Set());
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (branch && e.branch !== branch) return false;
      if (types.size > 0 && !types.has(e.type)) return false;
      if (q) {
        const hay =
          (e.author_github || "") +
          " " +
          (e.author_name || "") +
          " " +
          (e.title || "") +
          " " +
          (e.topic || "");
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [events, branch, types, query]);

  const grouped = useMemo(() => {
    const m = new Map<string, FeedEvent[]>();
    for (const e of filtered) {
      const k = dayKey(e.timestamp);
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    // Already reverse-chron from caller; preserve order via Map iteration.
    return Array.from(m.entries());
  }, [filtered]);

  function toggleType(t: FeedEventType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-10 grid gap-4 md:grid-cols-[1fr_1fr] lg:grid-cols-[200px_1fr_1fr] items-start">
        <label className="block">
          <span className="small-caps text-[10px] text-[color:var(--parchment-dim)] block mb-2">
            branch
          </span>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full bg-[color:var(--ink)] border hairline px-3 py-2 text-sm text-[color:var(--parchment)]"
          >
            <option value="">all branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="small-caps text-[10px] text-[color:var(--parchment-dim)] block mb-2">
            contributor
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search handle, name, title…"
            className="w-full bg-[color:var(--ink)] border hairline px-3 py-2 text-sm text-[color:var(--parchment)] placeholder:text-[color:var(--parchment-dim)]"
          />
        </label>

        <div className="lg:col-span-3">
          <div className="small-caps text-[10px] text-[color:var(--parchment-dim)] mb-2">
            event type
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => {
              const on = types.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={
                    "small-caps text-[10px] px-2.5 py-1 border hairline transition " +
                    (on
                      ? "bg-[color:var(--gold)] text-[color:var(--basalt)]"
                      : "bg-[color:var(--ink)] text-[color:var(--parchment-dim)] hover:text-[color:var(--gold)]")
                  }
                >
                  {TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="small-caps text-[10px] text-[color:var(--parchment-dim)] mb-4">
        showing {filtered.length} of {events.length} events
      </div>

      {grouped.length === 0 ? (
        <EmptyState hasEvents={events.length > 0} />
      ) : (
        <div>
          {grouped.map(([day, items]) => (
            <section key={day} className="mb-10">
              <h2 className="small-caps text-[11px] text-[color:var(--gold)] mb-3 pb-2 border-b hairline">
                {formatDayHeader(day)}
              </h2>
              <div className="bg-[color:var(--hairline)]">
                {items.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasEvents }: { hasEvents: boolean }) {
  return (
    <div className="py-16 text-center border hairline">
      <div className="font-mono-mark text-2xl text-[color:var(--gold-dim)] mb-4">
        ∅
      </div>
      <p className="text-[color:var(--parchment-dim)]">
        {hasEvents
          ? "No events match the current filters."
          : "No events yet. The feed populates as commits land in the canon."}
      </p>
    </div>
  );
}
