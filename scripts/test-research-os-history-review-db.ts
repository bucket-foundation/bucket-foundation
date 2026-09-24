import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv, sql } from "./lib/test-harness";
import { runImport } from "./research-os/history/import";
import { decideHistory, listHistoryReview } from "../src/lib/history/review";
import { decideNode } from "../src/lib/research-os/inference/review-actions";

loadLocalEnv();

const probe = sql("select to_regprocedure('graph.reject_history_silver(uuid, uuid, text)') is not null and to_regprocedure('graph.prefer_history_factoid(uuid, text, uuid, text)') is not null");
const ready = probe.status === 0 && probe.out === "t" && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and no local stack carries the history review migration: ${probe.out}`);
}
const skip = ready ? false : "no local stack with the history review migration, a Supabase URL and a service key";

function svc(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
}

test("a reviewer creates a proposed subject, approves its factoid, and rejects another with a reason", { skip }, async (t) => {
  const db = svc();
  await runImport(db, true);
  const reviewer = randomUUID();
  assert.equal(sql(`insert into auth.users (id, email) values ('${reviewer}', 'history-review-${reviewer}@test.example')`).status, 0);

  const before = await listHistoryReview(db);
  assert.ok(before.ok);
  if (!before.ok) return;
  const proposal = before.value.proposals.find((p) => p.slug.startsWith("event-wikidata-q") && p.silverIds.length === 1)!;
  assert.ok(proposal, "a sacred event proposal is listed with its factoid");
  const silverId = proposal.silverIds[0];
  const other = before.value.pending.find((f) => f.subject.startsWith("event-wikidata-q") && f.silverId !== silverId)!;
  assert.ok(other.rule === "wikidata-cc0");

  t.after(() => {
    sql(`delete from graph.factoids where silver_item_id = '${silverId}'`);
    sql(`delete from graph.gold_lineage where silver_item_id = '${silverId}'`);
    sql(`delete from graph.nodes where slug = '${proposal.slug}'`);
    sql(`update graph.silver_items set status = 'candidate', reviewed_by = null, reviewed_at = null, review_reason = null where id in ('${silverId}', '${other.silverId}')`);
    sql(`update graph.node_proposals set status = 'pending', reviewer_id = null, decision_reason = null, decided_at = null, created_node_id = null where id = '${proposal.id}'`);
    sql(`delete from auth.users where id = '${reviewer}'`);
  });

  const early = await decideHistory(db, reviewer, { action: "approve", silverId });
  assert.deepEqual(early, { ok: false, status: 409, error: "subject_node_missing" });

  const node = await decideNode(db, { id: proposal.id, decision: "approved", reason: null, reviewerId: reviewer });
  assert.equal(node.status, 200, JSON.stringify(node.body));

  const approved = await decideHistory(db, reviewer, { action: "approve", silverId });
  assert.ok(approved.ok, JSON.stringify(approved));
  if (!approved.ok) return;
  assert.deepEqual(approved.value.preferred, ["occurred"]);
  const lineage = sql(`select count(*) from graph.gold_lineage where silver_item_id = '${silverId}' and factoid_id is not null and reviewer_id = '${reviewer}' and promoted_by = 'reviewer'`);
  assert.equal(lineage.out, "1");
  const again = await decideHistory(db, reviewer, { action: "approve", silverId });
  assert.ok(again.ok && again.value.inserted === 0 && (again.value.preferred as string[]).length === 0);

  const prefer = await decideHistory(db, reviewer, { action: "prefer", silverId, role: "occurred" });
  assert.deepEqual(prefer, { ok: true, value: { decision: "preferred", changed: false } });
  const bare = await db.rpc("prefer_history_factoid", { p_silver: silverId, p_role: "occurred", p_reviewer: null });
  assert.equal(bare.error?.code, "22023", "a prefer with no reviewer and no importer marker is refused");
  const borrowed = await db.rpc("prefer_history_factoid", { p_silver: silverId, p_role: "occurred", p_reviewer: null, p_importer: "history-import" });
  assert.equal(borrowed.error?.code, "23514", "the importer marker cannot prefer a reviewer-promoted factoid");
  assert.equal(sql(`update graph.factoids set preferred = false where silver_item_id = '${silverId}'`).status, 0);
  const recorded = await decideHistory(db, reviewer, { action: "prefer", silverId, role: "occurred" });
  assert.deepEqual(recorded, { ok: true, value: { decision: "preferred", changed: true } });
  assert.equal(sql(`select preferred || ' ' || preferred_by || ' ' || preferred_via from graph.factoids where silver_item_id = '${silverId}'`).out, `true ${reviewer} reviewer`);
  const missingRole = await decideHistory(db, reviewer, { action: "prefer", silverId, role: "born" });
  assert.deepEqual(missingRole, { ok: false, status: 404, error: "factoid_not_found" });

  const rejected = await decideHistory(db, reviewer, { action: "reject", silverId: other.silverId, reason: "a legendary date with no second source" });
  assert.deepEqual(rejected, { ok: true, value: { decision: "rejected", changed: true } });
  assert.equal(sql(`select status || ' ' || review_reason from graph.silver_items where id = '${other.silverId}'`).out, "rejected a legendary date with no second source");
  const rejectApproved = await decideHistory(db, reviewer, { action: "reject", silverId, reason: "late" });
  assert.equal(rejectApproved.ok, false);

  const after = await listHistoryReview(db);
  assert.ok(after.ok);
  if (!after.ok) return;
  assert.ok(!after.value.pending.some((f) => f.silverId === silverId || f.silverId === other.silverId));
  assert.ok(!after.value.proposals.some((p) => p.id === proposal.id));
});

test("the review list carries each conflict with both sides and their sources", { skip }, async () => {
  const r = await listHistoryReview(svc());
  assert.ok(r.ok);
  if (!r.ok) return;
  const count = Number(sql("select count(*) from graph.factoid_conflicts").out);
  assert.equal(r.value.conflicts.length, count);
  for (const c of r.value.conflicts) {
    assert.ok(c.a.source && c.b.source && c.a.silverId !== c.b.silverId);
    assert.ok(c.disjointSpans || c.differentPlaces);
  }
});
