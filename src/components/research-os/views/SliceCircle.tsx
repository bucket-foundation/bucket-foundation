"use client";

import { useMemo } from "react";
import type { AtlasProduction } from "@/lib/research-os/solvability-atlas";
import { ERAS, sharedTokenEdges, sliceRows } from "@/lib/research-os/solvability-space";

export default function SliceCircle({ rows, era, year, selected, colors, onSelect }: { rows: AtlasProduction[]; era: number; year: number; selected: string | null; colors: Record<string, string>; onSelect: (id: string) => void }) {
  const ns = useMemo(() => sliceRows(rows, era, year), [rows, era, year]);
  const edges = useMemo(() => sharedTokenEdges(ns), [ns]);
  const W = 420;
  const c = W / 2;
  const R = c - 40;
  const at = (p: AtlasProduction) => {
    const r = R * p.solvability;
    return [c + Math.cos(p.theta) * r, c - Math.sin(p.theta) * r] as const;
  };
  const byId = new Map(ns.map((p) => [p.id, p]));
  const solved = ns.filter((p) => p.resolved != null && p.resolved <= year).length;
  return (
    <figure className="flex flex-col gap-2 min-w-0">
      <figcaption className="text-[13px] text-[color:var(--basalt-2)]">
        <b className="text-[color:var(--basalt)]">{ERAS[era].label}.</b> {ns.length} problems posed, {solved} resolved by {year}. Angle is embedding rank, distance from the centre is solvability, lines join problems that share a keyword.
      </figcaption>
      <svg viewBox={`0 0 ${W} ${W}`} className="w-full max-w-[420px]" role="img" aria-label={`circle graph for ${ERAS[era].label}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={c} cy={c} r={R * f} fill="none" stroke="var(--hairline)" />
        ))}
        <text x={c + 4} y={c - R + 12} fontSize="10" fill="var(--basalt-3)">1.0</text>
        <text x={c + 4} y={c - R / 2 + 12} fontSize="10" fill="var(--basalt-3)">0.5</text>
        {edges.map(([a, b]) => {
          const [x1, y1] = at(byId.get(a)!);
          const [x2, y2] = at(byId.get(b)!);
          return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--basalt-3)" strokeOpacity="0.25" />;
        })}
        {ns.map((p) => {
          const [x, y] = at(p);
          const done = p.resolved != null && p.resolved <= year;
          const on = p.id === selected;
          return (
            <g key={p.id} role="button" tabIndex={0} aria-label={p.title} className="cursor-pointer" onClick={() => onSelect(p.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(p.id)}>
              <circle cx={x} cy={y} r={on ? 8 : 5.5} fill={done ? colors[p.branch] : "var(--bone, #fff)"} stroke={colors[p.branch]} strokeWidth="2" />
              {(on || ns.length <= 24) && (
                <text x={x + (x > c ? 9 : -9)} y={y + 3} fontSize="10" textAnchor={x > c ? "start" : "end"} fill="var(--basalt)">
                  {p.title.length > 28 ? `${p.title.slice(0, 27)}…` : p.title}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

