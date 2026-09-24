import type { SupabaseClient } from "@supabase/supabase-js";
import { pagedRead } from "../../../src/lib/research-os/paging";
import { coverageReport, type BucketCell, type CoverageReport, type ReferenceCell } from "../../../src/lib/history/coverage";
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
  const bucket = await readAll<{ kind: BucketCell["kind"]; region: string; period: string; subjects: number; sources: number; conflicted: number; year_or_finer: number }>((from, to) =>
    svc.from("history_coverage").select("kind,region,period,subjects,sources,conflicted,year_or_finer").order("kind").order("region").order("period").range(from, to),
  );
  const reference = await readAll<ReferenceCell>((from, to) =>
    svc.from("history_reference_counts").select("run_date,kind,period,region,n").eq("run_date", runDate).order("run_date").order("kind").order("period").order("region").range(from, to),
  );
  return {
    runDate,
    report: coverageReport(
      bucket.map((c) => ({ kind: c.kind, region: c.region, period: c.period, subjects: Number(c.subjects), sources: Number(c.sources), conflicted: Number(c.conflicted), yearOrFiner: Number(c.year_or_finer) })),
      reference.map((r) => ({ ...r, n: Number(r.n) })),
    ),
  };
}

const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "inf");

export function formatReport(report: CoverageReport, runDate: string): string {
  const out: string[] = [];
  out.push(`History coverage against the Wikidata reference of ${runDate}`);
  out.push(`B: ${JSON.stringify(report.totals.B)}  W: ${JSON.stringify(report.totals.W)}`);
  out.push(`unplaced: ${JSON.stringify(report.unplaced)}  unresolved: ${JSON.stringify(report.unresolved)}`);
  out.push("");
  out.push(`Cells with E >= 5: ${report.printed.length} of ${report.cells.length}`);
  out.push("region | period | b | E | C | 95% interval | sources | conflict rate | gap");
  for (const c of report.printed) {
    out.push(`${c.region} | ${c.period} | ${c.b} | ${f(c.E)} | ${f(c.C)} | ${f(c.interval.low)} to ${f(c.interval.high)} | ${c.sources} | ${c.conflictRate === null ? "n/a" : f(c.conflictRate)} | ${c.gap ? "GAP" : ""}`);
  }
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
  const { report, runDate } = await loadReport(svc, !process.argv.includes("--no-refresh"));
  console.log(process.argv.includes("--json") ? JSON.stringify(report, null, 2) : formatReport(report, runDate));
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[gap-report] FAILED:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
