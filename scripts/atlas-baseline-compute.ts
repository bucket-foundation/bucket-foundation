import atlas from "../src/lib/research-os/solvability-atlas-data.json";
import type { SolvabilityAtlasData } from "../src/lib/research-os/solvability-atlas";
import { SPACE_VIEWS, place, smoothedRadius, timeCoord } from "../src/lib/research-os/solvability-space";

const rows = (atlas as SolvabilityAtlasData).productions;
const SAMPLE_U = [0.25, 0.5, 1.5, 2.75, 3.5, 4.5, 5.75];
const SAMPLE_ANGLE = [-2.5, -1, 0, 0.7, 2, 3.1];

export interface AtlasBaseline {
  places: Record<string, Record<string, number[]>>;
  timeCoords: Record<string, number>;
  smoothed: Record<string, number>;
}

export function computeAtlasBaseline(): AtlasBaseline {
  const places: AtlasBaseline["places"] = {};
  const timeCoords: AtlasBaseline["timeCoords"] = {};
  for (const p of rows) {
    timeCoords[p.id] = timeCoord(p.posed);
    places[p.id] = Object.fromEntries(SPACE_VIEWS.map((v) => [v, place(p, v)]));
  }
  for (const year of [1500, 1600, 1750, 1899, 1900, 1949, 1950, 1979, 1980, 1999, 2000, 2019, 2020, 2026]) timeCoords[`year:${year}`] = timeCoord(year);
  const smoothed: AtlasBaseline["smoothed"] = {};
  for (const view of ["slices", "helix"] as const)
    for (const u of SAMPLE_U) for (const a of SAMPLE_ANGLE) smoothed[`${view}:${u}:${a}`] = smoothedRadius(rows, u, a, view);
  return { places, timeCoords, smoothed };
}
