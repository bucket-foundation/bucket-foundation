import { globeMode } from "./globe";
import { helixMode } from "./helix";
import { dnaMode } from "./dna";
import { atomMode } from "./atom";
import { particleMode } from "./particle";
import type { ExploreMode } from "./types";

export const MODES: ExploreMode[] = [globeMode, helixMode, dnaMode, atomMode, particleMode];

export function modeById(id: string | null | undefined): ExploreMode {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
