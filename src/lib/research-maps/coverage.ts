import raw from "@/data/research-maps/coverage.json";
import { squarify, type Rect } from "./treemap";

export type CoverageStatus = "empty" | "thin" | "covered";

export type CoverageUnit = {
  code: string;
  title: string;
  size: number;
  rows: number;
  verified: number;
  edges: number;
  programs: number;
  books: number;
  resources: number;
};

export type CoverageGroup = { code: string; title: string; units: CoverageUnit[]; size: number };

export type CoverageScheme = {
  id: "cip" | "soc";
  title: string;
  sizeLabel: string;
  thinRule: string;
  groups: CoverageGroup[];
  counts: Record<CoverageStatus, number>;
  total: number;
};

export const CIP_COVERED_ROWS = 10;

export const STATUS_LABEL: Record<CoverageStatus, string> = { empty: "Empty", thin: "Thin", covered: "Covered" };

const held = (u: CoverageUnit): number => u.rows + u.programs + u.books + u.resources;

export function cipStatus(u: CoverageUnit): CoverageStatus {
  if (held(u) === 0) return "empty";
  return u.rows >= CIP_COVERED_ROWS ? "covered" : "thin";
}

export function socStatus(u: CoverageUnit): CoverageStatus {
  if (held(u) === 0) return "empty";
  return u.rows > 0 ? "covered" : "thin";
}

function scheme(
  id: "cip" | "soc",
  title: string,
  sizeLabel: string,
  thinRule: string,
  heads: { code: string; title: string }[],
  units: CoverageUnit[],
  status: (u: CoverageUnit) => CoverageStatus,
): CoverageScheme {
  const groups = heads
    .map((g) => {
      const own = units.filter((u) => u.code.slice(0, 2) === g.code);
      return { ...g, units: own, size: own.reduce((a, u) => a + u.size, 0) };
    })
    .filter((g) => g.size > 0);
  const counts: Record<CoverageStatus, number> = { empty: 0, thin: 0, covered: 0 };
  for (const u of units) counts[status(u)] += 1;
  return { id, title, sizeLabel, thinRule, groups, counts, total: units.length };
}

export function loadCoverage(): { date: string; source: string; cip: CoverageScheme; soc: CoverageScheme } {
  return {
    date: raw.date,
    source: raw.source,
    cip: scheme(
      "cip",
      "Majors",
      "six-digit CIP programs",
      `Thin holds something and fewer than ${CIP_COVERED_ROWS} rows. Covered holds ${CIP_COVERED_ROWS} rows or more.`,
      raw.cip.series,
      raw.cip.families,
      cipStatus,
    ),
    soc: scheme(
      "soc",
      "Careers",
      "SOC detailed occupations",
      "Thin is reached through the CIP to SOC crosswalk alone. Covered holds an occupation row.",
      raw.soc.majors,
      raw.soc.minors,
      socStatus,
    ),
  };
}

export const statusOf = (s: CoverageScheme, u: CoverageUnit): CoverageStatus => (s.id === "cip" ? cipStatus(u) : socStatus(u));

export type TreemapCell = { unit: CoverageUnit; status: CoverageStatus; rect: Rect };
export type TreemapGroup = { group: CoverageGroup; rect: Rect; cells: TreemapCell[] };

export const GROUP_HEADER = 15;

export function layoutCoverage(s: CoverageScheme, width: number, height: number): TreemapGroup[] {
  return squarify(s.groups, (g) => g.size, { x: 0, y: 0, w: width, h: height }).map(({ item, rect }) => {
    const header = rect.h > GROUP_HEADER * 2.2 ? GROUP_HEADER : 0;
    const inner = { x: rect.x + 1.5, y: rect.y + header + 1.5, w: rect.w - 3, h: rect.h - header - 3 };
    const cells = squarify(item.units, (u) => u.size, inner).map((c) => ({ unit: c.item, status: statusOf(s, c.item), rect: c.rect }));
    return { group: item, rect, cells };
  });
}

export function unitSummary(s: CoverageScheme, u: CoverageUnit): string {
  return `${u.code} ${u.title}. ${STATUS_LABEL[statusOf(s, u)]}. ${u.size} ${s.sizeLabel}, ${u.rows} rows, ${u.edges} edges, ${u.programs} programs, ${u.books} books, ${u.resources} resources.`;
}
