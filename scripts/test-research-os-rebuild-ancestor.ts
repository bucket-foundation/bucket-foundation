/**
 * Unit tests: src/lib/research-os/rebuild-ancestor.ts's
 * `rebuildPrereqAncestorForBranch` (bkt-ros ros-13, factored out of
 * scripts/rebuild-prereq-ancestor.ts so the /research-os/edges review
 * route's approve action can call it in-process, task item 4). No network:
 * a tiny fluent fake stands in for the Supabase client, covering only the
 * four calls this function makes (`nodes.select.eq`,
 * `edges.select.in.eq`, `prereq_ancestor.delete.in`,
 * `prereq_ancestor.insert`), matching this repo's existing offline,
 * stub-backed research-os test convention.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-rebuild-ancestor.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { rebuildPrereqAncestorForBranch } from "../src/lib/research-os/rebuild-ancestor";

interface FakeNodeRow {
  id: string;
  slug: string;
  branch: string;
}
interface FakeEdgeRow {
  from_id: string;
  to_id: string;
  kind: string;
  confidence: number | null;
}

/** A minimal fluent fake matching only the chain shapes
 * rebuildPrereqAncestorForBranch calls; anything else throws so a
 * future change to that function's own query shape fails this test loudly
 * rather than silently returning undefined. */
function fakeSupabase(nodes: FakeNodeRow[], edges: FakeEdgeRow[], calls: { inserted?: unknown[]; deletedNodeIds?: string[] }) {
  return {
    from(table: string) {
      if (table === "nodes") {
        return {
          select: () => ({
            eq: (_col: string, branch: string) => ({ data: nodes.filter((n) => n.branch === branch), error: null }),
          }),
        };
      }
      if (table === "edges") {
        return {
          select: () => ({
            in: (_col: string, ids: string[]) => ({
              eq: (_col2: string, kind: string) => ({
                data: edges.filter((e) => ids.includes(e.from_id) && e.kind === kind),
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "prereq_ancestor") {
        return {
          delete: () => ({
            in: (_col: string, ids: string[]) => {
              calls.deletedNodeIds = ids;
              return { error: null };
            },
          }),
          insert: (rows: unknown[]) => {
            calls.inserted = rows;
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table in test fake: ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

test("rebuildPrereqAncestorForBranch: no nodes for the branch is a no-op, zero counts", async () => {
  const calls: { inserted?: unknown[]; deletedNodeIds?: string[] } = {};
  const svc = fakeSupabase([], [], calls);
  const result = await rebuildPrereqAncestorForBranch(svc, "02-physics");
  assert.deepEqual(result, { branch: "02-physics", nodeCount: 0, edgeCount: 0, closureRowCount: 0 });
  assert.equal(calls.deletedNodeIds, undefined, "no delete when there are no nodes to rebuild");
});

test("rebuildPrereqAncestorForBranch: a linear chain rebuilds its full closure and deletes-then-reinserts", async () => {
  const nodes: FakeNodeRow[] = [
    { id: "n-a", slug: "a", branch: "02-physics" },
    { id: "n-b", slug: "b", branch: "02-physics" },
    { id: "n-c", slug: "c", branch: "02-physics" },
  ];
  const edges: FakeEdgeRow[] = [
    { from_id: "n-a", to_id: "n-b", kind: "prerequisite", confidence: 1.0 },
    { from_id: "n-b", to_id: "n-c", kind: "prerequisite", confidence: 0.5 },
  ];
  const calls: { inserted?: unknown[]; deletedNodeIds?: string[] } = {};
  const svc = fakeSupabase(nodes, edges, calls);

  const result = await rebuildPrereqAncestorForBranch(svc, "02-physics");

  assert.equal(result.nodeCount, 3);
  assert.equal(result.edgeCount, 2);
  // c's ancestors: b (hop 1) and a (hop 2); b's ancestors: a (hop 1). 3 closure rows total.
  assert.equal(result.closureRowCount, 3);
  assert.deepEqual(new Set(calls.deletedNodeIds), new Set(["n-a", "n-b", "n-c"]), "deletes every branch node's own prior rows first");
  assert.equal(calls.inserted?.length, 3);
  const byNode = new Map((calls.inserted as Array<{ node_id: string; ancestor_id: string; min_hops: number; min_confidence: number }>).map((r) => [`${r.node_id}:${r.ancestor_id}`, r]));
  assert.equal(byNode.get("n-c:n-a")?.min_hops, 2);
  assert.equal(byNode.get("n-c:n-a")?.min_confidence, 0.5, "the minimum single-edge confidence along the path, not the product");
});

test("rebuildPrereqAncestorForBranch: a branch with nodes but no prerequisite edges rebuilds an empty closure without inserting", async () => {
  const nodes: FakeNodeRow[] = [{ id: "n-a", slug: "a", branch: "02-physics" }];
  const calls: { inserted?: unknown[]; deletedNodeIds?: string[] } = {};
  const svc = fakeSupabase(nodes, [], calls);

  const result = await rebuildPrereqAncestorForBranch(svc, "02-physics");

  assert.equal(result.closureRowCount, 0);
  assert.equal(calls.inserted, undefined, "no insert call at all when the closure is empty");
  assert.deepEqual(calls.deletedNodeIds, ["n-a"], "the delete still runs, clearing any now-stale prior rows");
});
