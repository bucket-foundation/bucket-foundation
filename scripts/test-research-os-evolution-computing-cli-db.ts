import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv, sql } from "./lib/test-harness";
import { runComputingImport } from "./research-os/evolution/computing-import";

loadLocalEnv();

const REQUIRED = process.env.RESEARCH_OS_REQUIRE_DB === "1";
const probe = sql("select to_regclass('graph.evolution_series') is not null");
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ready = probe.status === 0 && probe.out === "t" && Boolean(url && key);
if (REQUIRED && !ready) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no local stack with the evolution tables: ${probe.out}`);
const skip = ready ? false : "no local stack with the evolution tables";

test("the computing import writes silver once on --apply, nothing on a dry run, and promotes nothing", { skip }, async () => {
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
  const n = String(Date.now()).slice(-7) + String(Math.floor(Math.random() * 90) + 10);
  const qid = `Q8${n}1`;
  const slug = `software-wikidata-${qid.toLowerCase()}`;
  const file = `cli-${n}.jsonl`;
  const repoPath = `_intake/evolution/wikidata/software/${file}`;
  const text = JSON.stringify({ id: qid, label: "Fixture OS", class: "os", inception: "1991-09-17", versions: [{ v: "1", date: "1991-09-17" }] }) + "\n";
  const data = mkdtempSync(path.join(tmpdir(), "evo-cli-db-"));
  mkdirSync(path.join(data, "wikidata", "software"), { recursive: true });
  mkdirSync(path.join(data, "live", "runs"), { recursive: true });
  writeFileSync(path.join(data, "wikidata", "software", file), text);
  writeFileSync(
    path.join(data, "live", "runs", "2026-09-24T041700Z.json"),
    JSON.stringify({ started: "2026-09-24T04:17:00+00:00", feeds: { wikidata: { changed: [{ path: repoPath, sha256: createHash("sha256").update(text).digest("hex"), bytes: text.length }] } }, imported: { status: "running" } }),
  );
  const silverFor = () => sql(`select count(*) from graph.silver_items s join graph.bronze_file_paths b on b.source_id = s.source_id where b.repo_path = '${repoPath}'`).out;
  try {
    const dry = await runComputingImport(svc, { apply: false, paths: [repoPath], data });
    assert.ok(!("mismatches" in dry));
    if ("mismatches" in dry) return;
    assert.equal(dry.plans.wikidata?.silver, 1);
    assert.equal(dry.plans.wikidata?.promotions, 0);
    assert.deepEqual(dry.applied, {});
    assert.equal(sql(`select count(*) from graph.bronze_file_paths where repo_path = '${repoPath}'`).out, "0");

    const first = await runComputingImport(svc, { apply: true, paths: [repoPath], data });
    assert.ok(!("mismatches" in first));
    if ("mismatches" in first) return;
    assert.equal(first.applied.wikidata?.written.silver, 1);
    assert.equal(first.applied.wikidata?.written.factoids, 0);
    assert.equal(silverFor(), "1");

    const again = await runComputingImport(svc, { apply: true, paths: [repoPath], data });
    assert.ok(!("mismatches" in again));
    if ("mismatches" in again) return;
    assert.equal(again.applied.wikidata?.written.silver, 0);
    assert.equal(again.applied.wikidata?.written.proposals, 0);
    assert.equal(silverFor(), "1");
    assert.equal(sql(`select count(*) from graph.nodes where slug = '${slug}'`).out, "0");

    writeFileSync(path.join(data, "wikidata", "software", file), text.replace("Fixture OS", "Changed OS"));
    const drift = await runComputingImport(svc, { apply: true, paths: [repoPath], data });
    assert.deepEqual(drift, { mismatches: [{ repoPath, reason: "sha256" }] });
  } finally {
    rmSync(data, { recursive: true, force: true });
    const out = sql(`
      create temp table t_src as select source_id from graph.bronze_file_paths where repo_path = '${repoPath}';
      delete from graph.gold_lineage where silver_item_id in (select id from graph.silver_items where source_id in (select source_id from t_src));
      delete from graph.node_proposals where key = 'medallion:${slug}';
      delete from graph.evolution_series where source_id in (select source_id from t_src);
      delete from graph.silver_items where source_id in (select source_id from t_src);
      delete from graph.evidence_source_admissions where source_id in (select source_id from t_src);
      delete from graph.bronze_file_paths where repo_path = '${repoPath}';`);
    assert.equal(out.status, 0, out.out);
  }
});
