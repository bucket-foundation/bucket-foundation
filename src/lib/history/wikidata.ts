import { byteLength, byteSlice, sha256Hex } from "../research-os/evidence/text";
import type { BronzeRecord } from "../research-os/medallion/bronze";
import { combineConfidence } from "../research-os/medallion/silver";
import type { HistoryProposal, HistoryRole, HistorySilver, PlaceDraft, RoleFields } from "./importer";
import { HISTORY_PARSER } from "./importer";
import { fromWikidata, type Span } from "./span";

export const WIKIDATA_PARSER_REVISION = "history-import/wikidata-1";
export const WIKIDATA_PRIOR = 0.8;
export const YEAR_SLACK = 10;
export const QUERY_LIMIT_MS = 30_000;
export const MAX_PERIOD_YEAR = 999_999_999;

const PREFIXES = [
  "PREFIX wd: <http://www.wikidata.org/entity/>",
  "PREFIX wdt: <http://www.wikidata.org/prop/direct/>",
  "PREFIX p: <http://www.wikidata.org/prop/>",
  "PREFIX psv: <http://www.wikidata.org/prop/statement/value/>",
  "PREFIX wikibase: <http://wikiba.se/ontology#>",
  "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
  "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>",
  "PREFIX schema: <http://schema.org/>",
].join("\n");

export interface Figure {
  slug: string;
  id: string;
  name: string;
  born: Pick<Span, "start_min" | "end_max"> | null;
}

export interface Candidate {
  qid: string;
  label: string | null;
  description: string | null;
  born: number | null;
  died: number | null;
  url: string;
}

export interface IdentityProposal {
  figure: Figure;
  candidates: Candidate[];
  reason: "one_candidate" | "several_candidates" | "no_candidate";
}

export function nameVariants(name: string): string[] {
  const out = new Set<string>([name.trim()]);
  const paren = /^(.*?)\s*\((.*)\)$/.exec(name.trim());
  if (paren) {
    out.add(paren[1].trim());
    out.add(paren[2].trim());
  }
  out.add(name.split(/\s+of\s+|,/)[0].trim());
  return Array.from(out).filter((n) => n.length > 0).sort();
}

export function matchQuery(figures: Figure[]): string {
  const names = Array.from(new Set(figures.flatMap((f) => nameVariants(f.name)))).sort();
  const values = names.map((n) => `${JSON.stringify(n)}@en`).join(" ");
  return `${PREFIXES}
SELECT ?name ?p ?label ?desc (MIN(YEAR(?b)) AS ?born) (MIN(YEAR(?d)) AS ?died) WHERE {
  VALUES ?name { ${values} }
  ?p rdfs:label|skos:altLabel ?name ; wdt:P31 wd:Q5 .
  OPTIONAL { ?p rdfs:label ?label FILTER(LANG(?label) = "en") }
  OPTIONAL { ?p schema:description ?desc FILTER(LANG(?desc) = "en") }
  OPTIONAL { ?p wdt:P569 ?b }
  OPTIONAL { ?p wdt:P570 ?d }
} GROUP BY ?name ?p ?label ?desc
`;
}

export function datesQuery(qids: string[], dateProperty: "P569" | "P570", placeProperty: "P19" | "P20"): string {
  const values = qids.map((q) => `wd:${q}`).join(" ");
  return `${PREFIXES}
SELECT ?p ?t ?prec ?cal ?place ?placeLabel ?coord WHERE {
  VALUES ?p { ${values} }
  ?p p:${dateProperty} ?st .
  ?st psv:${dateProperty} ?v ; wikibase:rank ?rank .
  FILTER(?rank != wikibase:DeprecatedRank)
  ?v wikibase:timeValue ?t ; wikibase:timePrecision ?prec ; wikibase:timeCalendarModel ?cal .
  OPTIONAL {
    ?p wdt:${placeProperty} ?place .
    OPTIONAL { ?place rdfs:label ?placeLabel FILTER(LANG(?placeLabel) = "en") }
    OPTIONAL { ?place wdt:P625 ?coord }
  }
}
`;
}

export function eventsQuery(qids: string[]): string {
  const values = qids.map((q) => `wd:${q}`).join(" ");
  return `${PREFIXES}
SELECT ?e ?t ?prec ?cal WHERE {
  VALUES ?e { ${values} }
  { ?e p:P585 ?st . ?st psv:P585 ?v } UNION { ?e p:P580 ?st . ?st psv:P580 ?v }
  ?st wikibase:rank ?rank .
  FILTER(?rank != wikibase:DeprecatedRank)
  ?v wikibase:timeValue ?t ; wikibase:timePrecision ?prec ; wikibase:timeCalendarModel ?cal .
}
`;
}

export function tsvRows(text: string): { header: string[]; rows: { cells: string[]; offset: number }[] } {
  const lines = text.split("\n");
  const header = (lines[0] ?? "").split("\t");
  const rows: { cells: string[]; offset: number }[] = [];
  let offset = (lines[0] ?? "").length + 1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].length > 0) rows.push({ cells: lines[i].split("\t"), offset });
    offset += lines[i].length + 1;
  }
  return { header, rows };
}

