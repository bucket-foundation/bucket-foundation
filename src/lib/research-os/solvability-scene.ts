import { BRANCH_COLOR } from "../../components/canon-globe/projections";
import type { Guide, LegendItem, SceneLayout, SceneLink, SceneNode, Vec3 } from "../explore/modes/types";
import type { AtlasProduction } from "./solvability-atlas";
import { BRANCHES } from "./solvability-atlas";
import { ERAS, SPHERE_RADIUS, axisPoint, eraOf, place, ringPoint, sharedTokenEdges, smoothedRadius, spaceRadius, type SpaceView } from "./solvability-space";

export const SCENE_SCALE = 0.2;
export const BUCKETMATH_COLOR = "#8A7A5A";
export const GUIDE_COLOR = "#8C8577";
export const SURFACE_COLOR = "#D9A43A";
export const SELECTED_LINK = "#EFE8D4";

const CAMERA: Record<SpaceView, Vec3> = { circle: [0, 0, 3.2], sphere: [0, 0.8, 3], slices: [-0.8, 3.4, 2.4], helix: [-0.8, 3.4, 2.4] };

export function branchColor(branch: string): string {
  return BRANCH_COLOR[branch] ?? BUCKETMATH_COLOR;
}

const s = (p: Vec3): Vec3 => [p[0] * SCENE_SCALE, p[1] * SCENE_SCALE, p[2] * SCENE_SCALE];

function loop(f: (a: number) => Vec3, n = 64): Vec3[] {
  return Array.from({ length: n + 1 }, (_, k) => s(f((k / n) * Math.PI * 2)));
}

export function solvabilityGuides(view: SpaceView, rows: AtlasProduction[]): Guide[] {
  if (view === "circle") return [0, 0.5, 1].map((v) => ({ kind: "line", points: loop((a) => [Math.cos(a) * spaceRadius(v) * 2.2, Math.sin(a) * spaceRadius(v) * 2.2, 0]), color: GUIDE_COLOR }));
  if (view === "sphere") {
    const out: Guide[] = [{ kind: "sphere", radius: SPHERE_RADIUS * SCENE_SCALE * 0.985, color: SURFACE_COLOR, opacity: 0.08 }];
    for (let e = 0; e <= ERAS.length; e++) {
      const lat = (e / ERAS.length - 0.5) * Math.PI * 0.9;
      out.push({ kind: "line", points: loop((a) => [Math.cos(lat) * Math.cos(a) * SPHERE_RADIUS, Math.sin(lat) * SPHERE_RADIUS, -Math.cos(lat) * Math.sin(a) * SPHERE_RADIUS]), color: GUIDE_COLOR });
    }
    return out;
  }
  const out: Guide[] = [{ kind: "line", points: [s(axisPoint(0)), s(axisPoint(ERAS.length))], color: GUIDE_COLOR }];
  ERAS.forEach((e, i) => {
    const u = view === "slices" ? i + 0.5 : i;
    out.push({ kind: "line", points: loop((a) => ringPoint(u, 2.5, a)), color: GUIDE_COLOR });
    out.push({ kind: "text", position: s(ringPoint(u, 2.9, Math.PI / 2)), text: e.label, color: GUIDE_COLOR, size: 0.05 });
  });
  const surfaceRings = view === "helix" ? Array.from({ length: 37 }, (_, i) => (i / 36) * ERAS.length) : ERAS.map((_, i) => i + 0.5);
  for (const u of surfaceRings) {
    const inEra = view === "slices" ? rows.filter((p) => eraOf(p.posed) === Math.floor(u)) : rows;
    if (inEra.length) out.push({ kind: "line", points: loop((a) => ringPoint(u, smoothedRadius(inEra, u, a, view === "helix" ? "helix" : "slices"), a), 48), color: SURFACE_COLOR });
  }
  return out;
}

export function solvabilityLayout(rows: AtlasProduction[], view: SpaceView, year: number, selected: string | null): SceneLayout {
  const visible = rows.filter((p) => p.posed <= year);
  const nodes: SceneNode[] = visible.map((p) => {
    const solved = p.resolved != null && p.resolved <= year;
    return { id: p.id, position: s(place(p, view)), color: branchColor(p.branch), size: solved ? 0.034 : 0.024, label: p.id === selected ? p.title : undefined };
  });
  const links: SceneLink[] = selected ? sharedTokenEdges(visible).filter(([a, b]) => a === selected || b === selected).map(([from, to]) => ({ from, to, color: SELECTED_LINK })) : [];
  const present = new Set(visible.map((p) => p.branch));
  const legend: LegendItem[] = BRANCHES.filter((b) => present.has(b)).map((b) => ({ label: b, color: branchColor(b) }));
  return { nodes, links, guides: solvabilityGuides(view, visible), legend, camera: CAMERA[view], spin: view === "sphere" ? 0.05 : 0, wheel: "zoom" };
}
