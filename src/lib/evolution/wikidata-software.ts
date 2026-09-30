import type { BronzeRecord } from "../research-os/medallion/bronze";
import { parseEdtf } from "../history/span";
import type { EdgeCandidateRecord, EvolutionRecord, EvolutionSource, SeriesRecord } from "./importer";

export const WIKIDATA_SOFTWARE_RULE = "wikidata-evolution-cc0";
export const SOFTWARE_CLASSES = ["os", "language", "package", "application"] as const;
export type SoftwareClass = (typeof SOFTWARE_CLASSES)[number];

export interface WikidataSoftwareRow {
  id: string;
  label: string;
  class: SoftwareClass;
  inception?: string;
  versions?: { v: string; date: string }[];
  based_on?: string[];
  influenced_by?: string[];
}

export function softwareSlug(qid: string): string {
  if (!/^Q[0-9]+$/.test(qid)) throw new Error(`not a QID: ${qid}`);
  return `software-wikidata-${qid.toLowerCase()}`;
}

interface Line {
  row: WikidataSoftwareRow;
  start: number;
  bytes: Buffer;
}

function lines(b: BronzeRecord): Line[] {
  const all = Buffer.from(b.text, "utf8");
  const out: Line[] = [];
  let at = 0;
  while (at < all.length) {
    const nl = all.indexOf(0x0a, at);
    const end = nl < 0 ? all.length : nl;
    const bytes = all.subarray(at, end);
    if (bytes.toString("utf8").trim()) {
      const row = JSON.parse(bytes.toString("utf8")) as WikidataSoftwareRow;
      if (!/^Q[0-9]+$/.test(row.id ?? "")) throw new Error(`${b.repoPath}: a row has no QID id`);
      if (!(SOFTWARE_CLASSES as readonly string[]).includes(row.class)) throw new Error(`${b.repoPath}: ${row.id} has class ${row.class}`);
      out.push({ row, start: at, bytes });
    }
    at = end + 1;
  }
  return out;
}

function valueSpan(line: Line, key: string, value: string, from = 0): { start: number; end: number; next: number } | null {
  const needle = Buffer.from(`${JSON.stringify(key)}:${JSON.stringify(value)}`, "utf8");
  const at = line.bytes.indexOf(needle, from);
  if (at < 0) return null;
  const start = line.start + at + Buffer.byteLength(`${JSON.stringify(key)}:"`, "utf8");
  return { start, end: start + Buffer.byteLength(value, "utf8"), next: at + needle.length };
}

function arraySpan(line: Line, key: string, value: string): { start: number; end: number } | null {
  const k = line.bytes.indexOf(Buffer.from(`${JSON.stringify(key)}:[`, "utf8"));
  if (k < 0) return null;
  const close = line.bytes.indexOf(0x5d, k);
  const at = line.bytes.indexOf(Buffer.from(JSON.stringify(value), "utf8"), k);
  if (at < 0 || at > close) return null;
  const start = line.start + at + 1;
  return { start, end: start + Buffer.byteLength(value, "utf8") };
}

export function softwareRecords(b: BronzeRecord, source: EvolutionSource): EvolutionRecord[] {
  const out: EvolutionRecord[] = [];
  for (const line of lines(b)) {
    const r = line.row;
    if (!r.inception) continue;
    const at = valueSpan(line, "inception", r.inception);
    if (!at) throw new Error(`${b.repoPath}: no inception span for ${r.id}`);
    const parsed = parseEdtf(r.inception, { calendar: "gregorian" });
    if (!parsed.ok) continue;
    const slug = softwareSlug(r.id);
    out.push({
      repoPath: source.repoPath,
      record: r.id,
      field: "inception",
      span: { start: at.start, end: at.end },
      subject: {
        kind: "node",
        slug,
        nodeKind: "software",
        draft: {
          slug,
          title: r.label,
          kind: "software",
          tier: 13,
          branch: "04-information",
          summary: null,
          labels: { en: { title: r.label } },
          provenance: { type: "wikidata_software", level: r.class, qid: r.id },
        },
      },
      roles: { released: parsed.span },
      qid: r.id,
    });
  }
  return out;
}

export function softwareLineage(b: BronzeRecord, source: EvolutionSource): EdgeCandidateRecord[] {
  const out: EdgeCandidateRecord[] = [];
  for (const line of lines(b)) {
    const r = line.row;
    for (const parent of r.based_on ?? []) {
      const at = arraySpan(line, "based_on", parent);
      if (!at) throw new Error(`${b.repoPath}: no based_on span for ${r.id} ${parent}`);
      out.push({ repoPath: source.repoPath, record: `${r.id}>${parent}`, field: "based_on", span: at, fromSlug: softwareSlug(r.id), toSlug: softwareSlug(parent), edgeKind: "descends_from", qid: r.id });
    }
    for (const parent of r.influenced_by ?? []) {
      const at = arraySpan(line, "influenced_by", parent);
      if (!at) throw new Error(`${b.repoPath}: no influenced_by span for ${r.id} ${parent}`);
      out.push({ repoPath: source.repoPath, record: `${parent}~${r.id}`, field: "influenced_by", span: at, fromSlug: softwareSlug(parent), toSlug: softwareSlug(r.id), edgeKind: "influences", qid: r.id });
    }
  }
  return out;
}

export function softwareReleaseSeries(b: BronzeRecord, source: EvolutionSource): SeriesRecord[] {
  const out: SeriesRecord[] = [];
  for (const line of lines(b)) {
    const perYear = new Map<number, number>();
    for (const v of line.row.versions ?? []) {
      const parsed = parseEdtf(v.date, { calendar: "gregorian" });
      if (!parsed.ok) continue;
      perYear.set(parsed.span.start_year, (perYear.get(parsed.span.start_year) ?? 0) + 1);
    }
    for (const [year, n] of Array.from(perYear.entries()).sort((a, c) => a[0] - c[0])) {
      out.push({ repoPath: source.repoPath, subjectSlug: softwareSlug(line.row.id), metric: "releases", year, value: n, unit: "releases" });
    }
  }
  return out;
}
