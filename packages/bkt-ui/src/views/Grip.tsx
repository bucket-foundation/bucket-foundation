import type { GripSphere } from "@academy/grip-sphere";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function GripPanel({ grip }: { grip: GripSphere }) {
  const R = 110;
  const pt = (angle: number, v: number) => [Math.cos(angle) * R * Math.max(v, 0.02), -Math.sin(angle) * R * Math.max(v, 0.02)] as const;
  const poly = (key: "current" | "peak") => grip.axes.map((a) => pt(a.angle, a[key]).join(",")).join(" ");
  return (
    <article className="panel grip">
      <div className="grip-figure">
        <svg viewBox="-200 -150 400 300" role="img" aria-label={`Grip ${pct(grip.radius)} across ${grip.axes.length} branches`}>
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <circle key={r} r={R * r} className="ring" />
          ))}
          {grip.axes.map((a) => {
            const [x, y] = pt(a.angle, 1);
            const [lx, ly] = pt(a.angle, 1.22);
            return (
              <g key={a.branch}>
                <line x1={0} y1={0} x2={x} y2={y} className="axis" />
                <text x={lx} y={ly} textAnchor={lx < -5 ? "end" : lx > 5 ? "start" : "middle"} dominantBaseline="middle">
                  {a.branch}
                </text>
              </g>
            );
          })}
          {grip.axes.length > 2 && <polygon points={poly("peak")} className="peak" />}
          {grip.axes.length > 2 && <polygon points={poly("current")} className="current" />}
        </svg>
      </div>
      <div>
        <h2>Grip</h2>
        <p className="big">{pct(grip.radius)}</p>
        <p className="muted small">
          Peak {pct(grip.peakRadius)} · {pct(grip.atomWeighted)} over {grip.atoms} atoms
        </p>
        <p className="muted small">Mean mastery across the canon branches, each weighted equally. The faint shape is your peak; the gap is what review brings back.</p>
        <ul className="grip-rows">
          {grip.axes.map((a) => (
            <li key={a.branch}>
              <span>{a.branch}</span>
              <span className="track">
                <span className="peak" style={{ width: pct(a.peak) }} />
                <span className="current" style={{ width: pct(a.current) }} />
              </span>
              <span className="value">{pct(a.current)}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
