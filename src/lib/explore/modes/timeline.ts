import { BRANCH_COLOR, BRANCH_ORDER, bareBranch, branchIndex } from "../../../components/canon-globe/projections";
import { ALL_EVENTS, MAX_YEAR, MIN_YEAR } from "../../canon-explorer/markers";
import type { Hit } from "../search";
import { ADVISOR_COLOR, WORK_COLOR, hitColor } from "./globe";
import { linksFromHits, type ExploreMode, type Guide, type SceneNode, type Vec3 } from "./types";

export interface EraBand {
  id: string;
  label: string;
  from: number;
  to: number;
}

export const ERA_BANDS: EraBand[] = [
  { id: "deep", label: "Deep history", from: MIN_YEAR, to: -3000 },
  { id: "antiquity", label: "Antiquity", from: -3000, to: 500 },
  { id: "medieval", label: "Medieval", from: 500, to: 1500 },
  { id: "early-modern", label: "Early modern", from: 1500, to: 1800 },
  { id: "modern", label: "Modern", from: 1800, to: 1950 },
  { id: "contemporary", label: "Contemporary", from: 1950, to: MAX_YEAR },
];

export const BAND_WIDTH = 1.1;
export const UNDATED_WIDTH = 2.2;
export const UNDATED_ROW = 14;
export const LANE_HEIGHT = 0.3;
export const LANES = [...BRANCH_ORDER, "advisor", "work"] as string[];
const AXIS_LEFT = -((ERA_BANDS.length * BAND_WIDTH + UNDATED_WIDTH) / 2);

export function eraOf(year: number): EraBand {
  return ERA_BANDS.find((b) => year < b.to) ?? ERA_BANDS[ERA_BANDS.length - 1];
}

export function eraEventCount(band: EraBand): number {
  return ALL_EVENTS.filter((e) => eraOf(e.year).id === band.id).length;
}

export function yearX(year: number): number {
  const clamped = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));
  const band = eraOf(clamped);
  const t = (clamped - band.from) / (band.to - band.from);
  return AXIS_LEFT + (ERA_BANDS.indexOf(band) + t) * BAND_WIDTH;
}

export function undatedSpot(slot: number, count: number): { x: number; row: number } {
  const start = AXIS_LEFT + ERA_BANDS.length * BAND_WIDTH;
  const perRow = Math.min(UNDATED_ROW, Math.max(1, count));
  return { x: start + UNDATED_WIDTH * (((slot % UNDATED_ROW) + 0.5) / perRow), row: Math.floor(slot / UNDATED_ROW) };
}

export function undatedX(slot: number, count: number): number {
  return undatedSpot(slot, count).x;
}

export function laneOf(h: Hit): number {
  if (h.type === "advisor") return BRANCH_ORDER.length;
  if (h.type === "work") return BRANCH_ORDER.length + 1;
  return branchIndex(h.branch);
}

export function laneY(lane: number): number {
  return ((LANES.length - 1) / 2 - lane) * LANE_HEIGHT;
}

export function yearLabel(year: number): string {
  return year < 0 ? `${-year} BCE` : String(year);
}

function eraGuides(): Guide[] {
  const top = laneY(0) + LANE_HEIGHT;
  const bottom = laneY(LANES.length - 1) - LANE_HEIGHT;
  const out: Guide[] = [];
  ERA_BANDS.forEach((b, i) => {
    const x0 = AXIS_LEFT + i * BAND_WIDTH;
    out.push({ kind: "line", points: [[x0, bottom, 0], [x0, top, 0]], color: "#3A362E" });
    out.push({ kind: "line", points: [[x0, top, 0], [x0 + BAND_WIDTH, top, 0]], color: i % 2 ? "#6B6252" : "#8C7B4F" });
    out.push({ kind: "text", position: [x0 + BAND_WIDTH / 2, top + 0.14, 0], text: `${b.label} · ${eraEventCount(b)}`, color: "#B8AE94", size: 10 });
    out.push({ kind: "text", position: [x0, bottom - 0.14, 0], text: yearLabel(b.from), color: "#8A8170", size: 9 });
  });
  const undatedStart = AXIS_LEFT + ERA_BANDS.length * BAND_WIDTH;
  out.push({ kind: "line", points: [[undatedStart, bottom, 0], [undatedStart, top, 0]], color: "#3A362E" });
  out.push({ kind: "text", position: [undatedStart + UNDATED_WIDTH / 2, top + 0.14, 0], text: "Undated", color: "#B8AE94", size: 10 });
  out.push({ kind: "line", points: [[AXIS_LEFT, bottom, 0], [undatedStart + UNDATED_WIDTH, bottom, 0]], color: "#6B6252" });
  return out;
}

export function timelinePositions(hits: Hit[]): Map<string, Vec3> {
  const out = new Map<string, Vec3>();
  const dated = hits.filter((h) => h.year !== null).sort((a, b) => (a.year as number) - (b.year as number) || (a.id < b.id ? -1 : 1));
  const undated = hits.filter((h) => h.year === null).sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  const stack = new Map<string, number>();
  for (const h of dated) {
    const lane = laneOf(h);
    const x = yearX(h.year as number);
    const key = `${lane}|${Math.round(x / 0.06)}`;
    const level = stack.get(key) ?? 0;
    stack.set(key, level + 1);
    out.set(h.id, [x, laneY(lane) + (level % 4) * 0.06 - 0.09, level * 0.001]);
  }
  const perLane = new Map<number, Hit[]>();
  for (const h of undated) perLane.set(laneOf(h), [...(perLane.get(laneOf(h)) ?? []), h]);
  perLane.forEach((group, lane) => {
    group.forEach((h, slot) => {
      const spot = undatedSpot(slot, group.length);
      out.set(h.id, [spot.x, laneY(lane) + (spot.row % 4) * 0.06 - 0.09, 0]);
    });
  });
  return out;
}

export const timelineMode: ExploreMode = {
  id: "timeline",
  label: "Timeline",
  layout(hits) {
    const pos = timelinePositions(hits);
    const nodes: SceneNode[] = hits.map((h) => ({
      id: h.id,
      position: pos.get(h.id)!,
      color: hitColor(h),
      size: 0.028 + 0.03 * h.score,
      label: h.year === null ? h.title : `${h.title} · ${yearLabel(h.year)}`,
    }));
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      links: linksFromHits(hits, ids, "#4A4536"),
      guides: eraGuides(),
      legend: [
        ...BRANCH_ORDER.filter((b) => hits.some((h) => h.type === "excerpt" && bareBranch(h.branch) === b)).map((b) => ({ label: b, color: BRANCH_COLOR[b] })),
        { label: "advisor", color: ADVISOR_COLOR },
        { label: "work", color: WORK_COLOR },
      ],
      camera: [0, 0, 8],
    };
  },
};
