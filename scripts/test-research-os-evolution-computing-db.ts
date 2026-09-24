import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv, sql } from "./lib/test-harness";
import { parsePolicy } from "../src/lib/research-os/evidence/rights";
import { planEvolution, silverKeyOf, type EvolutionSource } from "../src/lib/evolution/importer";
import { softwareLineage, softwareRecords, softwareReleaseSeries } from "../src/lib/evolution/wikidata-software";
import { applyEvolution, readGraph, silverIds } from "./research-os/evolution/lib/apply";

loadLocalEnv();

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
const probe = sql("select to_regprocedure('graph.promote_evolution_edge(uuid, uuid)') is not null");
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ready = probe.status === 0 && probe.out === "t" && Boolean(url && key);
if (REQUIRED && !ready) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no local stack with the evolution edge migration: ${probe.out}`);
const skip = ready ? false : "no local stack with the evolution edge migration";

const raw = fs.readFileSync(path.join(__dirname, "..", "learning", "research-os", "ai", "rights-policy.json"));
const policy = parsePolicy(JSON.parse(raw.toString("utf8")));
const policyMeta = { sha256: createHash("sha256").update(raw).digest("hex"), status: policy.status };

test("Wikidata software reaches silver, series and reviewed lineage edges, and a lineage cycle is refused", { skip }, async () => {
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
  const n = String(Date.now()).slice(-7) + String(Math.floor(Math.random() * 90) + 10);
  const qa = `Q9${n}1`;
  const qb = `Q9${n}2`;
  const slugA = `software-wikidata-${qa.toLowerCase()}`;
  const slugB = `software-wikidata-${qb.toLowerCase()}`;
  const repoPath = `_intake/evolution/wikidata/fixture-${n}/software.jsonl`;
  const reviewer = randomUUID();
  let sourceId = "";
  try {
    assert.equal(sql(`insert into auth.users (id, email) values ('${reviewer}', 'evo-comp-${n}@test.example')`).status, 0);
    assert.equal(sql(`insert into graph.nodes (slug, title, kind, branch, visibility, provenance) values ('${slugB}', 'B', 'software', '04-information', 'public', '{"type": "wikidata_software", "level": "os"}')`).status, 0);
    const rows = [
      { id: qa, label: "A", class: "os", inception: "1991-09-17", based_on: [qb] },
      { id: qb, label: "B", class: "os", inception: "1987-01-01", based_on: [qa], versions: [{ v: "1", date: "1987-01-01" }, { v: "2", date: "1987-06-01" }] },
    ];
    const text = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
    const source: EvolutionSource = { repoPath, rule: "wikidata-evolution-cc0", prior: 0.8 };
    const build = async () => {
      const g = await readGraph(svc);
      return planEvolution({ sources: [source], files: new Map([[repoPath, Buffer.from(text)]]), policy, nodes: g.nodes, edges: g.edges, records: softwareRecords, edgeCandidates: softwareLineage, series: softwareReleaseSeries });
    };
    const p1 = await build();
    sourceId = p1.bronze[0].sourceId;
    assert.equal(p1.edgeCandidates.filter((e) => e.proposal.cycle).length, 2);
    const r1 = await applyEvolution(svc, p1, policyMeta);
    assert.equal(r1.written.silver, 2);
    assert.equal(r1.written.edgeCandidates, 2);
    assert.equal(r1.written.series, 1);
    assert.equal(r1.written.proposals, 1);
    assert.equal(r1.written.factoids, 0);
    assert.equal(sql(`select value || ' ' || unit || ' ' || year from graph.evolution_series where source_id = '${sourceId}'`).out, "2 releases 1987");

    const r2 = await applyEvolution(svc, await build(), policyMeta);
    assert.deepEqual(r2.written, { silver: 0, edgeCandidates: 0, series: 0, proposals: 0, factoids: 0, preferred: 0 });

    const promote = async (silver: string) => {
      const { data, error } = await svc.rpc("promote_evolution_edge", { p_silver: silver, p_reviewer: reviewer });
      if (error) throw new Error(`promote_evolution_edge failed: ${error.message}`);
      return data as { ok: boolean; error?: string; edge?: string };
    };
    const ids = await silverIds(svc, p1.edgeCandidates);
    const ab = ids.get(silverKeyOf(p1.edgeCandidates.find((e) => e.proposal.from_slug === slugA)!))!;
    const ba = ids.get(silverKeyOf(p1.edgeCandidates.find((e) => e.proposal.from_slug === slugB)!))!;

    assert.equal((await promote(ab)).error, "endpoint_not_found");

    assert.equal(sql(`insert into graph.nodes (slug, title, kind, branch, visibility, provenance) values ('${slugA}', 'A', 'software', '04-information', 'public', '{"type": "wikidata_software", "level": "os"}')`).status, 0);
    const first = await promote(ab);
    assert.equal(first.ok, true, JSON.stringify(first));
    assert.equal((await promote(ab)).edge, first.edge);
    assert.equal(sql(`select count(*) from graph.gold_lineage where silver_item_id = '${ab}'`).out, "1");

    assert.equal((await promote(ba)).error, "lineage_cycle");
    assert.equal(sql(`select count(*) from graph.edges e join graph.nodes a on a.id = e.from_id where a.slug = '${slugB}' and e.kind = 'descends_from'`).out, "0");

    const noReviewer = await svc.rpc("promote_evolution_edge", { p_silver: ab, p_reviewer: null });
    assert.equal(noReviewer.error?.code, "22023");
    const factoidSilver = (await silverIds(svc, p1.silver)).get(silverKeyOf(p1.silver[0]))!;
    assert.equal((await promote(factoidSilver)).error, "not_an_edge_candidate");

    for (const role of ["anon", "authenticated"]) {
      const run = sql(`begin; grant usage on schema graph to ${role}; set local role ${role}; select graph.promote_evolution_edge('${ab}', '${reviewer}'); rollback;`);
      assert.notEqual(run.status, 0);
      assert.match(run.out, /permission denied/);
    }
  } finally {
    const out = sql(`
      delete from graph.gold_lineage where silver_item_id in (select id from graph.silver_items where source_id = '${sourceId}');
      delete from graph.edges where from_id in (select id from graph.nodes where slug in ('${slugA}', '${slugB}')) or to_id in (select id from graph.nodes where slug in ('${slugA}', '${slugB}'));
      delete from graph.node_proposals where key in ('medallion:${slugA}', 'medallion:${slugB}');
      delete from graph.evolution_series where source_id = '${sourceId}';
      delete from graph.nodes where slug in ('${slugA}', '${slugB}');
      delete from graph.evidence_source_admissions where source_id = '${sourceId}';
      delete from graph.bronze_file_paths where repo_path = '${repoPath}';
      delete from auth.users where id = '${reviewer}';`);
    assert.equal(out.status, 0, out.out);
  }
});
