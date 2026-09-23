"use client";

type Stage = "access" | "awareness" | "understanding" | "internalization" | "production";

const FILL: Record<Stage, string> = {
  access: "var(--bone-3)",
  awareness: "var(--aegean)",
  understanding: "var(--gold)",
  internalization: "var(--gold-deep)",
  production: "var(--basalt)",
};

export interface PathStep {
  id: string;
  title: string;
  stage: Stage;
  isFrontier: boolean;
}

export default function PathMap({
  steps,
  selectedId,
  onSelect,
}: {
  steps: PathStep[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (steps.length === 0) return null;
  const W = 560;
  const rowH = 64;
  const H = steps.length * rowH + 24;
  const amp = 170;
  const cx = W / 2;
  const pts = steps.map((_, i) => ({ x: cx + amp * Math.sin((i * Math.PI) / 2.2), y: 24 + i * rowH }));
  const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `C ${pts[i - 1].x} ${pts[i - 1].y + rowH / 2}, ${p.x} ${p.y - rowH / 2}, ${p.x} ${p.y}`)).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: "block" }} role="list" aria-label="your path">
        <path d={d} fill="none" stroke="var(--hairline)" strokeWidth="6" strokeLinecap="round" />
        {steps.map((s, i) => {
          const p = pts[i];
          const on = s.id === selectedId;
          const last = i === steps.length - 1;
          return (
            <g key={s.id} role="listitem" transform={`translate(${p.x} ${p.y})`} onClick={() => onSelect(s.id)} style={{ cursor: "pointer" }}>
              <title>{`${s.title} · ${s.stage}${s.isFrontier ? " · frontier" : ""}`}</title>
              <circle r={last ? 16 : 12} fill={FILL[s.stage]} stroke={on ? "var(--basalt)" : "var(--bone)"} strokeWidth={on ? 3 : 2} />
              {last && <circle r={22} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="3 3" />}
              <text
                x={p.x > cx ? -22 : 22}
                y="4"
                textAnchor={p.x > cx ? "end" : "start"}
                fontSize="12"
                fill="var(--basalt)"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {s.title.length > 34 ? s.title.slice(0, 33) + "…" : s.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
