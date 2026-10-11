import raw from "@/data/research-maps/completeness.json";
import type { Rect } from "./treemap";

export type CompletenessCell = { code: string; label: string; rows: number; verified: number; curated: number; read: number | null; kept: boolean };
export type CompletenessGroup = { id: string; title: string; cells: CompletenessCell[] };
export type CompletenessDimension = {
  id: string;
  title: string;
  test: string;
  score: number;
  cells: number;
  anyVerified: number;
  kept: number;
  groups: CompletenessGroup[];
};
export type CompletenessData = {
  date: string;
  source: string;
  overall: number;
  corpusRows: number;
  corpusVerified: number;
  frameCells: number;
  scoredCells: number;
  dimensions: CompletenessDimension[];
};

export function loadCompleteness(): CompletenessData {
  return raw;
}

export type VerifiedBin = { min: number; label: string; fill: string; ink: string };

export const VERIFIED_BINS: VerifiedBin[] = [
  { min: 0, label: "No verified row", fill: "#FBF7EA", ink: "#6F6A5E" },
  { min: 1, label: "1 to 9", fill: "#DCE8E0", ink: "#1F1C16" },
  { min: 10, label: "10 to 99", fill: "#B5D0C7", ink: "#1F1C16" },
  { min: 100, label: "100 to 999", fill: "#7FAFA6", ink: "#1F1C16" },
  { min: 1000, label: "1,000 to 9,999", fill: "#2E6B6B", ink: "#FBF7EA" },
  { min: 10000, label: "10,000 or more", fill: "#1F4F4F", ink: "#FBF7EA" },
];

export function verifiedBin(verified: number): number {
  let bin = 0;
  VERIFIED_BINS.forEach((b, i) => {
    if (verified >= b.min) bin = i;
  });
  return bin;
}

export const failsReading = (c: CompletenessCell): boolean => c.verified > 0 && !c.kept;

export const fmt = (n: number): string => n.toLocaleString("en-US");

export function cellSummary(d: CompletenessDimension, c: CompletenessCell): string {
  const name = c.code ? `${c.code} ${c.label}` : c.label;
  const read = c.read === null ? "" : ` ${fmt(c.read)} kept after reading.`;
  const verdict = c.kept ? "Passes the stricter test." : "Fails the stricter test.";
  return `${d.title}: ${name}. ${fmt(c.verified)} verified of ${fmt(c.rows)} rows, ${fmt(c.curated)} curated and verified.${read} ${verdict}`;
}

export const WIDE_COLUMNS = 9;
export const COMPACT_COLUMNS = 30;
export const WIDE_HEIGHT = 66;
export const COMPACT_HEIGHT = 34;
export const LABEL_COLUMN = 262;
const GROUP_LABEL = 16;
const DIMENSION_GAP = 26;

export type PlacedCell = { cell: CompletenessCell; rect: Rect };
export type PlacedGroup = { group: CompletenessGroup; labelY: number | null; wide: boolean; cells: PlacedCell[] };
export type PlacedDimension = { dimension: CompletenessDimension; y: number; h: number; groups: PlacedGroup[] };

export function layoutCompleteness(dimensions: CompletenessDimension[], width: number, top = 0): { height: number; rows: PlacedDimension[] } {
  const area = width - LABEL_COLUMN;
  let y = top;
  const rows = dimensions.map((dimension) => {
    const start = y;
    const labelled = dimension.groups.length > 1;
    const groups = dimension.groups.map((group) => {
      const wide = group.cells.length <= WIDE_COLUMNS;
      const columns = wide ? WIDE_COLUMNS : COMPACT_COLUMNS;
      const w = area / columns;
      const h = wide ? WIDE_HEIGHT : COMPACT_HEIGHT;
      const labelY = labelled ? y + 11 : null;
      if (labelled) y += GROUP_LABEL;
      const cells = group.cells.map((cell, i) => ({
        cell,
        rect: { x: LABEL_COLUMN + (i % columns) * w, y: y + Math.floor(i / columns) * h, w, h },
      }));
      y += Math.ceil(group.cells.length / columns) * h + (labelled ? 8 : 0);
      return { group, labelY, wide, cells };
    });
    const h = Math.max(y - start, WIDE_HEIGHT);
    y = start + h + DIMENSION_GAP;
    return { dimension, y: start, h, groups };
  });
  return { height: y - DIMENSION_GAP, rows };
}
