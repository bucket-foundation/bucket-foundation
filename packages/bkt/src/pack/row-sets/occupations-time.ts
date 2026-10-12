import { assembleRowSet, type AssembleContext, type PackedRows, type RowDraft, type RowGroup, type RowSetDraft } from "./contract";
import type { TableReader } from "./index";
import { publicSource } from "./licences";

export const OCCUPATIONS_ID = "occupations-time";
const LABEL = "Occupations through time";
const TABLE = "occupation_history";
const LISTED = "listed";
export const CENSUS_OWN_FROM = 2000;

const SCHEMES: RowGroup[] = [
  { id: "soc", label: "SOC 2018 major groups", color: "#2f6f8f" },
  { id: "onet-soc", label: "O*NET-SOC major groups", color: "#8a5a2b" },
  { id: "census", label: "Census occupation lists", color: "#5b7a3a" },
];

const STATUSES: RowGroup[] = [
  { id: "emerging", label: "Emerging", color: "#3f8f6b" },
  { id: "growing", label: "Growing", color: "#5b7a3a" },
  { id: "stable", label: "Stable", color: "#2f6f8f" },
  { id: "declining", label: "Declining", color: "#b07a2a" },
  { id: "extinct", label: "Extinct", color: "#8f3f3f" },
  { id: LISTED, label: "Listed", color: "#5b7a3a" },
];

interface Lifecycle {
  id: string;
  title: string;
  scheme: string;
  code: string;
  status: string;
  from: number;
  to: number;
  peakYear: number | null;
  peak: number | null;
  url: string | null;
  source: string;
}

interface Group {
  key: string;
  scheme: string;
  order: string;
  title: string;
  counted: string;
  rows: Lifecycle[];
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const number = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function censusSpan(row: { scheme?: unknown; lineage_codes?: unknown; era_to?: unknown }): { from: number; to: number } | null {
  const list = /^census-(\d{4})$/.exec(text(row.scheme));
  if (!list) return null;
  const listed = Number(list[1]);
  const years = (Array.isArray(row.lineage_codes) ? row.lineage_codes : []).map((c) => Number(/^(\d{4}):/.exec(text(c))?.[1])).filter((y) => y >= CENSUS_OWN_FROM && y <= listed);
  const from = Math.min(listed, ...years);
  if (from < CENSUS_OWN_FROM) return null;
  return { from, to: Math.max(from, number(row.era_to) ?? listed) };
}

function groupOf(row: Lifecycle, majors: Map<string, string>): Omit<Group, "rows"> | null {
  if (row.scheme === "soc" || row.scheme === "onet-soc") {
    const major = row.code.slice(0, 2);
    const title = majors.get(major);
    if (!/^\d{2}$/.test(major) || !title) return null;
    const name = row.scheme === "soc" ? "SOC" : "O*NET-SOC";
    return { key: `${row.scheme}-${major}`, scheme: row.scheme, order: major, title, counted: `${name} ${major}` };
  }
  const census = /^census-(\d{4})$/.exec(row.scheme);
  return census ? { key: row.scheme, scheme: "census", order: census[1], title: `Census ${census[1]} occupation list`, counted: "" } : null;
}

export async function occupationsTime(tables: TableReader, ctx: AssembleContext): Promise<PackedRows[]> {
  const majors = new Map<string, string>();
  for await (const row of tables.rows("backbone_codes")) {
    if (row.scheme === "soc2018" && row.grain === "major" && publicSource("backbone_codes", row, ctx.registry)) majors.set(text(row.code).slice(0, 2), text(row.title));
  }
  const groups = new Map<string, Group>();
  for await (const row of tables.rows(TABLE)) {
    const source = publicSource(TABLE, row, ctx.registry);
    const census = text(row.scheme).startsWith("census-");
    const span = census ? censusSpan(row) : null;
    const from = census ? span?.from ?? null : number(row.era_from);
    const to = census ? span?.to ?? null : number(row.era_to);
    if (!source || from === null || to === null || !text(row.id) || !text(row.title)) continue;
    const life: Lifecycle = {
      id: text(row.id), title: text(row.title), scheme: text(row.scheme), code: text(row.code), status: census ? LISTED : text(row.status), from, to,
      peakYear: census ? null : number(row.peak_year), peak: census ? null : number(row.peak_employment), url: text(row.source_url) || null, source,
    };
    const group = groupOf(life, majors);
    if (!group || !STATUSES.some((s) => s.id === life.status)) continue;
    const held = groups.get(group.key) ?? { ...group, rows: [] };
    held.rows.push(life);
    groups.set(group.key, held);
  }
  const ordered = [...groups.values()].sort((a, b) => SCHEMES.findIndex((s) => s.id === a.scheme) - SCHEMES.findIndex((s) => s.id === b.scheme) || a.order.localeCompare(b.order));
  const all = ordered.flatMap((g) => g.rows);
  const axis = all.length ? { from: Math.min(...all.map((r) => r.from)), to: Math.max(...all.map((r) => r.to)), scale: "linear" as const, unit: "year" as const } : null;
  const drill = { param: "group" as const, values: ordered.map((g) => g.key) };
  const shared = { id: OCCUPATIONS_ID, label: LABEL, audience: "public" as const, modes: ["map"], axis, layout: "ring" as const, drill };
  const opening: RowSetDraft = {
    ...shared,
    groups: SCHEMES,
    rows: ordered.map((g): RowDraft => {
      const sources = new Set(g.rows.map((r) => r.source));
      if (sources.size !== 1) throw new Error(`row set ${OCCUPATIONS_ID}: group ${g.key} mixes ${[...sources].join(" and ")}`);
      const count = `${g.rows.length} ${g.rows.length === 1 ? "occupation" : "occupations"}`;
      return { key: g.key, title: g.title, sub: g.counted ? `${g.counted}, ${count}` : count, group: g.scheme, source: g.rows[0].source, from: Math.min(...g.rows.map((r) => r.from)), to: Math.max(...g.rows.map((r) => r.to)), weight: g.rows.length };
    }),
  };
  const pages = ordered.map((g): RowSetDraft => ({
    ...shared,
    groups: STATUSES,
    rows: g.rows.map((r): RowDraft => ({ key: r.id, title: r.title, sub: r.code, group: r.status, source: r.source, year: r.peakYear, url: r.url, from: r.from, to: r.to, weight: r.peak })),
  }));
  return assembleRowSet([opening, ...pages], ctx);
}
