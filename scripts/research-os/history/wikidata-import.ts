import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../../../src/lib/research-os/paging";
import { admissionRow, bronzeRecord, runRevision, type BronzeRecord } from "../../../src/lib/research-os/medallion/bronze";
import { SILVER_CONFLICT } from "../../../src/lib/research-os/medallion/plan";
import { rightsFor, SACRED_DIR, type HistorySilver, type PlaceDraft } from "../../../src/lib/history/importer";
import { slugifyPart } from "../../../src/lib/research-os/ingest/types";
import { parseLifespan } from "../../../src/lib/history/span";
import {
  datesQuery,
  eventsQuery,
  identityProposals,
  matchQuery,
  periodDrafts,
  planEventDates,
  planFigureDates,
  QUERY_LIMIT_MS,
  type Figure,
  type IdentityProposal,
} from "../../../src/lib/history/wikidata";
import { graphClient } from "../ingest/lib/medallion-shadow";
import { loadPolicy, ROOT } from "../medallion/lib/repo-io";

const LABEL = "wikidata-import";
export const ENDPOINT = process.env.HISTORY_WIKIDATA_ENDPOINT || "https://qlever.dev/api/wikidata";
export const PERIODO = {
  url: "https://data.perio.do/d.json",
  bytes: 7_806_148,
  sha256: "5a2844dae25b5438044bf89a2aaabe96fa1a41fb64edbe559e1a8e9e76b3da46",
  date: "2026-09-24",
};
const WIKIDATA_RULE = "wikidata-figures-cc0";
const PERIODO_RULE = "periodo-cc0";

export interface WikidataReport {
  queries: { name: string; rows: number; runtimeMs: number; reused: boolean }[];
  proposals: Record<IdentityProposal["reason"], number>;
  silver: { born: number; died: number; occurred: number; refused: number };
  places: number;
  periods: { parsed: number; skipped: number };
  written: { proposals: number; silver: number; places: number; periods: number; tagged: number };
  bronze: { staged: number; activated: number; unchanged: number };
}

function sha(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function sparql(query: string): Promise<{ text: string; ms: number }> {
  const started = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { accept: "text/tab-separated-values", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query }).toString(),
    signal: AbortSignal.timeout(QUERY_LIMIT_MS + 5_000),
  });
  const text = await res.text();
  const ms = Date.now() - started;
  if (!res.ok) throw new Error(`${ENDPOINT}: HTTP ${res.status}: ${text.slice(0, 300)}`);
  if (ms > QUERY_LIMIT_MS) throw new Error(`a Wikidata query took ${ms} ms, above the ${QUERY_LIMIT_MS} ms gate`);
  return { text, ms };
}

async function snapshot(dir: string, name: string, query: string, refetch: boolean, report: WikidataReport): Promise<string> {
  const file = path.join(ROOT, dir, `${name}.tsv`);
  writeFileSync(path.join(ROOT, dir, `${name}.rq`), query);
  if (existsSync(file) && !refetch) {
    const text = readFileSync(file, "utf8");
    report.queries.push({ name, rows: Math.max(0, text.split("\n").filter(Boolean).length - 1), runtimeMs: 0, reused: true });
    return text;
  }
  const { text, ms } = await sparql(query);
  writeFileSync(file, text);
  report.queries.push({ name, rows: Math.max(0, text.split("\n").filter(Boolean).length - 1), runtimeMs: ms, reused: false });
  return text;
}

export function canonFigures(existing: Set<string>): Figure[] {
  const figures = JSON.parse(readFileSync(path.join(ROOT, "canon-figures/figures.json"), "utf8")).figures as { id: string; name: string; lifespan?: string }[];
  return figures
    .map((f) => {
      const parsed = f.lifespan ? parseLifespan(f.lifespan) : null;
      const born = parsed && parsed.ok ? (parsed.roles.born ?? parsed.roles.flourished ?? null) : null;
      return { slug: `figure-${slugifyPart(f.id)}`, id: f.id, name: f.name, born: born ? { start_min: born.start_min, end_max: born.end_max } : null };
    })
    .filter((f) => existing.has(f.slug));
}

