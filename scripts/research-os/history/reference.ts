import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../../../src/lib/research-os/paging";
import { PERIODS, periodOf, REGIONS, UNPLACED, type Period } from "../../../src/lib/history/regions";
import { graphClient } from "../ingest/lib/medallion-shadow";
import { ROOT } from "../medallion/lib/repo-io";

export const ENDPOINT = process.env.HISTORY_REFERENCE_ENDPOINT || "https://qlever.dev/api/wikidata";
export const HUMAN_SLICE_LIMIT_MS = 30_000;
export const POINT_BATCH = 500;
const PREFIXES = "PREFIX wd: <http://www.wikidata.org/entity/>\nPREFIX wdt: <http://www.wikidata.org/prop/direct/>\n";

export type Kind = "human" | "site" | "event";

export interface Slice {
  kind: Kind;
  label: string;
  from: number;
  to: number;
}

export const HUMAN_SLICES: Slice[] = [
  { kind: "human", label: "before -3000", from: -9999, to: -3001 },
  { kind: "human", label: "-3000 to -1001", from: -3000, to: -1001 },
  { kind: "human", label: "-1000 to -1", from: -1000, to: -1 },
  { kind: "human", label: "0 to 999", from: 0, to: 999 },
  { kind: "human", label: "1000 to 1499", from: 1000, to: 1499 },
  ...[1500, 1600, 1700, 1800, 1900, 2000].map((c) => ({ kind: "human" as const, label: `${c} to ${c === 2000 ? 2100 : c + 99}`, from: c, to: c === 2000 ? 2100 : c + 99 })),
];

export function humanQuery(s: Slice): string {
  return `${PREFIXES}SELECT ?year ?country (COUNT(?p) AS ?n) WHERE {
  {
    SELECT ?p (MIN(YEAR(?b)) AS ?year) (MIN(?c) AS ?country) WHERE {
      ?p wdt:P31 wd:Q5 ; wdt:P569 ?b ; wdt:P19 ?bp .
      ?bp wdt:P17 ?c .
      FILTER(YEAR(?b) >= ${s.from} && YEAR(?b) <= ${s.to})
    } GROUP BY ?p
  }
} GROUP BY ?year ?country
`;
}

export const SITE_QUERY = `${PREFIXES}SELECT ?item (MIN(YEAR(?d)) AS ?year) (MIN(STR(?coord)) AS ?point) WHERE {
  ?item wdt:P31/wdt:P279* wd:Q839954 ; wdt:P625 ?coord .
  { ?item wdt:P571 ?d } UNION { ?item wdt:P580 ?d } UNION { ?item wdt:P1319 ?d }
} GROUP BY ?item
`;

export const EVENT_QUERY = `${PREFIXES}SELECT ?item (MIN(YEAR(?d)) AS ?year) (MIN(STR(?coord)) AS ?point) WHERE {
  ?item wdt:P625 ?coord .
  { ?item wdt:P585 ?d } UNION { ?item wdt:P580 ?d }
} GROUP BY ?item
`;

export interface SliceRun {
  kind: Kind;
  label: string;
  querySha256: string;
  rows: number;
  runtimeMs: number;
  bytes: number;
  bronzeSha256: string;
}

export type Counts = Record<Kind, Record<Period, Record<string, number>>>;

function sha(s: string | Uint8Array): string {
  return createHash("sha256").update(s).digest("hex");
}

export function parseTsv(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error("empty SPARQL result");
  return lines.slice(1).map((l) => l.split("\t"));
}

export function qid(cell: string): string | null {
  const m = /entity\/(Q[0-9]+)>?$/.exec(cell);
  return m ? m[1] : null;
}

export function intCell(cell: string): number | null {
  const m = /^"?(-?[0-9]+)"?(\^\^.*)?$/.exec(cell.trim());
  return m ? Number(m[1]) : null;
}

export function pointCell(cell: string): { lat: number; lng: number } | null {
  if (cell.includes("<")) return null;
  const m = /Point\(\s*(-?[0-9.eE+-]+)\s+(-?[0-9.eE+-]+)\s*\)/i.exec(cell);
  if (!m) return null;
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function emptyCounts(): Counts {
  const block = () => Object.fromEntries(PERIODS.map((p) => [p, Object.fromEntries([...REGIONS, UNPLACED].map((r) => [r, 0]))])) as Record<Period, Record<string, number>>;
  return { human: block(), site: block(), event: block() };
}

export function addHumanRows(counts: Counts, rows: string[][], regionOfCountry: Map<string, string>): number {
  let skipped = 0;
  for (const [yearCell, countryCell, nCell] of rows) {
    const year = intCell(yearCell);
    const n = intCell(nCell);
    const period = year === null ? null : periodOf(year);
    if (period === null || n === null) {
      skipped += n ?? 0;
      continue;
    }
    const c = qid(countryCell);
    counts.human[period][(c && regionOfCountry.get(c)) || UNPLACED] += n;
  }
  return skipped;
}

async function sparql(query: string): Promise<{ text: string; ms: number }> {
  const started = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { accept: "text/tab-separated-values", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query }).toString(),
    signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  const ms = Date.now() - started;
  if (!res.ok) throw new Error(`${ENDPOINT}: HTTP ${res.status}: ${text.slice(0, 300)}`);
  return { text, ms };
}

function bronze(dir: string, name: string, text: string): string {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), text);
  return sha(text);
}

