import { globeMode } from "./globe";
import { helixMode } from "./helix";
import { dnaMode } from "./dna";
import { atomMode } from "./atom";
import { particleMode } from "./particle";
import { moleculeMode, reactionMode } from "./chem";
import { proteinMode } from "./protein";
import { graphMode } from "./graph";
import { timelineMode } from "./timeline";
import { earthMode } from "./earth";
import { mapMode } from "./map";
import type { ExploreMode } from "./types";

export const MODES: ExploreMode[] = [globeMode, helixMode, dnaMode, atomMode, particleMode, moleculeMode, reactionMode, proteinMode, graphMode, timelineMode, earthMode, mapMode];

export function modeById(id: string | null | undefined): ExploreMode {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
