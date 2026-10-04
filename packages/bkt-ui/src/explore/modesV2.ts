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

export const MODES: ExploreMode[] = originalModes.map((mode) => mode.id === "map" ? { ...mode, layout: (hits, context) => hasMapAxes(context.map) ? mode.layout(hits, context) : sourceMap(hits) } : ["globe", "earth"].includes(mode.id) ? { ...mode, layout(hits, context): DesktopLayout { const base = mode.layout(hits, context); return { ...base, nodes: base.nodes.map((node) => ({ ...node, size: Number.isFinite(node.size) ? Math.max(0.018, Math.min(0.048, node.size)) : 0.018 })), canonEarth: true, guides: [] }; } } : ["particle", "molecule", "reaction"].includes(mode.id) ? { ...mode, layout: (hits, context) => circleLayout(mode, hits, context) } : !["helix", "dna"].includes(mode.id) ? mode : {
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
