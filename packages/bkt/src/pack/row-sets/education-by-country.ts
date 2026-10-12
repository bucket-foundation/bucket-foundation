import { assembleRowSet, type AssembleContext, type PackedRows, type RowDraft, type RowGroup } from "./contract";
import type { TableReader } from "./index";
import { publicSource } from "./licences";

export const EDUCATION_BY_COUNTRY_ID = "education-by-country";
export const POINT_SOURCE = "natural-earth";
const LABEL = "Education by country";
const TABLE = "world_indicators";
const START = "SE.PRM.AGES";
const USED = [START, "SE.PRM.DURS", "SE.SEC.AGES", "SE.SEC.DURS", "SE.COM.DURS"] as const;

const GROUPS: RowGroup[] = [
  { id: "age-5", label: "Primary school starts at age 5", color: "#3f8f6b" },
  { id: "age-6", label: "Primary school starts at age 6", color: "#2f6f8f" },
  { id: "age-7", label: "Primary school starts at age 7", color: "#8a5a2b" },
  { id: "age-other", label: "Primary school starts at another age", color: "#8f3f3f" },
  { id: "age-none", label: "No starting age on record", color: "#6b6252" },
];

export interface CountryPoint {
  iso2: string;
  name: string;
  point: [number, number];
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const whole = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);

export async function countryPoints(tables: TableReader, ctx: AssembleContext): Promise<Map<string, CountryPoint>> {
  const out = new Map<string, CountryPoint>();
  if (!tables.has("countries")) return out;
  for await (const row of tables.rows("countries")) {
    const iso2 = text(row.iso2);
    if (publicSource("countries", row, ctx.registry) !== POINT_SOURCE || !/^[A-Z]{2}$/.test(iso2) || !/^[A-Z]{3}$/.test(text(row.iso3)) || !text(row.name)) continue;
    if (typeof row.lat !== "number" || typeof row.lng !== "number" || Math.abs(row.lat) > 90 || Math.abs(row.lng) > 180) continue;
    const held = { iso2, name: text(row.name), point: [row.lat, row.lng] as [number, number] };
    out.set(text(row.iso3), held);
    out.set(iso2, held);
  }
  return out;
}

function years(n: number): string {
  return `${n} ${n === 1 ? "year" : "years"}`;
}

export function schoolingLine(values: Map<string, number>): string {
  const parts: string[] = [];
  const start = values.get(START);
  const primary = values.get("SE.PRM.DURS");
  const secondaryStart = values.get("SE.SEC.AGES");
  const secondary = values.get("SE.SEC.DURS");
  const compulsory = values.get("SE.COM.DURS");
  if (start !== undefined) parts.push(`primary from age ${start}${primary !== undefined ? ` for ${years(primary)}` : ""}`);
  else if (primary !== undefined) parts.push(`primary for ${years(primary)}`);
  if (secondaryStart !== undefined) parts.push(`secondary from age ${secondaryStart}${secondary !== undefined ? ` for ${years(secondary)}` : ""}`);
  else if (secondary !== undefined) parts.push(`secondary for ${years(secondary)}`);
  if (compulsory !== undefined) parts.push(`${years(compulsory)} compulsory`);
  const line = parts.join(", ");
  return line ? line[0].toUpperCase() + line.slice(1) : "";
}

export async function educationByCountry(tables: TableReader, ctx: AssembleContext): Promise<PackedRows[]> {
  const points = await countryPoints(tables, ctx);
  const byCountry = new Map<string, { source: string; url: string | null; year: number | null; values: Map<string, number> }>();
  if (tables.has(TABLE)) {
    for await (const row of tables.rows(TABLE)) {
      const source = publicSource(TABLE, row, ctx.registry);
      const indicator = text(row.indicator);
      const value = whole(row.value);
      if (!source || row.verified !== true || !(USED as readonly string[]).includes(indicator) || value === null || value < 0 || value > 30 || !points.has(text(row.iso3))) continue;
      const held = byCountry.get(text(row.iso3)) ?? { source, url: null, year: null, values: new Map<string, number>() };
      if (held.source !== source) continue;
      held.values.set(indicator, value);
      const year = Number(text(row.year));
      if (Number.isInteger(year)) held.year = Math.max(held.year ?? year, year);
      if (indicator === START || held.url === null) held.url = text(row.source_url) || held.url;
      byCountry.set(text(row.iso3), held);
    }
  }
  const rows = [...byCountry].sort(([a], [b]) => a.localeCompare(b)).map(([iso3, held]): RowDraft => {
    const place = points.get(iso3) as CountryPoint;
    const start = held.values.get(START);
    const schooling = (held.values.get("SE.PRM.DURS") ?? 0) + (held.values.get("SE.SEC.DURS") ?? 0);
    return {
      key: iso3, title: place.name, sub: schoolingLine(held.values), group: start === undefined ? "age-none" : [5, 6, 7].includes(start) ? `age-${start}` : "age-other",
      source: held.source, year: held.year, url: held.url, place: place.iso2, point: place.point, weight: schooling > 0 ? schooling : null, verified: true,
    };
  });
  return assembleRowSet([{ id: EDUCATION_BY_COUNTRY_ID, label: LABEL, audience: "public", modes: ["earth", "map"], groups: GROUPS, rows, layout: "ring", also: rows.length ? [{ source: POINT_SOURCE, rows: rows.length }] : [] }], ctx);
}
