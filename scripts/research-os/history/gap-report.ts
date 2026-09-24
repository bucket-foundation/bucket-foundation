import { spawnSync } from "node:child_process";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../../../src/lib/research-os/paging";
import { aboveOneNotes, coverageReport, dominantUnplacedCause, type BucketCell, type CoverageReport, type ReferenceCell } from "../../../src/lib/history/coverage";
import { graphClient } from "../ingest/lib/medallion-shadow";

function readAll<T>(run: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  return pagedRead<T>((page) => run(page.from, page.to) as Promise<{ data: T[] | null; error: { message: string } | null }>);
}

export async function loadReport(svc: SupabaseClient, refresh = true): Promise<{ report: CoverageReport; runDate: string }> {
  if (refresh) {
    const { error } = await svc.rpc("refresh_history_coverage");
    if (error) throw new Error(`coverage refresh failed: ${error.message}`);
  }
  const latest = await svc.from("history_reference_counts").select("run_date").order("run_date", { ascending: false }).limit(1);
  if (latest.error) throw new Error(`reference lookup failed: ${latest.error.message}`);
  const runDate = (latest.data as { run_date: string }[])[0]?.run_date;
  if (!runDate) throw new Error("graph.history_reference_counts is empty; run reference.ts first");
  const bucket = await readAll<{ kind: BucketCell["kind"]; region: string; period: string; subjects: number; sources: number; conflicted: number; year_or_finer: number; unplaced_reason: string }>((from, to) =>
    svc.from("history_coverage").select("kind,region,period,unplaced_reason,subjects,sources,conflicted,year_or_finer").order("kind").order("region").order("period").order("unplaced_reason").range(from, to),
  );
  const reference = await readAll<ReferenceCell>((from, to) =>
    svc.from("history_reference_counts").select("run_date,kind,period,region,n").eq("run_date", runDate).order("run_date").order("kind").order("period").order("region").range(from, to),
  );
  return {
    runDate,
    report: coverageReport(
      bucket.map((c) => ({ kind: c.kind, region: c.region, period: c.period, subjects: Number(c.subjects), sources: Number(c.sources), conflicted: Number(c.conflicted), yearOrFiner: Number(c.year_or_finer), unplacedReason: c.unplaced_reason || undefined })),
      reference.map((r) => ({ ...r, n: Number(r.n) })),
    ),
  };
}

export const PROJECT_STAGED_SQL = `
begin;
create temporary table t_reviewer on commit drop as select gen_random_uuid() as id;
insert into auth.users (id, email) select id, 'projection-' || id || '@bucket.test' from t_reviewer;
select graph.decide_external_id(p.id, (select id from t_reviewer), p.candidates->0->>'qid', null)
  from graph.external_id_proposals p where p.status = 'pending' and p.reason = 'one_candidate';
create temporary table t_staged on commit drop as
  select s.id, s.subject, r.role,
         row_number() over (partition by s.subject, r.role order by (s.proposal->'roles'->r.role->>'precision') = 'day' desc, s.span_start, s.id) as rank
  from graph.silver_items s
  cross join lateral jsonb_object_keys(s.proposal->'roles') as r(role)
  join graph.nodes n on n.slug = s.subject
  join graph.node_external_ids x on x.authority = 'wikidata' and x.external_id = s.proposal->>'qid' and x.node_id = n.id
  where s.parser = 'history-import' and s.parser_revision = 'history-import/wikidata-1' and s.status in ('candidate', 'promoted');
select graph.promote_history_factoid(id, (select id from t_reviewer), false) from (select distinct id from t_staged) d;
select graph.prefer_history_factoid(id, role, (select id from t_reviewer)) from t_staged where rank = 1;
refresh materialized view graph.history_coverage;
select coalesce(json_agg(json_build_object('kind', kind, 'region', region, 'period', period, 'unplaced_reason', unplaced_reason, 'subjects', subjects, 'sources', sources, 'conflicted', conflicted, 'year_or_finer', year_or_finer)), '[]') from graph.history_coverage;
rollback;
`;

