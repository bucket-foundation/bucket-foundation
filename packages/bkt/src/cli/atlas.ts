import { writeFileSync } from "node:fs";
import staff from "../../content/staff-ros.json" with { type: "json" };
import type { SolvabilityAtlasData } from "../../../../src/lib/research-os/solvability-atlas";
import { buildFrontier, type Frontier, type SimilarityData } from "../../../../src/lib/research-os/solvability-frontier";
import { frontierSvg, frontierText } from "../../../../src/lib/research-os/solvability-frontier-render";

export const MIN_WIDTH = 41;
export const MAX_WIDTH = 200;
export const DEFAULT_WIDTH = 79;

export interface FrontierOptions {
  reach: number | undefined;
  svg: string | null;
  width: number | null;
}

export function frontierOptions(values: Record<string, unknown>): FrontierOptions {
  const reach = values.reach === undefined ? undefined : Number(values.reach);
  if (reach !== undefined && !(reach > 0 && reach < 1)) throw new Error("give --reach as a number above 0 and below 1, such as 0.8");
  const width = values.width === undefined ? null : Number(values.width);
  if (width !== null && !(Number.isInteger(width) && width >= MIN_WIDTH && width <= MAX_WIDTH)) throw new Error(`give --width as a whole number from ${MIN_WIDTH} to ${MAX_WIDTH}`);
  const svg = typeof values.svg === "string" ? values.svg : null;
  if (svg !== null && !svg.trim()) throw new Error("--svg needs a file name");
  return { reach, svg, width };
}

export const NO_ATLAS = "this copy of bkt holds no solvability atlas; a staff build includes it";

export function atlasFrontier(reach?: number, data: Record<string, unknown> = staff): Frontier | null {
  const atlas = data.solvability as SolvabilityAtlasData | undefined;
  const similarity = data.similarity as SimilarityData | undefined;
  if (!atlas || !similarity) return null;
  return buildFrontier(atlas.productions, similarity, reach);
}

export function fitWidth(columns: number | undefined): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, (columns ?? DEFAULT_WIDTH + 1) - 1));
}

export function frontierLines(f: Frontier, width: number, color: boolean): string[] {
  return frontierText(f, { width, color });
}

export function writeFrontierSvg(f: Frontier, file: string): void {
  writeFileSync(file, `${frontierSvg(f)}\n`);
}
