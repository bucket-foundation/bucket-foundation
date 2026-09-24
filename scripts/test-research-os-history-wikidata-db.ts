import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv, sql } from "./lib/test-harness";
import { decideHistory, listHistoryReview } from "../src/lib/history/review";

loadLocalEnv();

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const probe = sql("select to_regprocedure('graph.decide_external_id(uuid, uuid, text, text)') is not null");
const ready = probe.status === 0 && probe.out === "t";
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no local stack carries the history wikidata migration: ${probe.out}`);
}
const skip = ready ? false : "no local stack with the history wikidata migration";
const staged = ready ? sql("select count(*) from graph.external_id_proposals where status = 'pending' and reason = 'one_candidate'").out : "0";
const withApi = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

test("identity links, their reviewer, and the withdrawal cascade in real Postgres", { skip }, () => {
  const file = path.join(__dirname, "..", "supabase", "tests", "research_os_history_wikidata.sql");
  const run = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("a staged Wikidata date waits for its identity link, then promotes with the reviewer", { skip: skip || (!withApi ? "no Supabase URL and service key" : Number(staged) === 0 ? "no staged Wikidata import; run wikidata-import.ts --apply" : false) }, async (t) => {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
  const queue = await listHistoryReview(svc);
  assert.ok(queue.ok);
  if (!queue.ok) return;
  const link = queue.value.identities.find((l) => l.reason === "one_candidate" && queue.value.pending.some((f) => f.qid === l.candidates[0].qid && f.subject === l.subject))!;
  assert.ok(link, "a one-candidate identity with a staged date is listed");
  assert.ok(link.candidates[0].url.startsWith("https://www.wikidata.org/wiki/Q"));
  const qid = link.candidates[0].qid;
  const factoid = queue.value.pending.find((f) => f.qid === qid && f.subject === link.subject)!;
  assert.equal(factoid.linked, false);
  const reviewer = randomUUID();
  assert.equal(sql(`insert into auth.users (id, email) values ('${reviewer}', 'wikidata-review-${reviewer}@test.example')`).status, 0);
  t.after(() => {
    sql(`delete from graph.factoids where silver_item_id = '${factoid.silverId}'`);
    sql(`delete from graph.gold_lineage where silver_item_id = '${factoid.silverId}'`);
    sql(`update graph.silver_items set status = 'candidate' where id = '${factoid.silverId}'`);
    sql(`delete from graph.node_external_ids where authority = 'wikidata' and external_id = '${qid}'`);
    sql(`update graph.external_id_proposals set status = 'pending', chosen_id = null, reviewer_id = null, decision_reason = null, decided_at = null where id = '${link.id}'`);
    sql(`delete from auth.users where id = '${reviewer}'`);
  });

  assert.deepEqual(await decideHistory(svc, reviewer, { action: "approve", silverId: factoid.silverId }), { ok: false, status: 409, error: "identity_not_linked" });
  const linked = await decideHistory(svc, reviewer, { action: "link", proposalId: link.id, qid });
  assert.deepEqual(linked, { ok: true, value: { decision: "approved", changed: true } });
  const approved = await decideHistory(svc, reviewer, { action: "approve", silverId: factoid.silverId });
  assert.ok(approved.ok, JSON.stringify(approved));
  assert.equal(sql(`select count(*) from graph.gold_lineage where silver_item_id = '${factoid.silverId}' and reviewer_id = '${reviewer}'`).out !== "0", true);
});
