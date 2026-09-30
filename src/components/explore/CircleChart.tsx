"use client";

import { useEffect, useRef } from "react";
import { CIRCLE_RADIUS, RINGS, ariaSummary, labelLayout, polygonPoints, smoothLoop, spokeDirection, wrapLabel } from "@/lib/explore/circle";
import type { ScoreScale, SpaceComponent } from "@/lib/explore/space";

export interface ChartSeries {
  id: string;
  name: string;
  scores: number[];
  stroke: string;
  fill: string;
  opacity: number;
  dash?: string;
}

interface Props {
  components: SpaceComponent[];
  series: ChartSeries[];
  onStep?(delta: number): void;
  scale?: ScoreScale;
}

const LABEL_GAP = 14;

export default function CircleChart({ components, series, onStep, scale = "standardized" }: Props) {
  const host = useRef<SVGSVGElement>(null);
  const labels = components.map((c) => c.label ?? c.top_terms[0] ?? String(c.index));

  useEffect(() => {
    const el = host.current;
    if (!el || !onStep) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      onStep(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [onStep]);

  return (
    <svg
      ref={host}
      data-testid="circle-chart"
      viewBox="-230 -200 460 400"
      className="w-full h-full"
      role="img"
      aria-label={ariaSummary(labels, series, scale)}
      preserveAspectRatio="xMidYMid meet"
      style={{ color: "#EFE8D4" }}
    >
      {RINGS.map((f) => (
        <circle key={f} r={CIRCLE_RADIUS * f} fill="none" stroke="currentColor" strokeOpacity={0.15} />
      ))}
      {components.map((c, i) => {
        const dir = spokeDirection(c);
        const lines = wrapLabel(labels[i], Math.abs(dir[0]) < 0.3 ? 30 : 16);
        const { anchor, shift } = labelLayout(dir, lines.length);
        const lx = (CIRCLE_RADIUS + LABEL_GAP) * dir[0];
        const ly = (CIRCLE_RADIUS + LABEL_GAP) * dir[1];
        return (
          <g key={c.index}>
            <line x1={0} y1={0} x2={CIRCLE_RADIUS * dir[0]} y2={CIRCLE_RADIUS * dir[1]} stroke="currentColor" strokeOpacity={0.15} />
            <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fontSize={9} fill="currentColor">
              {lines.map((line, j) => (
                <tspan key={j} x={lx} dy={j === 0 ? `${shift}em` : "1.1em"}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
      {series.map((s) => {
        const pts = polygonPoints(s.scores, components, CIRCLE_RADIUS, scale);
        return (
          <g key={s.id} data-series={s.id} data-vertices={pts.length}>
            <path d={smoothLoop(pts)} fill={s.fill} fillOpacity={s.opacity} stroke={s.stroke} strokeWidth={1.6} strokeDasharray={s.dash ?? "none"} />
            {!s.dash && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={2.4} fill={s.stroke} />)}
          </g>
        );
      })}
    </svg>
  );
}
