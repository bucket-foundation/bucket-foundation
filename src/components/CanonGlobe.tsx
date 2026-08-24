"use client";

// CanonGlobe, interactive armillary. Extends the Globe.tsx design language
// (basalt sphere, gilt meridians, eight ports). Each port maps to a canon
// branch; port intensity reflects branch status.

import Link from "next/link";
import { useMemo, useState } from "react";

export type GlobeBranch = {
  slug: string;
  numeral: string;
  name: string;
  status: "not yet opened" | "intake" | "scaffolded" | "in progress" | "complete";
  entryCount: number;
};

type Props = {
  branches: GlobeBranch[];
  size?: number;
  className?: string;
  interactive?: boolean;
  mode?: "basalt" | "bone";
};

const STATUS_FILL: Record<GlobeBranch["status"], string> = {
  "not yet opened": "rgba(184,134,30,0.18)",
  "intake":         "rgba(184,134,30,0.42)",
  "scaffolded":     "rgba(217,164,58,0.65)",
  "in progress":    "rgba(217,164,58,0.92)",
  "complete":       "var(--gold)",
};

const STATUS_PULSE: Record<GlobeBranch["status"], boolean> = {
  "not yet opened": false,
  "intake": false,
  "scaffolded": false,
  "in progress": false,
  "complete": true,
};

export default function CanonGlobe({
  branches,
  size = 520,
  className = "",
  interactive = true,
  mode = "basalt",
}: Props) {
  const cx = 100, cy = 100, r = 72;
  const isDark = mode === "basalt";
  const sphereFill = isDark ? "var(--basalt-2)" : "var(--bone-2)";
  const meridian = "var(--gold)";
  const meridianDim = isDark ? "rgba(232,178,58,0.28)" : "rgba(184,134,30,0.35)";
  const terra = isDark ? "rgba(14,140,140,0.22)" : "rgba(14,140,140,0.18)";

  const meridians = [0, 30, 60, 90, 120, 150].map((deg) => ({
    rx: Math.abs(Math.cos((deg * Math.PI) / 180)) * r,
    deg,
  }));

  const parallels = [-45, -22.5, 0, 22.5, 45].map((lat) => {
    const rad = (lat * Math.PI) / 180;
    return {
      y: cy - Math.sin(rad) * r,
      rx: Math.cos(rad) * r,
      ry: Math.cos(rad) * r * 0.22,
      lat,
      prime: lat === 0,
    };
  });

  // Take up to the first 8 branches as ports (canonical 8-fold layout)
  const portBranches = branches.slice(0, 8);
  const ports = useMemo(() =>
    portBranches.map((b, i) => {
      const lon = (i / portBranches.length) * 360 - 180;
      const lat = i % 2 === 0 ? 16 : -20;
      const latR = (lat * Math.PI) / 180;
      const lonR = (lon * Math.PI) / 180;
      const x = cx + Math.cos(latR) * Math.sin(lonR) * r;
      const y = cy - Math.sin(latR) * r;
      const z = Math.cos(latR) * Math.cos(lonR);
      return { ...b, x, y, z, i };
    }),
  [portBranches]);

  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label="bucket.foundation interactive canon armillary"
      >
        <defs>
          <radialGradient id="cg-sphere" cx="0.35" cy="0.32" r="0.72">
            <stop offset="0" stopColor={isDark ? "#2A2A2A" : "var(--bone)"} />
            <stop offset="0.55" stopColor={sphereFill} />
            <stop offset="1" stopColor={isDark ? "#050505" : "var(--bone-3)"} />
          </radialGradient>
          <radialGradient id="cg-teal" cx="0.32" cy="0.3" r="0.6">
            <stop offset="0" stopColor={terra} />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="cg-limb" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.92" stopColor="var(--gold)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--gold)" stopOpacity="0.55" />
          </radialGradient>
          <filter id="cg-ring-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.7" />
          </filter>
        </defs>

        <circle cx={cx} cy={cy} r={r + 4} fill="url(#cg-limb)" />
        <circle cx={cx} cy={cy} r={r} fill="url(#cg-sphere)" />
        <circle cx={cx} cy={cy} r={r} fill="url(#cg-teal)" />

        <g className="spin-slow" style={{ transformOrigin: "100px 100px" }}>
          {meridians.map((m, i) => (
            <g key={`m-${i}`} filter="url(#cg-ring-shadow)">
              <ellipse
                cx={cx} cy={cy}
                rx={Math.max(m.rx, 0.4)} ry={r}
                fill="none"
                stroke={meridian}
                strokeOpacity={i === 0 ? 0.65 : 0.28}
                strokeWidth={i === 0 ? 0.9 : 0.5}
              />
            </g>
          ))}
          {parallels.map((p, i) => (
            <ellipse
              key={`p-${i}`}
              cx={cx} cy={p.y}
              rx={p.rx} ry={p.ry}
              fill="none"
              stroke={p.prime ? meridian : meridianDim}
              strokeOpacity={p.prime ? 0.55 : 0.28}
              strokeWidth={p.prime ? 0.8 : 0.4}
            />
          ))}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={meridian} strokeOpacity="0.45" strokeWidth="0.7" />
          <circle cx={cx} cy={cy} r={r + 1.8} fill="none" stroke={meridian} strokeOpacity="0.2" strokeWidth="0.3" />
        </g>

        {ports.map((p) => {
          const visible = p.z > 0;
          const opacity = visible ? 1 : 0.22;
          const fill = STATUS_FILL[p.status];
          const isHover = hover === p.i;
          const pulse = STATUS_PULSE[p.status];
          return (
            <g key={p.slug} opacity={opacity}>
              {/* Outer ring */}
              <circle cx={p.x} cy={p.y} r={isHover ? 4.4 : 3.6} fill="var(--basalt)" />
              <circle cx={p.x} cy={p.y} r={isHover ? 3.4 : 2.6} fill={fill}>
                {pulse && (
                  <animate attributeName="r" values={`2.4;3.2;2.4`} dur="2.4s" repeatCount="indefinite" />
                )}
              </circle>
              <text
                x={p.x}
                y={p.y - 6}
                textAnchor="middle"
                fontSize="3.2"
                fill={isDark ? "var(--gold)" : "var(--gold-deep)"}
                style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.05em" }}
              >
                {p.numeral}
              </text>
              {interactive && (
                <Link href={`/canon/${p.slug}`}>
                  <circle
                    cx={p.x} cy={p.y} r={6}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover(p.i)}
                    onMouseLeave={() => setHover((h) => (h === p.i ? null : h))}
                  >
                    <title>{`${p.numeral} · ${p.name} — ${p.status} (${p.entryCount} entries)`}</title>
                  </circle>
                </Link>
              )}
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r="1.4" fill="var(--gold)" />
        <circle cx={cx} cy={cy} r="3.0" fill="none" stroke="var(--gold)" strokeOpacity="0.4" strokeWidth="0.3" />
      </svg>

      {interactive && hover !== null && ports[hover] && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-2 small-caps text-[11px] text-[color:var(--basalt)] bg-[color:var(--bone)] border border-[color:var(--hairline)] px-3 py-1 shadow-sm"
          style={{ whiteSpace: "nowrap" }}
        >
          {ports[hover].numeral} · {ports[hover].name} · {ports[hover].status} · {ports[hover].entryCount} entries
        </div>
      )}
    </div>
  );
}