function sacredQids(): string[] {
  const text = readFileSync(path.join(ROOT, SACRED_DIR, "timeline-events.jsonl"), "utf8");
  return Array.from(new Set(text.split("\n").filter((l) => l.trim()).map((l) => (JSON.parse(l) as { wikidata: string }).wikidata))).sort();
}

async function readNodes(svc: SupabaseClient): Promise<{ id: string; slug: string }[]> {
  return pagedRead<{ id: string; slug: string }>((page) =>
    svc.from("nodes").select("id,slug").eq("kind", "figure").order("id").range(page.from, page.to) as unknown as Promise<{
      data: { id: string; slug: string }[] | null;
      error: { message: string } | null;
    }>,
  );
}

async function pullPeriodo(): Promise<Uint8Array> {
  const file = path.join(ROOT, "_intake", "history", "periodo", PERIODO.date, "d.json");
  let bytes: Uint8Array;
  if (existsSync(file)) bytes = readFileSync(file);
  else {
    const res = await fetch(PERIODO.url);
    if (!res.ok) throw new Error(`${PERIODO.url}: HTTP ${res.status}`);
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  if (bytes.length !== PERIODO.bytes || sha(bytes) !== PERIODO.sha256) {
    throw new Error(`PeriodO: ${bytes.length} bytes sha256 ${sha(bytes)}, pinned ${PERIODO.bytes} bytes ${PERIODO.sha256}`);
  }
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
  return bytes;
}

async function upsert(svc: SupabaseClient, table: string, rows: Record<string, unknown>[], onConflict: string): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await svc.from(table).upsert(rows.slice(i, i + 200), { onConflict, ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`${table} write failed: ${error.message}`);
    written += (data ?? []).length;
  }
  return written;
}

