import type { Hit } from "../search";
import type { GenomeSummary } from "../genome/parse";
import type { MapModel } from "../map";

export type Vec3 = [number, number, number];

export interface SceneNode {
  id: string;
  position: Vec3;
  color: string;
  size: number;
  label?: string;
}

export interface SceneLink {
  from: string;
  to: string;
  color?: string;
}

export type Guide =
  | { kind: "sphere"; center?: Vec3; radius: number; color: string; opacity: number; wireframe?: boolean }
  | { kind: "ring"; center?: Vec3; radius: number; color: string; tilt?: number }
  | { kind: "line"; points: Vec3[]; color: string }
  | { kind: "tube"; points: Vec3[]; color: string; radius: number }
  | { kind: "text"; position: Vec3; text: string; color: string; size?: number };

export interface LegendItem {
  label: string;
  color: string;
}

export interface SceneLayout {
  nodes: SceneNode[];
  links: SceneLink[];
  guides: Guide[];
  legend: LegendItem[];
  camera: Vec3;
  spin?: number;
  wheel?: "zoom" | "scroll";
}

export interface ModeContext {
  selected: string | null;
  scroll: number;
  genome?: GenomeSummary | null;
  extraHits?: Hit[];
  element?: number;
  molecule?: string;
  reaction?: string;
  map?: MapModel | null;
  youText?: string;
}

export interface ExploreMode {
  id: string;
  label: string;
  renderer?: "scene" | "protein";
  layout(hits: Hit[], ctx: ModeContext): SceneLayout;
}

export function linksFromHits(hits: Hit[], nodeIds: Set<string>, color?: string): SceneLink[] {
  const seen = new Set<string>();
  const out: SceneLink[] = [];
  for (const h of hits) {
    if (!nodeIds.has(h.id)) continue;
    for (const to of h.links) {
      if (!nodeIds.has(to)) continue;
      const key = h.id < to ? `${h.id}|${to}` : `${to}|${h.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ from: h.id, to, color });
    }
  }
  return out;
}