export function qidOf(cell: string | undefined): string | null {
  const m = /entity\/(Q[0-9]+)>?$/.exec(cell ?? "");
  return m ? m[1] : null;
}

export function literal(cell: string | undefined): string | null {
  if (!cell) return null;
  const m = /^"((?:[^"\\]|\\.)*)"/.exec(cell);
  return m ? m[1].replace(/\\(.)/g, "$1") : cell;
}

export function intLiteral(cell: string | undefined): number | null {
  const v = literal(cell);
  return v !== null && /^-?[0-9]+$/.test(v) ? Number(v) : null;
}

export function pointOf(cell: string | undefined): { lat: number; lng: number } | null {
  const value = literal(cell) ?? "";
  const m = /^Point\(\s*(-?[0-9.eE+-]+)\s+(-?[0-9.eE+-]+)\s*\)$/i.exec(value.trim());
  if (!m) return null;
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function identityProposals(figures: Figure[], matchTsv: string): IdentityProposal[] {
  const byName = new Map<string, Map<string, Candidate>>();
  for (const { cells } of tsvRows(matchTsv).rows) {
    const name = literal(cells[0]);
    const qid = qidOf(cells[1]);
    if (!name || !qid) continue;
    const held = byName.get(name) ?? new Map<string, Candidate>();
    held.set(qid, { qid, label: literal(cells[2]), description: literal(cells[3]), born: intLiteral(cells[4]), died: intLiteral(cells[5]), url: `https://www.wikidata.org/wiki/${qid}` });
    byName.set(name, held);
  }
  return figures.map((figure) => {
    const all = new Map<string, Candidate>();
    for (const n of nameVariants(figure.name)) for (const [q, c] of Array.from(byName.get(n)?.entries() ?? [])) all.set(q, c);
    const kept = Array.from(all.values())
      .filter((c) => !figure.born || (c.born !== null && figure.born.start_min - YEAR_SLACK <= c.born && c.born <= figure.born.end_max + YEAR_SLACK))
      .sort((a, b) => Number(a.qid.slice(1)) - Number(b.qid.slice(1)));
    const reason = kept.length === 1 ? "one_candidate" : kept.length > 1 ? "several_candidates" : "no_candidate";
    return { figure, candidates: kept, reason };
  });
}

interface Planned {
  silver: HistorySilver[];
  places: PlaceDraft[];
  refused: { qid: string; detail: string }[];
}

function silverAt(bronze: BronzeRecord, start: number, end: number, subject: string, proposal: HistoryProposal, parse: number): HistorySilver {
  const slice = byteSlice(bronze.text, start, end);
  const parts = { prior: WIKIDATA_PRIOR, parse, match: 1 };
  return {
    source_id: bronze.sourceId,
    source_revision: bronze.sourceRevision,
    kind: "claim",
    span_start: start,
    span_end: end,
    locator: `${proposal.record}#${proposal.field}`,
    text_hash: sha256Hex(slice),
    text: bronze.rights.allowIndex ? slice : null,
    parser: HISTORY_PARSER,
    parser_revision: WIKIDATA_PARSER_REVISION,
    confidence: combineConfidence(parts),
    confidence_parts: parts,
    proposal,
    subject,
  };
}

function cellSpan(text: string, rowOffset: number, cells: string[], index: number): { start: number; end: number } {
  const before = cells.slice(0, index).reduce((a, c) => a + c.length + 1, 0);
  const startChar = rowOffset + before;
  return { start: byteLength(text.slice(0, startChar)), end: byteLength(text.slice(0, startChar + cells[index].length)) };
}

export function planFigureDates(bronze: BronzeRecord, role: "born" | "died", subjectOf: Map<string, string[]>): Planned {
  const out: Planned = { silver: [], places: [], refused: [] };
  const seen = new Set<string>();
  const placesSeen = new Set<string>();
  const byStatement = new Map<string, { cells: string[]; offset: number; place: string | null }>();
  for (const row of tsvRows(bronze.text).rows) {
    const qid = qidOf(row.cells[0]);
    if (!qid) continue;
    const place = qidOf(row.cells[4]);
    const point = pointOf(row.cells[6]);
    const key = `${qid}|${row.cells[1]}|${row.cells[2]}|${row.cells[3]}`;
    const held = byStatement.get(key);
    const better = !held || (!held.place && place && point) || (held.place && place && point && Number(place.slice(1)) < Number(held.place.slice(1)));
    if (better) byStatement.set(key, { cells: row.cells, offset: row.offset, place: place && point ? place : null });
    if (place && point && !placesSeen.has(place)) {
      placesSeen.add(place);
      out.places.push({ slug: `wikidata-${place.toLowerCase()}`, title: literal(row.cells[5]) ?? place, lat: point.lat, lng: point.lng, siteSlug: null, repoPath: bronze.repoPath });
    }
  }
  for (const [key, row] of Array.from(byStatement.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const qid = qidOf(row.cells[0])!;
    const precision = intLiteral(row.cells[2]);
    const calendar = (row.cells[3] ?? "").replace(/^<|>$/g, "");
    const time = literal(row.cells[1]) ?? "";
    const parsed = precision === null ? null : fromWikidata({ time, precision, calendar });
    if (!parsed || !parsed.ok) {
      out.refused.push({ qid, detail: parsed && !parsed.ok ? `${parsed.refusal}: ${parsed.detail}` : "no precision" });
      continue;
    }
    const fields: RoleFields = row.place ? { ...parsed.span, place_slug: `wikidata-${row.place.toLowerCase()}` } : parsed.span;
    const at = cellSpan(bronze.text, row.offset, row.cells, 1);
    for (const subject of subjectOf.get(qid) ?? []) {
      const dedupe = `${subject}|${key}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.silver.push(
        silverAt(
          bronze,
          at.start,
          at.end,
          subject,
          {
            source: bronze.repoPath,
            record: qid,
            field: role === "born" ? "P569" : "P570",
            roles: { [role]: fields } as Partial<Record<HistoryRole, RoleFields>>,
            subject_kind: "figure",
            subject_resolved: true,
            qid,
          },
          1,
        ),
      );
    }
  }
  return out;
}

export function planEventDates(bronze: BronzeRecord): Planned {
  const out: Planned = { silver: [], places: [], refused: [] };
  const seen = new Set<string>();
  for (const row of tsvRows(bronze.text).rows) {
    const qid = qidOf(row.cells[0]);
    if (!qid) continue;
    const key = row.cells.slice(0, 4).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const precision = intLiteral(row.cells[2]);
    const parsed = precision === null ? null : fromWikidata({ time: literal(row.cells[1]) ?? "", precision, calendar: (row.cells[3] ?? "").replace(/^<|>$/g, "") });
    if (!parsed || !parsed.ok) {
      out.refused.push({ qid, detail: parsed && !parsed.ok ? `${parsed.refusal}: ${parsed.detail}` : "no precision" });
      continue;
    }
    const at = cellSpan(bronze.text, row.offset, row.cells, 1);
    out.silver.push(
      silverAt(
        bronze,
        at.start,
        at.end,
        `event-wikidata-${qid.toLowerCase()}`,
        { source: bronze.repoPath, record: qid, field: "P585|P580", roles: { occurred: parsed.span }, subject_kind: "event", subject_resolved: false, qid },
        1,
      ),
    );
  }
  return out;
}

export interface PeriodDraft {
  id: string;
  label: string;
  spatial_qids: string[];
  start_min: number;
  start_max: number;
  end_min: number;
  end_max: number;
}

type PeriodTime = { in?: { year?: string | number; earliestYear?: string | number; latestYear?: string | number } };

function bounds(t: PeriodTime | undefined): [number, number] | null {
  const i = t?.in;
  if (!i) return null;
  const n = (v: string | number | undefined) => {
    const t = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : "";
    return /^-?[0-9]+$/.test(t) ? Number(t) : null;
  };
  const year = n(i.year);
  if (year !== null) return [year, year];
  const lo = n(i.earliestYear);
  const hi = n(i.latestYear);
  return lo !== null && hi !== null && lo <= hi ? [lo, hi] : null;
}

export function periodDrafts(doc: { authorities?: Record<string, { periods?: Record<string, Record<string, unknown>> }> }): { periods: PeriodDraft[]; skipped: number } {
  const periods: PeriodDraft[] = [];
  let skipped = 0;
  for (const authority of Object.values(doc.authorities ?? {})) {
    for (const p of Object.values(authority.periods ?? {})) {
      const start = bounds(p.start as PeriodTime);
      const stop = bounds(p.stop as PeriodTime);
      const label = typeof p.label === "string" ? p.label.trim() : "";
      const id = typeof p.id === "string" ? p.id : "";
      const inRange = [start, stop].every((b) => b !== null && b.every((y) => Math.abs(y) <= MAX_PERIOD_YEAR));
      if (!start || !stop || !inRange || !label || !/^[A-Za-z0-9_-]+$/.test(id) || start[0] > stop[0] || start[1] > stop[1] || label.length > 500) {
        skipped++;
        continue;
      }
      const spatial = Array.isArray(p.spatialCoverage)
        ? Array.from(new Set((p.spatialCoverage as { id?: string }[]).map((s) => qidOf(`<${s.id ?? ""}>`)).filter((q): q is string => !!q))).sort()
        : [];
      periods.push({ id: `periodo:${id}`, label, spatial_qids: spatial, start_min: start[0], start_max: start[1], end_min: stop[0], end_max: stop[1] });
    }
  }
  periods.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { periods, skipped };
}