async function regionOfCountries(svc: SupabaseClient): Promise<Map<string, string>> {
  const rows = await pagedRead<{ wikidata_qid: string | null; region: string | null }>((page) =>
    svc.from("country_regions").select("adm0_a3,wikidata_qid,region").order("adm0_a3").range(page.from, page.to) as unknown as Promise<{
      data: { wikidata_qid: string | null; region: string | null }[] | null;
      error: { message: string } | null;
    }>,
  );
  if (rows.length === 0) throw new Error("graph.country_regions is empty; run natural-earth.ts first");
  return new Map(rows.filter((r) => r.wikidata_qid && r.region).map((r) => [r.wikidata_qid!, r.region!]));
}

async function regionsForPoints(svc: SupabaseClient, points: { k: string; lat: number; lng: number }[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  for (let i = 0; i < points.length; i += POINT_BATCH) {
    const { data, error } = await svc.rpc("regions_for_points", { p_points: points.slice(i, i + POINT_BATCH) });
    if (error) throw new Error(`region lookup failed: ${error.message}`);
    const rows = data as { k: string; region: string | null }[];
    if (rows.length !== Math.min(POINT_BATCH, points.length - i)) throw new Error(`region lookup returned ${rows.length} rows for ${Math.min(POINT_BATCH, points.length - i)} points`);
    for (const r of rows) out.set(r.k, r.region);
  }
  return out;
}

export async function runReference(svc: SupabaseClient, runDate: string): Promise<{ runs: SliceRun[]; counts: Counts; skipped: Record<Kind, number> }> {
  const dir = path.join(ROOT, "_intake", "history", "wikidata-reference", runDate);
  const counts = emptyCounts();
  const runs: SliceRun[] = [];
  const skipped: Record<Kind, number> = { human: 0, site: 0, event: 0 };
  const countryRegion = await regionOfCountries(svc);

  for (const s of HUMAN_SLICES) {
    const query = humanQuery(s);
    const { text, ms } = await sparql(query);
    const rows = parseTsv(text);
    runs.push({ kind: "human", label: s.label, querySha256: sha(query), rows: rows.length, runtimeMs: ms, bytes: Buffer.byteLength(text), bronzeSha256: bronze(dir, `human_${s.from}_${s.to}.tsv`, text) });
    skipped.human += addHumanRows(counts, rows, countryRegion);
  }
  const worst = runs.filter((r) => r.kind === "human").reduce((a, b) => (b.runtimeMs > a.runtimeMs ? b : a));
  if (worst.runtimeMs > HUMAN_SLICE_LIMIT_MS) {
    throw new Error(`the largest human slice, ${worst.label}, took ${worst.runtimeMs} ms with ${worst.rows} rows, above ${HUMAN_SLICE_LIMIT_MS} ms`);
  }

  for (const [kind, query] of [
    ["site", SITE_QUERY],
    ["event", EVENT_QUERY],
  ] as const) {
    const { text, ms } = await sparql(query);
    const rows = parseTsv(text);
    runs.push({ kind, label: "all", querySha256: sha(query), rows: rows.length, runtimeMs: ms, bytes: Buffer.byteLength(text), bronzeSha256: bronze(dir, `${kind}.tsv`, text) });
    const points: { k: string; lat: number; lng: number; period: Period }[] = [];
    for (const [itemCell, yearCell, pointText] of rows) {
      const year = intCell(yearCell ?? "");
      const period = year === null ? null : periodOf(year);
      const p = pointCell(pointText ?? "");
      const item = qid(itemCell);
      if (!period || !p || !item) {
        skipped[kind] += 1;
        continue;
      }
      points.push({ k: item, ...p, period });
    }
    const regions = await regionsForPoints(svc, points.map(({ k, lat, lng }) => ({ k, lat, lng })));
    for (const p of points) counts[kind][p.period][regions.get(p.k) ?? UNPLACED] += 1;
  }
  return { runs, counts, skipped };
}

export async function storeCounts(svc: SupabaseClient, runDate: string, counts: Counts): Promise<number> {
  const rows = (Object.keys(counts) as Kind[]).flatMap((kind) =>
    PERIODS.flatMap((period) => Object.entries(counts[kind][period]).map(([region, n]) => ({ run_date: runDate, kind, period, region, n }))),
  );
  const { error } = await svc.from("history_reference_counts").upsert(rows, { onConflict: "run_date,kind,period,region" });
  if (error) throw new Error(`reference count write failed: ${error.message}`);
  return rows.length;
}

async function main() {
  const runDate = new Date().toISOString().slice(0, 10);
  const svc = graphClient("history-reference");
  const { runs, counts, skipped } = await runReference(svc, runDate);
  const stored = await storeCounts(svc, runDate, counts);
  const manifest = {
    runDate,
    endpoint: ENDPOINT,
    license: "Wikidata CC0",
    humanSliceLimitMs: HUMAN_SLICE_LIMIT_MS,
    queries: { human: humanQuery({ kind: "human", label: "<slice>", from: 0, to: 0 }).replace(">= 0 && YEAR(?b) <= 0", ">= <from> && YEAR(?b) <= <to>"), site: SITE_QUERY, event: EVENT_QUERY },
    runs,
    skipped,
    totals: Object.fromEntries((Object.keys(counts) as Kind[]).map((k) => [k, PERIODS.reduce((a, p) => a + Object.values(counts[k][p]).reduce((x, y) => x + y, 0), 0)])),
    counts,
  };
  const out = path.join(ROOT, "scripts", "research-os", "history", "reference-runs", `${runDate}.json`);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({ stored, runs, skipped, totals: manifest.totals }, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[history-reference] FAILED:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
