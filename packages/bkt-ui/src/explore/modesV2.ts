import { MODES as originalModes } from "../../../../src/lib/explore/modes";
import { DNA_SLOTS } from "../../../../src/lib/explore/modes/dna";
import { helixFrame, helixPoint, HELIX_RADIUS, HELIX_STEP } from "../../../../src/lib/explore/modes/helix";
import { ribbonMesh } from "../../../../src/lib/explore/helicoid";
import type { ExploreMode, Guide, SceneLayout, Vec3 } from "../../../../src/lib/explore/modes/types";
import type { Hit } from "../../../../src/lib/explore/search";

import { circleLayout } from "./circle-layout";
import type { CircleGraph } from "./chem-circle";
import { isRowScene, type RowScene } from "./rows";
import { hasMapAxes, sourceMap } from "./source-map";

const horizontal = ([x, y, z]: Vec3): Vec3 => [y, -x, z];

export interface DesktopLayout extends SceneLayout {
  canonEarth?: boolean;
  circle?: CircleGraph;
  circleError?: string;
  axisLength?: number;
  helicoid?: ReturnType<typeof dnaRibbon>;
  linkStyles?: Record<string, LinkStyle>;
  hollow?: string[];
  notice?: string;
}

export interface LinkStyle {
  width: number;
  dashed: boolean;
}

export const ROW_MODE_IDS: readonly string[] = ["graph", "map"];
export const FORCE_NODE_CAP = 300;
export const NO_ROWS = "No row matches.";

function note(text: string): DesktopLayout {
  return { nodes: [], links: [], guides: [{ kind: "text", position: [0, 0, 0], text, color: "#6B6252", size: 13 }], legend: [], camera: [0, 0, 5], wheel: "zoom", notice: text };
}

export function rowStyles(hits: Hit[], scene: RowScene): { linkStyles: Record<string, LinkStyle>; hollow: string[] } {
  const shown = new Set(hits.map((hit) => hit.id));
  const weights = (scene.edgeWeight ?? []).flat();
  const heaviest = weights.length ? Math.max(...weights) : 1;
  const linkStyles: Record<string, LinkStyle> = {};
  const hollow: string[] = [];
  for (const hit of hits) {
    const i = scene.at[hit.id];
    if (i === undefined) continue;
    if (scene.verified && scene.verified[i] === false) hollow.push(hit.id);
    hit.links.forEach((to, j) => {
      if (!shown.has(to)) return;
      const weight = scene.edgeWeight?.[i]?.[j];
      const style = { width: weight === undefined ? 1 : 1 + 3 * weight / heaviest, dashed: scene.edgeStated ? scene.edgeStated[i]?.[j] !== true : false };
      linkStyles[`${hit.id}|${to}`] = style;
      linkStyles[`${to}|${hit.id}`] ??= style;
    });
  }
  return { linkStyles, hollow };
}

export function withRows(mode: ExploreMode): ExploreMode {
  const drawn = new WeakMap<Hit[], { scene: RowScene; layout: DesktopLayout }>();
  const draw = (hits: Hit[], context: Parameters<ExploreMode["layout"]>[1], scene: RowScene): DesktopLayout => {
    const held = drawn.get(hits);
    if (held?.scene === scene) return held.layout;
    const layout = rowLayout(mode, hits, context, scene);
    drawn.set(hits, { scene, layout });
    return layout;
  };
  return {
    ...mode,
    layout(hits, context): DesktopLayout {
      const scene = context.rows;
      return isRowScene(scene) ? draw(hits, context, scene) : mode.layout(hits, context);
    },
  };
}

