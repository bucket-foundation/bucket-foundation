import { assembleRowSet, type AssembleContext, type PackedRows, type RowDraft, type RowGroup, type RowSetDraft } from "./contract";
import type { TableReader } from "./index";
import { publicSource, type Row } from "./licences";

export const TECHNOLOGY_WAVES_ID = "technology-waves";
export const TRAINING_FIELD = "training response to technology";
const LABEL = "Technology waves";
const THIS_YEAR_CAP = 2025;

const GROUPS: RowGroup[] = [
  { id: "wave", label: "Waves", color: "#8a5a2b" },
  { id: "checked", label: "Technologies checked against a source", color: "#2f6f8f" },
  { id: "curated", label: "Curated technologies, unchecked", color: "#5b7a3a" },
  { id: "training", label: "Training responses", color: "#8f3f3f" },
  { id: "wikidata", label: "Wikidata items, unchecked", color: "#6b6252" },
];

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const year = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) ? v : null);

export function yearLabel(y: number): string {
  return y < 0 ? `${(-y).toLocaleString("en-US")} BCE` : String(y);
}

function span(from: number, to: number | null): string {
  return to === null ? `from ${yearLabel(from)}` : `${yearLabel(from)} to ${yearLabel(to)}`;
}

export async function technologyWaves(tables: TableReader, ctx: AssembleContext): Promise<PackedRows[]> {
  const opening: RowDraft[] = [];
  const byWave = new Map<string, RowDraft[]>();
  const waves: string[] = [];
  let earliest = Number.POSITIVE_INFINITY;
  const keep = (table: string, row: Row, name: string): { source: string; from: number; to: number | null; url: string } | null => {
    const source = publicSource(table, row, ctx.registry);
    const from = year(row.era_from);
    const url = text(row.source_url) || text(row.url);
    if (!source || from === null || !text(row.id) || !name || !url.startsWith("https://")) return null;
    earliest = Math.min(earliest, from);
    return { source, from, to: year(row.era_to), url };
  };
  for await (const row of tables.rows("technologies")) {
    const name = text(row.name);
    const held = keep("technologies", row, name);
    if (!held) continue;
    const base = { key: text(row.id), title: name, source: held.source, url: held.url, from: held.from, to: held.to, verified: row.verified === true };
    if (row.kind === "wave") {
      waves.push(text(row.id));
      opening.push({ ...base, sub: span(held.from, held.to), group: "wave" });
    } else if (row.kind === "technology" && row.evidence === "curated-source") {
      opening.push({ ...base, sub: text(row.field), group: row.verified === true ? "checked" : "curated" });
    } else if (row.kind === "technology" && row.evidence === "wikidata-id-only" && text(row.wave)) {
      const page = byWave.get(text(row.wave)) ?? [];
      page.push({ ...base, sub: text(row.field), group: "wikidata", verified: false });
      byWave.set(text(row.wave), page);
    }
  }
  if (tables.has("frameworks")) {
    for await (const row of tables.rows("frameworks")) {
      if (row.slice !== "history-technology" || row.field !== TRAINING_FIELD) continue;
      const name = text(row.name);
      const held = keep("frameworks", row, name);
      if (held) opening.push({ key: text(row.id), title: name, sub: text(row.region_raw), group: "training", source: held.source, url: held.url, from: held.from, to: held.to, verified: row.verified === true });
    }
  }
  const drill = { param: "group" as const, values: waves.filter((w) => (byWave.get(w) ?? []).length > 0) };
  const axis = opening.length ? { from: earliest, to: THIS_YEAR_CAP, scale: "log" as const, unit: "year" as const } : null;
  const shared = { id: TECHNOLOGY_WAVES_ID, label: LABEL, audience: "public" as const, modes: ["timeline"], groups: GROUPS, axis, drill };
  const pages = drill.values.map((w): RowSetDraft => ({ ...shared, rows: byWave.get(w) as RowDraft[] }));
  return assembleRowSet([{ ...shared, rows: opening }, ...pages], ctx);
}
