import { assembleRowSet, type AssembleContext, type PackedRows, type RowDraft, type RowGroup } from "./contract";
import type { TableReader } from "./index";
import { publicSource, type Row } from "./licences";

export const TECHNOLOGY_WAVES_ID = "technology-waves";
const LABEL = "Technology waves";
const THIS_YEAR_CAP = 2025;

const GROUPS: RowGroup[] = [
  { id: "wave", label: "Waves", color: "#8a5a2b" },
  { id: "checked", label: "Technologies checked against a source", color: "#2f6f8f" },
  { id: "curated", label: "Curated technologies, unchecked", color: "#5b7a3a" },
  { id: "training", label: "Training responses", color: "#8f3f3f" },
  { id: "occupation", label: "Occupations a technology changed", color: "#6a4c93" },
];
export const LAG_SOURCE = "bucket-corpus";
const RELATIONS = ["created", "expanded", "shrank", "ended"];
export const STAFF_ONLY_EVIDENCE = "wikidata-id-only";

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const year = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) ? v : null);

export function yearLabel(y: number): string {
  return y < 0 ? `${(-y).toLocaleString("en-US")} BCE` : String(y);
}

function span(from: number, to: number | null): string {
  return to === null ? `from ${yearLabel(from)}` : `${yearLabel(from)} to ${yearLabel(to)}`;
}

interface Case {
  technology: string;
  relation: string;
  year: number | null;
  verified: boolean;
  source: string;
  url: string;
}

export function occupationKey(name: string): string {
  return `occ-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export const WITHHELD_FIGURE_HOST = "usa.ipums.org";

export function figureUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url.startsWith("https://")) return null;
  try {
    return new URL(url).host.toLowerCase().endsWith("ipums.org") ? null : url;
  } catch {
    return null;
  }
}

export function lagSource(row: Row, cases: { technology: string; year: number | null; url: string }[]): string | null {
  if (row.source_url !== undefined && row.source_url !== null && figureUrl(row.source_url) === null) return null;
  const end = year(row.to_year);
  const held = cases.find((c) => c.technology === text(row.technology_id) && end !== null && c.year === end && figureUrl(c.url) !== null);
  if (!held) return null;
  return figureUrl(row.source_url) ?? held.url;
}

export function lagLine(lag: { measure: string; years: number; n: number }): string {
  return `${lag.measure}: ${lag.years} ${lag.years === 1 ? "year" : "years"}, n = ${lag.n}`;
}

export async function technologyWaves(tables: TableReader, ctx: AssembleContext): Promise<PackedRows[]> {
  const opening: RowDraft[] = [];
  const technologies = new Set<string>();
  let earliest = Number.POSITIVE_INFINITY;
  const keep = (table: string, row: Row, name: string, from: number | null): { source: string; from: number; to: number | null; url: string } | null => {
    const source = publicSource(table, row, ctx.registry);
    const url = text(row.source_url) || text(row.url);
    if (!source || from === null || !text(row.id) || !name || !url.startsWith("https://")) return null;
    earliest = Math.min(earliest, from);
    return { source, from, to: year(row.era_to), url };
  };
  for await (const row of tables.rows("technologies")) {
    const name = text(row.name);
    if (row.evidence !== "curated-source") continue;
    const held = keep("technologies", row, name, year(row.era_from));
    if (!held) continue;
    const base = { key: text(row.id), title: name, source: held.source, url: held.url, from: held.from, to: held.to, verified: row.verified === true };
    if (row.kind === "wave") {
      opening.push({ ...base, sub: span(held.from, held.to), group: "wave" });
    } else if (row.kind === "technology") {
      technologies.add(text(row.id));
      opening.push({ ...base, sub: text(row.field), group: row.verified === true ? "checked" : "curated" });
    }
  }
  if (tables.has("tech_training_response")) {
    for await (const row of tables.rows("tech_training_response")) {
      const name = text(row.name);
      const held = keep("tech_training_response", row, name, year(row.year));
      if (!held) continue;
      const answers = text(row.technology_id);
      opening.push({
        key: text(row.id), title: name, sub: text(row.country), group: "training", source: held.source, url: held.url, from: held.from, to: null, verified: row.verified === true,
        links: technologies.has(answers) ? [{ to: answers, stated: row.verified === true }] : [],
      });
    }
  }
  const cases = new Map<string, Case[]>();
  if (tables.has("tech_occupation")) {
    for await (const row of tables.rows("tech_occupation")) {
      const source = publicSource("tech_occupation", row, ctx.registry);
      const occupation = text(row.occupation);
      const url = text(row.source_url);
      if (!source || !occupation || !technologies.has(text(row.technology_id)) || figureUrl(url) === null || !RELATIONS.includes(text(row.relation))) continue;
      const list = cases.get(occupation) ?? [];
      list.push({ technology: text(row.technology_id), relation: text(row.relation), year: year(row.year), verified: row.verified === true, source, url });
      cases.set(occupation, list);
    }
  }
  const lags = new Map<string, { measure: string; years: number; n: number; url: string }>();
  let lagRows = 0;
  if (tables.has("tech_lags")) {
    for await (const row of tables.rows("tech_lags")) {
      const n = year(row.n);
      const years = year(row.lag_years);
      const pair = `${text(row.technology_id)}|${text(row.occupation)}`;
      if (row.row_type !== "case" || !publicSource("tech_lags", row, ctx.registry) || n === null || n < 1 || years === null || !text(row.measure) || lags.has(pair)) continue;
      const sourced = lagSource(row, cases.get(text(row.occupation)) ?? []);
      if (sourced) lags.set(pair, { measure: text(row.measure), years, n, url: sourced });
    }
  }
  for (const [occupation, list] of [...cases].sort(([a], [b]) => a.localeCompare(b))) {
    const dated = list.map((c) => c.year).filter((y): y is number => y !== null);
    if (!dated.length) continue;
    const shareAlike = list.find((c) => c.source === "wikipedia") ?? list[0];
    const lag = list.map((c) => lags.get(`${c.technology}|${occupation}`)).find((l) => l !== undefined);
    if (lag) lagRows++;
    const relations = [...new Set(list.map((c) => c.relation))].join(", ");
    const seen = new Set<string>();
    opening.push({
      key: occupationKey(occupation), title: occupation, sub: lag ? `${relations}; ${lagLine(lag)}` : relations, group: "occupation", source: shareAlike.source, url: lag ? lag.url : shareAlike.url,
      from: Math.min(...dated), to: null, verified: list.every((c) => c.verified),
      links: list.filter((c) => !seen.has(c.technology) && seen.add(c.technology)).map((c) => ({ to: c.technology, stated: c.verified })),
    });
  }
  const axis = opening.length ? { from: earliest, to: THIS_YEAR_CAP, scale: "log" as const, unit: "year" as const } : null;
  return assembleRowSet([{ id: TECHNOLOGY_WAVES_ID, label: LABEL, audience: "public", modes: ["timeline"], groups: GROUPS, axis, rows: opening, also: lagRows ? [{ source: LAG_SOURCE, rows: lagRows }] : [] }], ctx);
}