export function projectStaged(dbUrl: string): BucketCell[] {
  const run = spawnSync("psql", [dbUrl, "-At", "-q", "-v", "ON_ERROR_STOP=1"], { input: PROJECT_STAGED_SQL, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`projection failed: ${run.stderr}`);
  const line = run.stdout.split("\n").filter((l) => l.startsWith("[")).pop();
  if (!line) throw new Error("projection returned no coverage rows");
  return (JSON.parse(line) as { kind: BucketCell["kind"]; region: string; period: string; unplaced_reason: string; subjects: number; sources: number; conflicted: number; year_or_finer: number }[]).map((c) => ({
    kind: c.kind,
    region: c.region,
    period: c.period,
    subjects: Number(c.subjects),
    sources: Number(c.sources),
    conflicted: Number(c.conflicted),
    yearOrFiner: Number(c.year_or_finer),
    unplacedReason: c.unplaced_reason || undefined,
  }));
}

const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "inf");

export function formatReport(report: CoverageReport, runDate: string): string {
  const out: string[] = [];
  out.push(`History coverage against the Wikidata reference of ${runDate}`);
  out.push(`B: ${JSON.stringify(report.totals.B)}  W: ${JSON.stringify(report.totals.W)}`);
  out.push(`unplaced: ${JSON.stringify(report.unplaced)}  unresolved: ${JSON.stringify(report.unresolved)}`);
  const cause = dominantUnplacedCause(report);
  if (cause) out.push(cause);
  out.push("");
  out.push(`Cells with E >= 5: ${report.printed.length} of ${report.cells.length}`);
  out.push("region | period | b | E | C | 95% interval | sources | conflict rate | gap");
  for (const c of report.printed) {
    out.push(`${c.region} | ${c.period} | ${c.b} | ${f(c.E)} | ${f(c.C)} | ${f(c.interval.low)} to ${f(c.interval.high)} | ${c.sources} | ${c.conflictRate === null ? "n/a" : f(c.conflictRate)} | ${c.gap ? "GAP" : ""}`);
  }
  for (const note of aboveOneNotes(report)) out.push(note);
  out.push("");
  out.push(`Gaps, upper bound on C under 0.5: ${report.gaps.length}`);
  for (const g of report.gaps) out.push(`  ${g.region}, ${g.period}: b ${g.b}, E ${f(g.E)}, C upper ${f(g.interval.high)}`);
  out.push("");
  out.push("Eurocentrism index, Europe and Northern America, b / E");
  for (const e of report.eurocentrism) out.push(`  ${e.period}: EI ${f(e.EI)} (${f(e.interval.low)} to ${f(e.interval.high)}), b ${e.b}, E ${f(e.E)}`);
  out.push("");
  out.push("Share of anchors dated to the year or finer, by region");
  for (const p of report.precisionShare) out.push(`  ${p.region}: ${p.share === null ? "n/a" : f(p.share)} of ${p.subjects}`);
  return out.join("\n");
}

async function main() {
  const svc = graphClient("gap-report");
  const { report: now, runDate } = await loadReport(svc, !process.argv.includes("--no-refresh"));
  let report = now;
  if (process.argv.includes("--project-staged")) {
    const reference = await readAll<ReferenceCell>((from, to) =>
      svc.from("history_reference_counts").select("run_date,kind,period,region,n").eq("run_date", runDate).order("run_date").order("kind").order("period").order("region").range(from, to),
    );
    const dbUrl = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    report = coverageReport(projectStaged(dbUrl), reference.map((r) => ({ ...r, n: Number(r.n) })));
    console.log(`Projection with every one-candidate identity linked and its staged Wikidata dates approved; nothing is written. Today: ${now.printed.length} measurable cells.`);
  }
  console.log(process.argv.includes("--json") ? JSON.stringify(report, null, 2) : formatReport(report, runDate));
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[gap-report] FAILED:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
