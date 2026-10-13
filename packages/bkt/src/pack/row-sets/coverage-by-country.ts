import { assembleRowSet, type AssembleContext, type PackedRows, type RowDraft, type RowGroup } from "./contract";
import { countryPoints, POINT_SOURCE } from "./education-by-country";
import type { TableReader } from "./index";
import { publicSource } from "./licences";

export const COVERAGE_BY_COUNTRY_ID = "coverage-by-country";
const LABEL = "Corpus coverage by country";
const TABLE = "completeness";

const GROUPS: RowGroup[] = [
  { id: "most", label: "Over half of its rows checked", color: "#3f8f6b" },
  { id: "some", label: "Half of its rows or fewer checked", color: "#b07a2a" },
  { id: "none", label: "No rows yet", color: "#8f3f3f" },
];

interface Cell {
  dimension?: unknown;
  cell?: unknown;
  rows_total?: unknown;
  rows_verified?: unknown;
}

const count = (v: unknown): number => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : 0);

export async function coverageByCountry(tables: TableReader, ctx: AssembleContext): Promise<PackedRows[]> {
  const points = await countryPoints(tables, ctx);
  const source = publicSource(TABLE, {}, ctx.registry);
  const cells = ((tables.document(TABLE) as { cells?: Cell[] } | null)?.cells ?? []).filter((c) => c.dimension === "geography");
  const rows = !source ? [] : cells.flatMap((c): RowDraft[] => {
    const place = points.get(typeof c.cell === "string" ? c.cell : "");
    if (!place) return [];
    const total = count(c.rows_total);
    const checked = Math.min(total, count(c.rows_verified));
    return [{
      key: place.iso2, title: place.name, sub: `${total.toLocaleString("en-US")} ${total === 1 ? "row" : "rows"}, ${checked.toLocaleString("en-US")} checked`,
      group: total === 0 ? "none" : checked * 2 > total ? "most" : "some", source, place: place.iso2, point: place.point, weight: total > 0 ? total : null,
    }];
  });
  return assembleRowSet([{ id: COVERAGE_BY_COUNTRY_ID, label: LABEL, audience: "public", modes: ["earth", "map"], groups: GROUPS, rows, layout: "ring", also: rows.length ? [{ source: POINT_SOURCE, rows: rows.length }] : [] }], ctx);
}
