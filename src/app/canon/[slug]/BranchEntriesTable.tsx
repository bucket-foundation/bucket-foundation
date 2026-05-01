"use client";

import { useMemo, useState } from "react";
import type { CanonRow } from "@/lib/canon-fs";

type SortKey = "title" | "year" | "subfolder";

export default function BranchEntriesTable({
  entries,
  branchSlug,
}: {
  entries: CanonRow[];
  branchSlug: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("subfolder");
  const [asc, setAsc] = useState(true);
  const [filter, setFilter] = useState("");

  const subfolders = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => e.subfolder && s.add(e.subfolder));
    return Array.from(s).sort();
  }, [entries]);

  const sorted = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let out = entries.filter((e) =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.subfolder.toLowerCase().includes(q),
    );
    out = [...out].sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      if (sortKey === "title") { av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
      else if (sortKey === "year") { av = a.year || "0"; bv = b.year || "0"; }
      else { av = a.subfolder; bv = b.subfolder; }
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return out;
  }, [entries, sortKey, asc, filter]);

  function sortBtn(key: SortKey, label: string) {
    const active = key === sortKey;
    return (
      <button
        onClick={() => { if (active) setAsc(!asc); else { setSortKey(key); setAsc(true); } }}
        className={`small-caps text-[10px] tracking-[0.1em] px-2 py-1 border ${
          active
            ? "text-[color:var(--gold)] border-[color:var(--gold)]"
            : "text-[color:var(--parchment-dim)] border-[color:var(--hairline)]"
        }`}
      >
        {label}{active ? (asc ? " ↑" : " ↓") : ""}
      </button>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm bg-[color:var(--bone-2)] border border-[color:var(--hairline)] px-3 py-1 outline-none focus:border-[color:var(--gold)]"
        />
        {sortBtn("subfolder", "sub-folder")}
        {sortBtn("title", "title")}
        {sortBtn("year", "year")}
        <span className="ml-auto small-caps text-[10px] text-[color:var(--parchment-dim)]">
          {sorted.length} of {entries.length}
        </span>
      </div>

      <div className="divide-y divide-[color:var(--hairline)] border-y hairline">
        {sorted.map((e, i) => (
          <div key={i} className="py-3 flex items-start gap-4 group">
            <div className="w-32 shrink-0 small-caps text-[10px] text-[color:var(--gold-deep)] pt-1">
              {e.subfolder || "—"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] text-[color:var(--basalt)]">{e.title}</div>
              {e.year && (
                <div className="text-[11px] text-[color:var(--parchment-dim)] mt-1 small-caps">
                  {e.year}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled
              className="small-caps text-[9px] tracking-[0.12em] text-[color:var(--parchment-dim)] border border-[color:var(--hairline)] px-2 py-1 cursor-not-allowed"
              title="Story Protocol IP NFT minting — coming soon"
            >
              mint as IP NFT
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
