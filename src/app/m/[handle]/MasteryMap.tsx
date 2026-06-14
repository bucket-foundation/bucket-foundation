/**
 * src/app/m/[handle]/MasteryMap.tsx  (bkt-coh)
 * ------------------------------------------------------------------
 * Server-rendered concentric-shell "nucleus" map — the public face of the
 * in-app map (learning/app/js/app.js screenMap). Same visual grammar:
 *   ring   = shell   (prereq outer · nucleus mid · frontier inner)
 *   size   = leverage (centrality)
 *   fill   = mastery  (how lit the node is)
 *   color  = shell    (aegean / gold / laurel — the bucket palette)
 *
 * Pure SVG, no client JS. Accessibility: an aria-label summary + a screen-reader
 * list-mode (rendered by the page) gives non-visual viewers the same signal
 * (MASTERY-PROFILE.md §1.1 accessibility gate).
 */
import type { BranchSummary, ConceptSignal } from "@/lib/academy/mastery";

const SHELL_COLOR: Record<string, string> = {
  prereq: "#2E6B6B", // aegean
  nucleus: "#B8861E", // gold
  frontier: "#5A7A3A", // laurel
};
const SHELL_RADIUS: Record<string, number> = {
  prereq: 0.42,
  nucleus: 0.27,
  frontier: 0.13,
};

interface PlacedNode extends ConceptSignal {
  x: number;
  y: number;
  r: number;
}

export default function MasteryMap({ branch }: { branch: BranchSummary }) {
  const W = 360;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const base = Math.min(W, H);

  // group concepts by shell, order by leverage (same as the app)
  const byShell: Record<string, ConceptSignal[]> = {};
  for (const c of branch.concepts) {
    (byShell[c.shell] = byShell[c.shell] || []).push(c);
  }
  for (const k of Object.keys(byShell)) {
    byShell[k].sort((a, b) => b.leverage - a.leverage);
  }

  const placed: PlacedNode[] = [];
  for (const shell of ["prereq", "nucleus", "frontier"]) {
    const items = byShell[shell] || [];
    const radius = base * (SHELL_RADIUS[shell] ?? 0.27);
    items.forEach((c, k) => {
      const ang = (k / Math.max(1, items.length)) * Math.PI * 2 - Math.PI / 2;
      placed.push({
        ...c,
        x: cx + Math.cos(ang) * radius,
        y: cy + Math.sin(ang) * radius,
        r: 4 + c.leverage * 12,
      });
    });
  }

  const litCount = placed.filter((p) => p.started).length;
  const label =
    `Mastery map for ${branch.title}: ${litCount} of ${placed.length} concepts lit, ` +
    `${branch.mastered} mastered.`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={label}
      style={{ display: "block", maxWidth: 420, margin: "0 auto" }}
    >
      {/* shell guide rings */}
      {["prereq", "nucleus", "frontier"].map((shell) => (
        <circle
          key={"ring-" + shell}
          cx={cx}
          cy={cy}
          r={base * (SHELL_RADIUS[shell] ?? 0.27)}
          fill="none"
          stroke="rgba(31,28,22,0.08)"
          strokeWidth={1}
        />
      ))}
      {/* nodes */}
      {placed.map((p) => {
        const color = SHELL_COLOR[p.shell] || "#B8861E";
        const fillR = p.r * Math.max(0.12, p.mastery);
        return (
          <g key={p.id} transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`}>
            <circle
              r={p.r}
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={p.started ? 0.7 : 0.28}
            />
            <circle r={fillR} fill={color} opacity={p.started ? 0.85 : 0} />
            <title>
              {p.title} — {p.started ? `${Math.round(p.mastery * 100)}% · ${p.depthLabel}` : "not started"}
            </title>
          </g>
        );
      })}
    </svg>
  );
}
