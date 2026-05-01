"use client";

import { useMemo, useState } from "react";
import type { Milestone } from "./page";

const REPO = "bucket-foundation/bucket-foundation";

const CATEGORY_LABEL: Record<string, string> = {
  "branch-opened":     "branch opened",
  "entry-promoted":    "entry promoted",
  "entry-stub-written":"stub written",
  "cross-link-added":  "cross-link",
  "landscape-added":   "landscape",
  "intake-research":   "intake",
  "site-refactor":     "site",
};

function weekKey(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "unknown";
  // ISO week start (Monday)
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function fmtWeek(iso: string): string {
  if (iso === "unknown") return "unknown";
  const d = new Date(iso + "T00:00:00Z");
  return `Week of ${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
}

export default function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  const branches = useMemo(() => {
    const s = new Set<string>();
    milestones.forEach((m) => m.branch && s.add(m.branch));
    return Array.from(s).sort();
  }, [milestones]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    milestones.forEach((m) => s.add(m.category));
    return Array.from(s).sort();
  }, [milestones]);

  const [branch, setBranch] = useState<string>("");
  const [cat, setCat] = useState<string>("");

  const filtered = milestones.filter((m) =>
    (!branch || m.branch === branch) && (!cat || m.category === cat),
  );

  const groups = new Map<string, Milestone[]>();
  for (const m of filtered) {
    const k = weekKey(m.date);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(m);
  }
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <Chip active={!cat} onClick={() => setCat("")}>all categories</Chip>
        {categories.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {CATEGORY_LABEL[c] || c}
          </Chip>
        ))}
      </div>
      {branches.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Chip active={!branch} onClick={() => setBranch("")}>all branches</Chip>
          {branches.map((b) => (
            <Chip key={b} active={branch === b} onClick={() => setBranch(b)}>
              {b}
            </Chip>
          ))}
        </div>
      )}

      {sortedGroups.length === 0 && (
        <div className="text-sm text-[color:var(--parchment-dim)]">No milestones match this filter.</div>
      )}

      {sortedGroups.map(([wk, items]) => (
        <div key={wk} className="mb-8">
          <div className="small-caps text-[10px] tracking-[0.15em] text-[color:var(--gold-deep)] mb-3">
            {fmtWeek(wk)}
          </div>
          <ul className="border-y hairline divide-y divide-[color:var(--hairline)]">
            {items.map((m) => (
              <li key={m.id} className="py-4 flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                <div className="w-32 shrink-0 small-caps text-[10px] text-[color:var(--gold)]">
                  {CATEGORY_LABEL[m.category] || m.category}
                  {m.branch && <div className="text-[color:var(--parchment-dim)]">{m.branch}</div>}
                </div>
                <div className="flex-1">
                  <div className="font-serif-display text-lg text-[color:var(--basalt)]">{m.title}</div>
                  <p className="text-sm text-[color:var(--parchment-dim)] mt-1">{m.summary}</p>
                  <div className="mt-2 small-caps text-[10px] text-[color:var(--parchment-dim)]">
                    {m.date} ·{" "}
                    <a
                      href={`https://github.com/${REPO}/commit/${m.commit}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]"
                    >
                      {m.commit.slice(0, 7)} ↗
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`small-caps text-[10px] tracking-[0.1em] px-3 py-1 border ${
        active
          ? "text-[color:var(--gold)] border-[color:var(--gold)]"
          : "text-[color:var(--parchment-dim)] border-[color:var(--hairline)] hover:border-[color:var(--gold-deep)]"
      }`}
    >
      {children}
    </button>
  );
}
