import { MODES as originalModes } from "../../../../src/lib/explore/modes";
import { DNA_SLOTS } from "../../../../src/lib/explore/modes/dna";
import { helixFrame, helixPoint, HELIX_RADIUS, HELIX_STEP } from "../../../../src/lib/explore/modes/helix";
import { ribbonMesh } from "../../../../src/lib/explore/helicoid";
import type { ExploreMode, Guide, SceneLayout, Vec3 } from "../../../../src/lib/explore/modes/types";

import { circleLayout } from "./circle-layout";
import type { CircleGraph } from "./chem-circle";
import { hasMapAxes, sourceMap } from "./source-map";

const horizontal = ([x, y, z]: Vec3): Vec3 => [y, -x, z];

export interface DesktopLayout extends SceneLayout {
  canonEarth?: boolean;
  circle?: CircleGraph;
  circleError?: string;
  axisLength?: number;
  helicoid?: ReturnType<typeof dnaRibbon>;
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

export const MODES: ExploreMode[] = desktopModes.map((mode) => mode.id === "map" ? { ...mode, layout: (hits, context) => hasMapAxes(context.map) ? mode.layout(hits, context) : sourceMap(hits) } : ["globe", "earth"].includes(mode.id) ? { ...mode, layout(hits, context): DesktopLayout { const base = mode.layout(hits, context); return { ...base, canonEarth: true, guides: [] }; } } : ["particle", "molecule", "reaction"].includes(mode.id) ? { ...mode, layout: (hits, context) => circleLayout(mode, hits, context) } : !["helix", "dna"].includes(mode.id) ? mode : {
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

export function modeById(id: string | null | undefined): ExploreMode {
  return MODES.find((mode) => mode.id === id) ?? MODES[0];
}
