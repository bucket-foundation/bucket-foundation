import { globeMode } from "./globe";
import type { ExploreMode } from "./types";

export const MODES: ExploreMode[] = [globeMode];

export function modeById(id: string | null | undefined): ExploreMode {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
