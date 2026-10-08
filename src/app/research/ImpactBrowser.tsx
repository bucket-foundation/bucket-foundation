"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IMPACT_LINES, KINDS, type ImpactItem, type ItemKind } from "@/lib/research/impact-registry";

const COLLAPSED = 8;

export default function ImpactBrowser({ items }: { items: ImpactItem[] }) {
  const [kind, setKind] = useState<ItemKind | "all">("all");
  const [text, setText] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const needle = text.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      items.filter(
        (i) => (kind === "all" || i.kind === kind) && (!needle || `${i.title} ${i.summary}`.toLowerCase().includes(needle)),
      ),
    [items, kind, needle],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, [items]);
  const narrowed = kind !== "all" || needle !== "";

  return (
    <div>
      <div className="sticky top-0 z-10 bg-[color:var(--bone)] py-3 border-b border-[color:var(--hairline)]">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
          {(["all", ...KINDS] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`px-3 py-1.5 text-[12px] small-caps tracking-[0.1em] border ${kind === k ? "bg-[color:var(--basalt)] text-[color:var(--bone)] border-[color:var(--basalt)]" : "border-[color:var(--hairline)] text-[color:var(--basalt-2)]"}`}
            >
              {k} {counts[k] ?? 0}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Filter by title or topic"
          aria-label="Filter by text"
          className="mt-3 w-full border border-[color:var(--hairline)] bg-transparent px-3 py-2 text-[14px]"
        />
        <p className="mt-2 text-[12px] text-[color:var(--basalt-3)]" aria-live="polite">
          {filtered.length} of {items.length} items
        </p>
      </div>

      {IMPACT_LINES.map((line) => {
        const all = filtered.filter((i) => i.impact === line.id);
        const expanded = narrowed || open[line.id];
        const shown = expanded ? all : all.slice(0, COLLAPSED);
        return (
          <section key={line.id} id={line.id} className="mt-12" aria-labelledby={`h-${line.id}`}>
            <h2 id={`h-${line.id}`} className="font-display uppercase text-[clamp(1.4rem,3.5vw,2rem)] tracking-[0.02em] text-[color:var(--basalt)]">
              {line.title}
            </h2>
            <p className="mt-2 text-[15px] leading-[1.65] text-[color:var(--basalt-2)] max-w-2xl">{line.line}</p>
            <div className="w-10 h-0.5 bg-[color:var(--gold)] mt-4" />
            {all.length === 0 ? (
              <p className="mt-6 text-[14px] text-[color:var(--basalt-3)]">Nothing here matches the filter.</p>
            ) : (
              <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)]">
                {shown.map((i) => (
                  <li key={i.id} className="bg-[color:var(--bone)]">
                    <Link href={i.href} className="block h-full p-5 min-w-0">
                      <div className="flex items-center gap-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)]">
                        <span>{i.kind}</span>
                        {i.date ? <span className="text-[color:var(--basalt-3)]">{i.date}</span> : null}
                      </div>
                      <div className="mt-2 text-[15px] leading-[1.4] text-[color:var(--basalt)] [overflow-wrap:anywhere]">{i.title}</div>
                      <p className="mt-2 text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">{i.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!expanded && all.length > COLLAPSED ? (
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [line.id]: true }))}
                className="mt-4 text-[12px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
              >
                show all {all.length}
              </button>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
