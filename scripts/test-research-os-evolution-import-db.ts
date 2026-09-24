import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv, sql } from "./lib/test-harness";
import { parsePolicy } from "../src/lib/research-os/evidence/rights";
import { planEvolution, type EvolutionSource } from "../src/lib/evolution/importer";
import { applyEvolution, approveAndRunBatch, readGraph } from "./research-os/evolution/lib/apply";
import { fixtureRecords, fixtureText, type FixtureRow } from "./research-os/evolution/lib/fixture";

loadLocalEnv();

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
const probe = sql("select to_regprocedure('graph.promote_evolution_batch(uuid)') is not null");
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ready = probe.status === 0 && probe.out === "t" && Boolean(url && key);
if (REQUIRED && !ready) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no local stack with the evolution migration: ${probe.out}`);
const skip = ready ? false : "no local stack with the evolution migration";

const raw = fs.readFileSync(path.join(__dirname, "..", "learning", "research-os", "ai", "rights-policy.json"));
const policy = parsePolicy(JSON.parse(raw.toString("utf8")));
const policyMeta = { sha256: createHash("sha256").update(raw).digest("hex"), status: policy.status };

function svc(): SupabaseClient {
  return createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
}

function cleanup(tag: string, sources: string[]) {
  const list = sources.map((s) => `'${s}'`).join(",") || "''";
  const out = sql(`
    delete from graph.gold_lineage where silver_item_id in (select id from graph.silver_items where source_id in (${list}));
    delete from graph.factoids where silver_item_id in (select id from graph.silver_items where source_id in (${list}));
    delete from graph.evolution_batch_reviews where source_id in (${list});
    delete from graph.node_proposals where key like 'medallion:evo-imp-${tag}%';
    delete from graph.edges where from_id in (select id from graph.nodes where slug like 'evo-imp-${tag}%');
    delete from graph.nodes where slug like 'evo-imp-${tag}%';
    delete from graph.evidence_source_admissions where source_id in (${list});
    delete from graph.bronze_file_paths where repo_path like '_intake/evolution/%/fixture-${tag}/%';`);
  assert.equal(out.status, 0, out.out);
}

test("the importer core runs bronze to gold, refuses unapproved rules, reruns idempotently, and batches only when enabled", { skip }, async () => {
  const tag = randomUUID().slice(0, 8);
  const occ = `evo-imp-${tag}-occ`;
  const task = `evo-imp-${tag}-task`;
  const sw = `evo-imp-${tag}-sw`;
  const made = sql(`insert into graph.nodes (slug, title, kind, branch, visibility, provenance) values
      ('${occ}', 'Developers', 'occupation', '11-work', 'public', '{"type": "onet_occupation", "level": "onet"}'),
      ('${task}', 'Write code', 'task', '11-work', 'public', '{"type": "onet_task", "level": "dwa"}'),
      ('${sw}', 'Kernel', 'software', '04-information', 'public', '{"type": "wikidata", "level": "os"}');
    insert into graph.edges (from_id, to_id, kind) select a.id, b.id, 'performs' from graph.nodes a, graph.nodes b where a.slug = '${occ}' and b.slug = '${task}';`);
  assert.equal(made.status, 0, made.out);
  const client = svc();
  const sources: string[] = [];
  try {
    const onetRows: FixtureRow[] = [
      { id: "a", subject: { kind: "node", slug: occ, nodeKind: "occupation" }, role: "emerged", year: 1957 },
      { id: "b", subject: { kind: "edge", fromSlug: occ, toSlug: task, edgeKind: "performs" }, role: "began", year: 1960 },
    ];
    const wdRows: FixtureRow[] = [{ id: "c", subject: { kind: "node", slug: sw, nodeKind: "software" }, role: "released", year: 1991 }];
    const onet: EvolutionSource = { repoPath: `_intake/evolution/onet/fixture-${tag}/rows.jsonl`, rule: "onet-cc-by", prior: 0.9 };
    const wd: EvolutionSource = { repoPath: `_intake/evolution/wikidata/fixture-${tag}/rows.jsonl`, rule: "wikidata-evolution-cc0", prior: 0.9 };
    const graph = await readGraph(client);
    const build = () =>
      planEvolution({
        sources: [onet, wd],
        files: new Map([
          [onet.repoPath, Buffer.from(fixtureText(onetRows, tag))],
          [wd.repoPath, Buffer.from(fixtureText(wdRows, tag))],
        ]),
        policy,
        nodes: graph.nodes,
        edges: graph.edges,
        records: (b, s) => fixtureRecords(s.rule === "onet-cc-by" ? onetRows : wdRows)(b, s),
      });
    const p1 = build();
    sources.push(...p1.bronze.map((b) => b.sourceId));
    const r1 = await applyEvolution(client, p1, policyMeta);
    assert.equal(r1.bronze.refused, 0);
    assert.equal(r1.written.silver, 3);
    assert.equal(r1.written.factoids, 2);
    assert.equal(sql(`select count(*) from graph.factoids f join graph.silver_items s on s.id = f.silver_item_id where s.source_id = '${p1.bronze[0].sourceId}' and f.edge_id is not null`).out, "1");
    assert.equal(sql(`select string_agg(distinct importer, ',') from graph.gold_lineage l join graph.silver_items s on s.id = l.silver_item_id where s.source_id = '${p1.bronze[0].sourceId}'`).out, "evolution-import");

    const r2 = await applyEvolution(client, build(), policyMeta);
    assert.deepEqual(r2.written, { silver: 0, proposals: 0, factoids: 0, preferred: 0 });
    assert.equal(r2.bronze.activated, 0);

    const wdSilver = sql(`select id from graph.silver_items where source_id = '${p1.bronze[1].sourceId}'`).out;
    const { data: refused, error: refusedErr } = await client.rpc("promote_evolution_factoid", { p_silver: wdSilver, p_reviewer: null, p_preferred: false });
    assert.equal(refused, null);
    assert.equal(refusedErr?.code, "23514");
    assert.equal(sql(`select count(*) from graph.factoids where silver_item_id = '${wdSilver}'`).out, "0");

    const reviewer = randomUUID();
    assert.equal(sql(`insert into auth.users (id, email) values ('${reviewer}', 'evo-imp-${tag}@test.example')`).status, 0);
    const review = sql(`insert into graph.evolution_batch_reviews (source_id, source_revision, parser, role, sample_size)
      values ('${p1.bronze[1].sourceId}', '${p1.bronze[1].sourceRevision}', 'evolution-import', 'released', 200) returning id`).out.split("\n")[0];
    const off = await approveAndRunBatch(client, { reviewId: review, reviewerId: reviewer, errors: 0, env: {} });
    assert.deepEqual(off, { ok: false, reason: "batch_promotion_off" });
    const high = await approveAndRunBatch(client, { reviewId: review, reviewerId: reviewer, errors: 9, env: { EVOLUTION_BATCH_PROMOTION: "on" } });
    assert.equal(!high.ok && high.reason, "upper_bound_too_high");
    assert.equal(sql(`select status from graph.evolution_batch_reviews where id = '${review}'`).out, "pending");
    const on = await approveAndRunBatch(client, { reviewId: review, reviewerId: reviewer, errors: 0, env: { EVOLUTION_BATCH_PROMOTION: "on" } });
    assert.equal(on.ok && on.promoted, 1);
    assert.equal(sql(`select promoted_by || ' ' || reviewer_id from graph.gold_lineage where silver_item_id = '${wdSilver}'`).out, `batch ${reviewer}`);
    const again = await approveAndRunBatch(client, { reviewId: review, reviewerId: reviewer, errors: 0, env: { EVOLUTION_BATCH_PROMOTION: "on" } });
    assert.equal(!again.ok && again.reason, "review_approved");
    sql(`delete from auth.users where id = '${reviewer}'`);
  } finally {
    cleanup(tag, sources);
  }
});

test("share-alike silver cannot reach gold by a reviewer or a batch until founder question 4", { skip }, async () => {
  const tag = randomUUID().slice(0, 8);
  const sw = `evo-imp-${tag}-sa`;
  assert.equal(sql(`insert into graph.nodes (slug, title, kind, branch, visibility, provenance) values ('${sw}', 'Python', 'software', '04-information', 'public', '{"type": "wikidata", "level": "language"}')`).status, 0);
  const client = svc();
  const sources: string[] = [];
  const reviewer = randomUUID();
  try {
    assert.equal(sql(`insert into auth.users (id, email) values ('${reviewer}', 'evo-sa-${tag}@test.example')`).status, 0);
    const rows: FixtureRow[] = [{ id: "sa", subject: { kind: "node", slug: sw, nodeKind: "software" }, role: "adopted", year: 2008 }];
    const so: EvolutionSource = { repoPath: `_intake/evolution/so-survey/fixture-${tag}/rows.jsonl`, rule: "so-survey-odbl", prior: 0.9 };
    const graph = await readGraph(client);
    const p = planEvolution({ sources: [so], files: new Map([[so.repoPath, Buffer.from(fixtureText(rows, tag))]]), policy, nodes: graph.nodes, edges: graph.edges, records: fixtureRecords(rows) });
    sources.push(...p.bronze.map((b) => b.sourceId));
    assert.equal(p.silver[0].proposal.internal, true);
    assert.deepEqual(p.promotions, []);
    const r = await applyEvolution(client, p, policyMeta);
    assert.equal(r.written.silver, 1);
    const silver = sql(`select id from graph.silver_items where source_id = '${p.bronze[0].sourceId}'`).out;

    const { data, error } = await client.rpc("promote_evolution_factoid", { p_silver: silver, p_reviewer: reviewer, p_preferred: true });
    assert.equal(data, null);
    assert.equal(error?.code, "23514");
    assert.match(error?.message ?? "", /share-alike/);

    const review = sql(`insert into graph.evolution_batch_reviews (source_id, source_revision, parser, role, sample_size, status, reviewer_id, decided_at)
      values ('${p.bronze[0].sourceId}', '${p.bronze[0].sourceRevision}', 'evolution-import', 'adopted', 200, 'approved', '${reviewer}', now()) returning id`).out.split("\n")[0];
    const { error: batchErr } = await client.rpc("promote_evolution_batch", { p_review: review });
    assert.equal(batchErr?.code, "23514");
    const gated = await approveAndRunBatch(client, { reviewId: review, reviewerId: reviewer, errors: 0, env: { EVOLUTION_BATCH_PROMOTION: "on" } });
    assert.equal(gated.ok, false);

    const backfill = sql(`insert into graph.gold_lineage (node_id, silver_item_id, promoted_by) select id, '${silver}', 'backfill' from graph.nodes where slug = '${sw}'`);
    assert.notEqual(backfill.status, 0);
    assert.match(backfill.out, /share-alike/);
    assert.equal(sql(`select count(*) from graph.factoids where silver_item_id = '${silver}'`).out, "0");
    assert.equal(sql(`select count(*) from graph.gold_lineage where silver_item_id = '${silver}'`).out, "0");
  } finally {
    sql(`delete from auth.users where id = '${reviewer}'`);
    cleanup(tag, sources);
  }
});