export async function runWikidataImport(svc: SupabaseClient, options: { date: string; refetch: boolean; apply: boolean }): Promise<WikidataReport> {
  const report: WikidataReport = {
    queries: [],
    proposals: { one_candidate: 0, several_candidates: 0, no_candidate: 0 },
    silver: { born: 0, died: 0, occurred: 0, refused: 0 },
    places: 0,
    periods: { parsed: 0, skipped: 0 },
    written: { proposals: 0, silver: 0, places: 0, periods: 0, tagged: 0 },
    bronze: { staged: 0, activated: 0, unchanged: 0 },
  };
  const { policy, sha256 } = loadPolicy();
  const nodes = await readNodes(svc);
  const nodeId = new Map(nodes.map((n) => [n.slug, n.id]));
  const figures = canonFigures(new Set(nodeId.keys()));

  const dir = path.join("_intake", "history", "wikidata-figures", options.date);
  mkdirSync(path.join(ROOT, dir), { recursive: true });
  const matchTsv = await snapshot(dir, "match", matchQuery(figures), options.refetch, report);
  const proposals = identityProposals(figures, matchTsv);
  for (const p of proposals) report.proposals[p.reason] += 1;
  const qids = Array.from(new Set(proposals.flatMap((p) => p.candidates.map((c) => c.qid)))).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const bornTsv = await snapshot(dir, "born", datesQuery(qids, "P569", "P19"), options.refetch, report);
  const diedTsv = await snapshot(dir, "died", datesQuery(qids, "P570", "P20"), options.refetch, report);
  const eventsTsv = await snapshot(dir, "events", eventsQuery(sacredQids()), options.refetch, report);
  writeFileSync(path.join(ROOT, dir, "manifest.json"), JSON.stringify({ endpoint: ENDPOINT, license: "Wikidata CC0", date: options.date, queries: report.queries, files: Object.fromEntries(["match", "born", "died", "events"].map((n) => [`${n}.tsv`, sha(readFileSync(path.join(ROOT, dir, `${n}.tsv`)))])) }, null, 2) + "\n");

  const rights = rightsFor(policy, WIKIDATA_RULE);
  const bronze: Record<string, BronzeRecord> = {
    match: bronzeRecord(`${dir}/match.tsv`, Buffer.from(matchTsv), rights),
    born: bronzeRecord(`${dir}/born.tsv`, Buffer.from(bornTsv), rights),
    died: bronzeRecord(`${dir}/died.tsv`, Buffer.from(diedTsv), rights),
    events: bronzeRecord(`${dir}/events.tsv`, Buffer.from(eventsTsv), rights),
  };
  const periodoBytes = await pullPeriodo();
  const periodoBronze = bronzeRecord(`_intake/history/periodo/${PERIODO.date}/d.json`, periodoBytes, rightsFor(policy, PERIODO_RULE));
  const subjectOf = new Map<string, string[]>();
  for (const p of proposals) for (const c of p.candidates) subjectOf.set(c.qid, [...(subjectOf.get(c.qid) ?? []), p.figure.slug]);
  const born = planFigureDates(bronze.born, "born", subjectOf);
  const died = planFigureDates(bronze.died, "died", subjectOf);
  const events = planEventDates(bronze.events);
  const periods = periodDrafts(JSON.parse(Buffer.from(periodoBytes).toString("utf8")));
  report.silver = { born: born.silver.length, died: died.silver.length, occurred: events.silver.length, refused: born.refused.length + died.refused.length + events.refused.length };
  const places = new Map<string, PlaceDraft>();
  for (const p of [...born.places, ...died.places]) if (!places.has(p.slug)) places.set(p.slug, p);
  report.places = places.size;
  report.periods = { parsed: periods.periods.length, skipped: periods.skipped };
  if (!options.apply) return report;

  const all = [...Object.values(bronze), periodoBronze];
  const { data: admitted, error: admitErr } = await svc.rpc("admit_bronze_sources", { p_run_revision: runRevision(all), p_policy_sha256: sha256, p_policy_status: policy.status, p_rows: all.map(admissionRow) });
  if (admitErr) throw new Error(`bronze admission failed: ${admitErr.message}`);
  const a = admitted as { staged: number; activated: number; unchanged: number; refused: { source_id: string; reason: string }[] };
  if (a.refused.length) throw new Error(`bronze refused: ${a.refused.map((r) => r.reason).join("; ")}`);
  report.bronze = { staged: a.staged, activated: a.activated, unchanged: a.unchanged };

  report.written.proposals = await upsert(
    svc,
    "external_id_proposals",
    proposals.map((p) => ({ node_id: nodeId.get(p.figure.slug)!, authority: "wikidata", candidates: p.candidates, reason: p.reason, source_id: bronze.match.sourceId, source_revision: bronze.match.sourceRevision })),
    "node_id,authority,source_id,source_revision",
  );
  const source = (repoPath: string) => (repoPath.endsWith("born.tsv") ? bronze.born : bronze.died);
  report.written.places = await upsert(
    svc,
    "places",
    Array.from(places.values()).map((p) => ({ slug: p.slug, title: p.title, lat: p.lat, lng: p.lng, wikidata_qid: p.slug.replace(/^wikidata-q/, "Q"), source_id: source(p.repoPath).sourceId, source_revision: source(p.repoPath).sourceRevision })),
    "slug",
  );
  const { error: assignErr } = await svc.rpc("assign_place_regions");
  if (assignErr) throw new Error(`region assignment failed: ${assignErr.message}`);
  const silver: HistorySilver[] = [...born.silver, ...died.silver, ...events.silver];
  report.written.silver = await upsert(svc, "silver_items", silver as unknown as Record<string, unknown>[], SILVER_CONFLICT);
  const { data: tagged, error: tagErr } = await svc.rpc("tag_identity_silver");
  if (tagErr) throw new Error(`identity tagging failed: ${tagErr.message}`);
  report.written.tagged = Number(tagged ?? 0);
  report.written.periods = await upsert(
    svc,
    "periods",
    periods.periods.map((p) => ({ ...p, source_id: periodoBronze.sourceId, source_revision: periodoBronze.sourceRevision })),
    "id",
  );
  const { error: refreshErr } = await svc.rpc("refresh_history_coverage");
  if (refreshErr) throw new Error(`coverage refresh failed: ${refreshErr.message}`);
  return report;
}

async function main() {
  const date = process.argv.find((a) => a.startsWith("--date="))?.slice(7) ?? new Date().toISOString().slice(0, 10);
  const report = await runWikidataImport(graphClient(LABEL), { date, refetch: process.argv.includes("--refetch"), apply: process.argv.includes("--apply") });
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[${LABEL}] FAILED:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
