import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv, sql } from "./lib/test-harness";
import { runImport } from "./research-os/history/import";

loadLocalEnv();

const probe = sql("select to_regprocedure('graph.prefer_history_factoid(uuid, text)') is not null");
const ready = probe.status === 0 && probe.out === "t" && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no local stack carries the history migrations: ${probe.out}`);
}
const skip = ready ? false : "no local stack with the history migrations, a Supabase URL and a service key";

function svc(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
}

test("a second import run writes nothing", { skip }, async () => {
  await runImport(svc(), true);
  const { report } = await runImport(svc(), true);
  assert.deepEqual(report.written, { places: 0, silver: 0, proposals: 0, factoids: 0, preferred: 0 });
  assert.equal(report.bronze.unchanged, 5);
  assert.equal(report.bronze.refused, 0);
});

test("every present site and every resolved timeline subject carries a preferred factoid", { skip }, () => {
  const sites = sql(`
    select count(*) filter (where not exists (
      select 1 from graph.factoids f where f.subject_id = n.id and f.role = 'founded' and f.preferred and f.status = 'active'))
    from graph.nodes n where n.kind = 'site' and n.provenance->>'type' = 'canon_site'`);
  assert.equal(sites.status, 0, sites.out);
  assert.equal(sites.out, "0");
  const births = sql(`
    select count(*) from graph.silver_items s join graph.nodes n on n.slug = s.subject
    where s.parser = 'history-import' and s.proposal->>'source' = 'src/data/canon-timeline.json' and s.proposal->'roles' ? 'born'
      and not exists (select 1 from graph.factoids f where f.subject_id = n.id and f.role = 'born' and f.preferred and f.status = 'active')`);
  assert.equal(births.status, 0, births.out);
  assert.equal(births.out, "0");
});

test("wikidata-cc0 rows never reach gold without a reviewer", { skip }, () => {
  const r = sql(`
    select count(*) from graph.gold_lineage l join graph.silver_items s on s.id = l.silver_item_id
    join graph.evidence_source_admissions a on a.source_id = s.source_id and a.source_revision = s.source_revision
    where l.factoid_id is not null and a.rights_rule = 'wikidata-cc0' and l.reviewer_id is null`);
  assert.equal(r.status, 0, r.out);
  assert.equal(r.out, "0");
});

test("published sacred-history anchors agree with any gold factoid for their QID", { skip }, () => {
  const published = JSON.parse(readFileSync(path.join(__dirname, "..", "src/data/sacred-history.json"), "utf8")).timeline as { id: string; wikidata: string; year: number; precision: string }[];
  const qids = published.map((e) => `'${e.wikidata.replace(/'/g, "")}'`).join(",");
  const r = sql(`
    select x.external_id || ' ' || w.start_min || ' ' || w.end_max from graph.node_external_ids x
    join graph.node_when_where w on w.subject_id = x.node_id
    where x.authority = 'wikidata' and x.external_id in (${qids}) and w.preferred`);
  assert.equal(r.status, 0, r.out);
  for (const line of r.out.split("\n").filter(Boolean)) {
    const [qid, lo, hi] = line.split(" ");
    const e = published.find((p) => p.wikidata === qid)!;
    const year = e.year < 0 ? e.year + 1 : e.year;
    const slack = e.precision === "century" ? 100 : e.precision === "decade" ? 10 : 0;
    assert.ok(Number(lo) - slack <= year && year <= Number(hi) + slack, `${e.id}: published ${e.year} is outside gold ${lo}..${hi}`);
  }
});
