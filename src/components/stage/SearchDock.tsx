"use client";

import type { ReactNode } from "react";
import type { Hit, HitType } from "@/lib/explore/search";

export type SortId = "relevance" | "year" | "branch";

export const SORTS: { id: SortId; label: string }[] = [
  { id: "relevance", label: "Relevance" },
  { id: "year", label: "Year" },
  { id: "branch", label: "Branch" },
];

const mono = { fontFamily: "var(--font-jetbrains)" };

interface Props {
  q: string;
  onQ(q: string): void;
  onSearch(): void;
  loading: boolean;
  types: { id: HitType; label: string }[];
  active: Set<HitType>;
  onToggle(t: HitType): void;
  hits: Hit[];
  sort: SortId;
  onSort(s: SortId): void;
  sample: boolean;
  modes: ReactNode;
  modeControls: ReactNode;
  results: ReactNode;
  resultCount: number;
  error: string | null;
}

export default function SearchDock(p: Props) {
  return (
    <div data-testid="search-dock" className="flex flex-col gap-2 text-sm">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          p.onSearch();
        }}
      >
        <input aria-label="Search" data-testid="explore-query" value={p.q} onChange={(e) => p.onQ(e.target.value)} className="flex-1 min-w-0 border hairline bg-transparent px-3 py-2" placeholder="Search canon excerpts and advisors" />
        <button type="submit" className="border hairline px-4 py-2" style={mono}>
          {p.loading ? "…" : "Search"}
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-3" style={mono}>
        {p.types.map((t) => (
          <label key={t.id} className="flex items-center gap-1">
            <input type="checkbox" checked={p.active.has(t.id)} onChange={() => p.onToggle(t.id)} />
            {t.label} ({p.hits.filter((h) => h.type === t.id).length})
          </label>
        ))}
        <label className="flex items-center gap-1">
          Sort
          <select data-testid="dock-sort" value={p.sort} onChange={(e) => p.onSort(e.target.value as SortId)} className="border hairline bg-transparent px-1 py-0.5">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {p.sample && <span style={{ color: "var(--parchment-dim)" }}>advisors: sample data</span>}
      </div>
      {p.error && (
        <p role="alert" className="text-sm">
          {p.error}
        </p>
      )}
      {p.modes}
      {p.modeControls}
      <details data-testid="dock-results">
        <summary className="cursor-pointer" style={mono}>
          Results ({p.resultCount})
        </summary>
        <div className="max-h-56 overflow-auto mt-2">{p.results}</div>
      </details>
    </div>
  );
}