function rowLayout(mode: ExploreMode, hits: Hit[], context: Parameters<ExploreMode["layout"]>[1], scene: RowScene): DesktopLayout {
  if (!ROW_MODE_IDS.includes(mode.id)) return note(`${mode.label} cannot draw this data.`);
  if (!hits.length) return note(NO_ROWS);
  if (mode.id === "graph" && hits.length > FORCE_NODE_CAP) return note(`Graph draws up to ${FORCE_NODE_CAP} rows, and this page holds ${hits.length}. Narrow the search.`);
  const base = mode.id === "map" ? sourceMap(hits) : mode.layout(hits, context);
  const groups = new Map(scene.groups.map((group) => [group.id, group]));
  const branch = new Map(hits.map((hit) => [hit.id, hit.branch]));
  const present = new Set(branch.values());
  const shown = new Set(branch.keys());
  return {
    ...base,
    nodes: base.nodes.filter((node) => shown.has(node.id)).map((node) => ({ ...node, color: groups.get(branch.get(node.id) ?? "")?.color ?? node.color })),
    links: base.links.filter((link) => shown.has(link.from) && shown.has(link.to)),
    guides: base.guides.map((guide) => guide.kind === "text" && groups.has(guide.text) ? { ...guide, text: groups.get(guide.text)!.label, color: groups.get(guide.text)!.color } : guide),
    legend: scene.groups.filter((group) => present.has(group.id)).map((group) => ({ label: group.label, color: group.color })),
    ...rowStyles(hits, scene),
  };
}

export function dnaRibbon(scroll: number) {
  const frame = helixFrame(scroll);
  const mesh = ribbonMesh((DNA_SLOTS - 1) * 6, 4);
  const positions = mesh.positions.map((_, index) => {
    const slot = Math.floor(index / (mesh.across + 1)) / mesh.steps * (DNA_SLOTS - 1);
    const radius = HELIX_RADIUS * (-1 + (index % (mesh.across + 1)) / mesh.across * 2);
    return horizontal(helixPoint(slot, DNA_SLOTS, 0, frame, radius));
  });
  const rungs: Vec3[] = [];
  for (let slot = 0; slot < DNA_SLOTS; slot++) {
    rungs.push(horizontal(helixPoint(slot, DNA_SLOTS, 0, frame)), horizontal(helixPoint(slot, DNA_SLOTS, 1, frame)));
  }
  return { ...mesh, positions, rungs };
}

function horizontalGuide(guide: Guide): Guide {
  if (guide.kind === "tube" || guide.kind === "line" || guide.kind === "points") {
    return { ...guide, points: guide.points.map(horizontal) };
  }
  if (guide.kind === "text") return { ...guide, position: horizontal(guide.position) };
  return guide;
}

const markerRanges: Record<string, [number, number]> = {
  globe: [0.018, 0.048],
  earth: [0.018, 0.048],
  helix: [0.03, 0.06],
  graph: [0.03, 0.065],
  timeline: [0.028, 0.058],
};

const desktopModes = originalModes.map((mode): ExploreMode => markerRanges[mode.id] ? {
  ...mode,
  layout(hits, context) {
    const layout = mode.layout(hits, context);
    const ids = new Set(hits.map((hit) => hit.id));
    const [min, max] = markerRanges[mode.id];
    return { ...layout, nodes: layout.nodes.map((node) => ids.has(node.id) ? { ...node, size: Number.isFinite(node.size) ? Math.max(min, Math.min(max, node.size)) : min } : node) };
  },
} : mode);

const sceneModes: ExploreMode[] = desktopModes.map((mode) => mode.id === "map" ? { ...mode, layout: (hits, context) => hasMapAxes(context.map) ? mode.layout(hits, context) : sourceMap(hits) } : ["globe", "earth"].includes(mode.id) ? { ...mode, layout(hits, context): DesktopLayout { const base = mode.layout(hits, context); return { ...base, canonEarth: true, guides: [] }; } } : ["particle", "molecule", "reaction"].includes(mode.id) ? { ...mode, layout: (hits, context) => circleLayout(mode, hits, context) } : !["helix", "dna"].includes(mode.id) ? mode : {
  ...mode,
  layout(hits, context): DesktopLayout {
    const layout = mode.layout(hits, context);
    return {
      ...layout,
      nodes: layout.nodes.map((node) => ({ ...node, position: horizontal(node.position) })),
      guides: layout.guides.map(horizontalGuide),
      axisLength: ((mode.id === "dna" ? DNA_SLOTS : Math.max(hits.length, 2)) - 1) * HELIX_STEP + 2,
      ...(mode.id === "dna" ? { helicoid: dnaRibbon(context.scroll) } : {}),
    };
  },
});

export const MODES: ExploreMode[] = sceneModes.map(withRows);

export function modeById(id: string | null | undefined): ExploreMode {
  return MODES.find((mode) => mode.id === id) ?? MODES[0];
}
