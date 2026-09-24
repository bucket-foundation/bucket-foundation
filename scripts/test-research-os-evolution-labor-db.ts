import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv, sql } from "./lib/test-harness";
import { parsePolicy } from "../src/lib/research-os/evidence/rights";
import { occupationSlug, taskSlug, toolSlug } from "../src/lib/evolution/labor";
import { runLabor } from "./research-os/evolution/lib/labor-run";
import { laborFixture } from "./research-os/evolution/lib/labor-fixture";
import { approveAndRunBatch } from "./research-os/evolution/lib/apply";

loadLocalEnv();

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
const probe = sql("select to_regprocedure('graph.promote_evolution_import(uuid)') is not null");
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ready = probe.status === 0 && probe.out === "t" && Boolean(url && key);
if (REQUIRED && !ready) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no local stack with the evolution import migration: ${probe.out}`);
const real = ready ? sql("select count(*) from graph.nodes where kind in ('occupation', 'task') and coalesce(provenance->>'release', '') not like 'fixture-%'").out : "0";
const skip = !ready ? "no local stack with the evolution import migration" : real !== "0" ? "real O*NET nodes are loaded; the fixture shares their slugs" : false;

const raw = fs.readFileSync(path.join(__dirname, "..", "learning", "research-os", "ai", "rights-policy.json"));
const policy = parsePolicy(JSON.parse(raw.toString("utf8")));
const policyMeta = { sha256: createHash("sha256").update(raw).digest("hex"), status: policy.status };

const SLUGS = [occupationSlug("15-1252.00"), occupationSlug("15-1251.00"), taskSlug(16363), taskSlug(16987), taskSlug(8591), toolSlug("Git"), toolSlug("Python")];

function cleanup(sources: string[]) {
  const list = sources.map((s) => `'${s}'`).join(",") || "''";
  const slugs = SLUGS.map((s) => `'${s}'`).join(",");
  const out = sql(`
    delete from graph.gold_lineage where silver_item_id in (select id from graph.silver_items where source_id in (${list}));
    delete from graph.factoids where silver_item_id in (select id from graph.silver_items where source_id in (${list}));
    delete from graph.evolution_batch_reviews where source_id in (${list});
    delete from graph.evolution_series where source_id in (${list});
    delete from graph.node_proposals where key = 'medallion:technology-large-language-models';
    delete from graph.edges where from_id in (select id from graph.nodes where slug in (${slugs})) or to_id in (select id from graph.nodes where slug in (${slugs}));
    delete from graph.nodes where slug in (${slugs});
    delete from graph.evidence_source_admissions where source_id in (${list});
    delete from graph.bronze_file_paths where repo_path like '_intake/evolution/%/fixture-%/%.jsonl';`);
  assert.equal(out.status, 0, out.out);
}

test("the labor fixture imports O*NET and BLS under the carve-out, stages Eloundou for review, and reruns write nothing", { skip }, async () => {
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
  const { manifest, files } = laborFixture(randomUUID().slice(0, 8));
  const reviewer = randomUUID();
  let sourceIds: string[] = [];
  try {
    const [first, second] = await runLabor(svc, { manifest, files, policy, policyMeta, requirePlanCounts: false });
    sourceIds = sql(`select string_agg(distinct source_id, ',') from graph.silver_items where parser = 'evolution-import' and locator like '%#%' and source_id in (select source_id from graph.bronze_file_paths b join graph.evidence_source_admissions a using (source_id) where b.repo_path like '_intake/evolution/%/fixture-%')`).out.split(",").filter(Boolean);
    assert.equal(first.written.nodes, 7);
    assert.equal(first.written.edges, 6);
    assert.equal(first.written.proposals, 1);
    assert.equal(first.written.factoids, 0);
    assert.equal(first.written.silver, 8);
    assert.equal(first.written.edgeCandidates, 8);
    assert.equal(second.written.series, 2);
    assert.equal(sql(`select count(*) from graph.nodes where slug in (${SLUGS.map((s) => `'${s}'`).join(",")})`).out, "7");
    assert.equal(sql(`select string_agg(distinct l.importer, ',') from graph.gold_lineage l join graph.nodes n on n.id = l.node_id where n.slug in (${SLUGS.map((s) => `'${s}'`).join(",")})`).out, "evolution-import");
    assert.equal(sql(`select count(*) from graph.edges e join graph.nodes a on a.id = e.from_id where a.slug = '${occupationSlug("15-1252.00")}' and e.kind in ('performs', 'uses')`).out, "4");
    assert.equal(sql(`select count(*) from graph.edges e join graph.nodes t on t.id = e.to_id where t.slug in ('${taskSlug(16363)}', '${taskSlug(8591)}') and e.kind = 'automates'`).out, "0");
    assert.equal(sql(`select value::bigint || ' ' || year from graph.evolution_series s join graph.nodes n on n.id = s.subject_id where n.slug = '${occupationSlug("15-1252.00")}'`).out, "1534790 2022");

    const again = await runLabor(svc, { manifest, files, policy, policyMeta, requirePlanCounts: false });
    for (const r of again) {
      assert.deepEqual(r.written, { silver: 0, edgeCandidates: 0, series: 0, proposals: 0, nodes: 0, edges: 0, factoids: 0, preferred: 0 });
    }

    await assert.rejects(runLabor(svc, { manifest, files, policy, policyMeta, requirePlanCounts: true }), /the plan counts 1016/);

    const eloundou = manifest.files.eloundou!.path;
    const src = sql(`select a.source_id || ' ' || a.source_revision from graph.evidence_source_admissions a join graph.bronze_file_paths b on b.source_id = a.source_id where b.repo_path = '${eloundou}' and a.status = 'active' limit 1`).out.split(" ");
    assert.equal(sql(`insert into auth.users (id, email) values ('${reviewer}', 'evo-labor-${reviewer.slice(0, 8)}@test.example')`).status, 0);
    const review = sql(`insert into graph.evolution_batch_reviews (source_id, source_revision, parser, role, sample_size) values ('${src[0]}', '${src[1]}', 'evolution-import', 'measured', 200) returning id`).out.split("\n")[0];
    const bad = await approveAndRunBatch(svc, { reviewId: review, reviewerId: reviewer, errors: 6, env: { EVOLUTION_BATCH_PROMOTION: "on" } });
    assert.equal(!bad.ok && bad.reason, "upper_bound_too_high");
    const off = await approveAndRunBatch(svc, { reviewId: review, reviewerId: reviewer, errors: 0, env: {} });
    assert.equal(!off.ok && off.reason, "batch_promotion_off");
    assert.equal(sql(`select status from graph.evolution_batch_reviews where id = '${review}'`).out, "pending");
  } finally {
    sql(`delete from graph.evolution_batch_reviews where reviewer_id = '${reviewer}' or source_id in (${sourceIds.map((s) => `'${s}'`).join(",") || "''"})`);
    sql(`delete from auth.users where id = '${reviewer}'`);
    cleanup(sourceIds);
  }
});
