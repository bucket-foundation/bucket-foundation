import atlas from "../src/lib/research-os/solvability-atlas-data.json";
import type { SolvabilityAtlasData } from "../src/lib/research-os/solvability-atlas";
import { SPACE_VIEWS, axisPoint, helixAngle, place, ringPoint, sharedTokenEdges, sliceRows, smoothedRadius, spaceRadius, timeCoord, eraOf } from "../src/lib/research-os/solvability-space";

const rows = (atlas as SolvabilityAtlasData).productions;
const SAMPLE_U = [0.25, 0.5, 1.5, 2.75, 3.5, 4.5, 5.75];
const SAMPLE_ANGLE = [-2.5, -1, 0, 0.7, 2, 3.1];

export function computeGeometryBaseline() {
  const places: Record<string, Record<string, number[]>> = {};
  const times: Record<string, number> = {};
  for (const p of rows) {
    times[p.id] = timeCoord(p.posed);
    places[p.id] = Object.fromEntries(SPACE_VIEWS.map((v) => [v, place(p, v)]));
  }
  for (const year of [1500, 1600, 1750, 1899, 1900, 1949, 1950, 1979, 1980, 1999, 2000, 2019, 2020, 2026]) times[`year:${year}`] = timeCoord(year);
  const smoothed: Record<string, number> = {};
  for (const view of ["slices", "helix"] as const) for (const u of SAMPLE_U) for (const a of SAMPLE_ANGLE) smoothed[`${view}:${u}:${a}`] = smoothedRadius(rows, u, a, view);
  const axis = SAMPLE_U.map((u) => axisPoint(u));
  const rings = SAMPLE_U.flatMap((u) => SAMPLE_ANGLE.map((a) => ringPoint(u, spaceRadius(0.5), a)));
  const helix = SAMPLE_U.flatMap((u) => SAMPLE_ANGLE.map((a) => helixAngle(a, u)));
  const eras = rows.map((p) => eraOf(p.posed));
  const edges = sharedTokenEdges(rows);
  const slices = [0, 1, 2, 3, 4, 5].map((e) => sliceRows(rows, e, 1990 + e * 5).map((p) => p.id));
  return { places, times, smoothed, axis, rings, helix, eras, edges, slices };
}
