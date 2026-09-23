import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decideMerge, listMergeProposals } from "../src/lib/research-os/inference/merge-actions";

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

function fake(db: Db, opts: { mergeFails?: boolean; calls?: string[] } = {}) {
  const calls = opts.calls ?? [];
  const from = (table: string) => {
    const filters: ((r: Row) => boolean)[] = [];
    let patch: Row | null = null;
    let countHead = false;
    const rows = () => (db[table] ?? []).filter((r) => filters.every((f) => f(r)));
    const q: any = {
      select: (_cols?: string, o?: { count?: string; head?: boolean }) => {
        if (o?.head) countHead = true;
        return q;
      },
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
      in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
      order: () => q,
      range: () => q,
      update: (p: Row) => ((patch = p), q),
      maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) => {
        if (patch) {
          const hit = rows();
          for (const r of hit) Object.assign(r, patch);
          calls.push(`update:${table}`);
          return resolve({ data: hit.map((r) => ({ id: r.id })), error: null });
        }
        if (countHead) return resolve({ count: rows().length, error: null });
        return resolve({ data: rows(), error: null });
      },
    };
    return q;
  };
  return {
    from,
    rpc: (fn: string, args: Row) => {
      calls.push(`rpc:${fn}`);
      if (fn === "merge_nodes") {
        if (opts.mergeFails) return Promise.resolve({ data: null, error: { message: "boom" } });
        const drop = db.nodes.find((n) => n.id === args.p_drop)!;
        drop.superseded_by = args.p_keep;
        return Promise.resolve({ data: { moved_out: 1, moved_in: 2, dropped: 0, tiers_raised: 4 }, error: null });
      }
      if (fn === "replace_prereq_ancestor") return Promise.resolve({ data: 0, error: null });
      return Promise.resolve({ data: null, error: { message: `unexpected rpc ${fn}` } });
    },
  } as unknown as SupabaseClient;
}

function seed(): Db {
  return {
    merge_proposals: [
      { id: "m1", keep_slug: "phys-ep", drop_slug: "cos-ep", reason: "same_title", similarity: 1, evidence: "Both titled Equivalence principle.", status: "pending", created_at: "2026-09-21T00:00:00Z" },
    ],
    nodes: [
      { id: "n-phys", slug: "phys-ep", title: "Equivalence principle", branch: "02-physics", kind: "concept", tier: 13, superseded_by: null },
      { id: "n-cos", slug: "cos-ep", title: "Equivalence principle", branch: "06-cosmology", kind: "concept", tier: 13, superseded_by: null },
    ],
    edges: [
      { id: "e1", from_id: "n-phys", to_id: "x" },
      { id: "e2", from_id: "y", to_id: "n-cos" },
    ],
    prereq_ancestor: [],
  };
}

test("lists a pending pair with both nodes and their edge counts", async () => {
  const r = await listMergeProposals(fake(seed()));
  assert.equal(r.status, 200);
  const p = (r.body.proposals as { keep: { slug: string; edges: number }; drop: { slug: string; edges: number } }[])[0];
  assert.deepEqual([p.keep.slug, p.keep.edges, p.drop.slug, p.drop.edges], ["phys-ep", 1, "cos-ep", 1]);
});

test("a pair whose node is already superseded drops out of the list", async () => {
  const db = seed();
  db.nodes[1].superseded_by = "n-phys";
  const r = await listMergeProposals(fake(db));
  assert.equal((r.body.proposals as unknown[]).length, 0);
});

test("merge supersedes the queued drop node and rebuilds both branches", async () => {
  const db = seed();
  const calls: string[] = [];
  const r = await decideMerge(fake(db, { calls }), { id: "m1", decision: "merge", reason: null, reviewerId: "rev" });
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.keep, r.body.drop], ["phys-ep", "cos-ep"]);
  assert.equal(db.nodes[1].superseded_by, "n-phys");
  assert.equal(db.merge_proposals[0].status, "merged");
  assert.equal((r.body.moved as { tiers_raised: number }).tiers_raised, 4);
  assert.ok(calls.includes("rpc:merge_nodes"));
});

test("merge_swapped keeps the other node", async () => {
  const db = seed();
  const r = await decideMerge(fake(db), { id: "m1", decision: "merge_swapped", reason: null, reviewerId: "rev" });
  assert.deepEqual([r.body.keep, r.body.drop], ["cos-ep", "phys-ep"]);
  assert.equal(db.nodes[0].superseded_by, "n-cos");
});

test("keep both rejects the pair and merges nothing", async () => {
  const db = seed();
  const calls: string[] = [];
  const r = await decideMerge(fake(db, { calls }), { id: "m1", decision: "reject", reason: "different scopes", reviewerId: "rev" });
  assert.equal(r.body.decision, "rejected");
  assert.equal(db.merge_proposals[0].status, "rejected");
  assert.ok(!calls.includes("rpc:merge_nodes"));
});

test("a decided pair answers alreadyDecided", async () => {
  const db = seed();
  db.merge_proposals[0].status = "merged";
  const r = await decideMerge(fake(db), { id: "m1", decision: "merge", reason: null, reviewerId: "rev" });
  assert.equal(r.body.alreadyDecided, true);
});

test("a node gone since queueing returns 409 and releases the claim", async () => {
  const db = seed();
  db.nodes[1].superseded_by = "someone";
  const r = await decideMerge(fake(db), { id: "m1", decision: "merge", reason: null, reviewerId: "rev" });
  assert.equal(r.status, 409);
  assert.equal(db.merge_proposals[0].status, "pending");
});

test("a failed merge releases the claim so the pair stays pending", async () => {
  const db = seed();
  const r = await decideMerge(fake(db, { mergeFails: true }), { id: "m1", decision: "merge", reason: null, reviewerId: "rev" });
  assert.equal(r.status, 500);
  assert.equal(r.body.error, "merge_failed");
  assert.equal(db.merge_proposals[0].status, "pending");
  assert.equal(db.nodes[1].superseded_by, null);
});

test("an unknown id is 404", async () => {
  const r = await decideMerge(fake(seed()), { id: "nope", decision: "merge", reason: null, reviewerId: "rev" });
  assert.equal(r.status, 404);
});
