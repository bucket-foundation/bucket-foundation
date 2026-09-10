/**
 * Unit tests: src/lib/research-os/closure.ts's ancestor closure, and
 * equivalence between computeFrontier's full-graph walk and its
 * closure-pruned walk (bkt-ros, Phase 1 item 1: "equivalence tests on the
 * seed graph").
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-closure.ts
 * (same invocation as scripts/test-research-os-routing.ts; no test
 * framework configured in this repo, node:test + node:assert is the
 * existing pattern.)
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ancestorsOf, computeAncestorClosure, type PrereqAncestorRow } from "../src/lib/research-os/closure";
import { computeFrontier } from "../src/lib/research-os/frontier";
import type { GraphNode, GraphEdge, LearnerNodeState, Stage } from "../src/lib/research-os/types";

const SEED_PATH = join(__dirname, "..", "supabase", "seed", "research-os-sky-blue.json");

interface SeedNode {
  slug: string;
  title: string;
  kind: GraphNode["kind"];
  tier: number;
  branch: string;
  summary: string;
}
interface SeedEdge {
  from: string;
  to: string;
  kind: GraphEdge["kind"];
}
interface Seed {
  target_slug: string;
  nodes: SeedNode[];
  edges: SeedEdge[];
}

function loadSeed(): Seed {
  return JSON.parse(readFileSync(SEED_PATH, "utf8")) as Seed;
}

/** Same slug-doubles-as-id fixture conversion as test-research-os-routing.ts. */
function toGraph(seed: Seed): { nodes: GraphNode[]; edges: GraphEdge[]; bySlug: Map<string, GraphNode> } {
  const nodes: GraphNode[] = seed.nodes.map((n) => ({
    id: n.slug,
    slug: n.slug,
    title: n.title,
    kind: n.kind,
    tier: n.tier,
    branch: n.branch,
    summary: n.summary,
  }));
  const edges: GraphEdge[] = seed.edges.map((e) => ({ fromId: e.from, toId: e.to, kind: e.kind }));
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  return { nodes, edges, bySlug };
}

function state(nodeId: string, stage: Stage): LearnerNodeState {
  return { nodeId, stage };
}

// ---------------------------------------------------------------------------
// closure.ts: ancestorsOf / computeAncestorClosure
// ---------------------------------------------------------------------------

test("ancestorsOf: the target's own direct prerequisites are hop 1, and it never includes the target itself", () => {
  const { edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  const ancestors = ancestorsOf(target.id, edges);

  assert.ok(!ancestors.has(target.id), "target must not be its own ancestor");
  const directPrereqs = edges.filter((e) => e.kind === "prerequisite" && e.toId === target.id).map((e) => e.fromId);
  for (const p of directPrereqs) {
    assert.equal(ancestors.get(p)?.hops, 1, `direct prerequisite ${p} should be at hop 1`);
  }
  // Every node reachable backward should have a strictly positive hop count
  // and a confidence in (0, 1] (every seed edge defaults to full confidence).
  ancestors.forEach((info) => {
    assert.ok(info.hops >= 1);
    assert.ok(info.minConfidence > 0 && info.minConfidence <= 1);
  });
});

test("ancestorsOf: a root node (no prerequisites) has an empty ancestor set", () => {
  const { edges } = toGraph(loadSeed());
  const ancestors = ancestorsOf("light-travels-in-straight-lines", edges);
  assert.equal(ancestors.size, 0);
});

test("ancestorsOf: takes the MINIMUM hop count when a node is reachable by more than one path", () => {
  const { nodes, edges } = toGraph(loadSeed());
  const target = nodes.find((n) => n.slug === "why-the-sky-is-blue")!;
  const ancestors = ancestorsOf(target.id, edges);
  // Sanity: recompute with a brute-force BFS restricted to prerequisite
  // edges and compare every hop count exactly.
  const backward = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind !== "prerequisite") continue;
    if (!backward.has(e.toId)) backward.set(e.toId, []);
    backward.get(e.toId)!.push(e.fromId);
  }
  const expected = new Map<string, number>();
  const seen = new Set([target.id]);
  let frontier = [target.id];
  let hop = 0;
  while (frontier.length) {
    hop += 1;
    const next: string[] = [];
    for (const cur of frontier) {
      for (const prev of backward.get(cur) ?? []) {
        if (seen.has(prev)) continue;
        seen.add(prev);
        expected.set(prev, hop);
        next.push(prev);
      }
    }
    frontier = next;
  }
  const gotHops = new Map(Array.from(ancestors.entries(), ([id, info]) => [id, info.hops] as const).sort());
  assert.deepEqual(gotHops, new Map(Array.from(expected.entries()).sort()));
});

test("computeAncestorClosure: produces a row for every (node, ancestor) pair ancestorsOf reports, for every node in the branch", () => {
  const { nodes, edges } = toGraph(loadSeed());
  const rows = computeAncestorClosure(nodes, edges);
  const bySlugId = new Map(nodes.map((n) => [n.id, n]));

  const byNode = new Map<string, PrereqAncestorRow[]>();
  for (const r of rows) {
    if (!byNode.has(r.nodeId)) byNode.set(r.nodeId, []);
    byNode.get(r.nodeId)!.push(r);
  }

  for (const n of nodes) {
    const expected = ancestorsOf(n.id, edges);
    const got = byNode.get(n.id) ?? [];
    assert.equal(got.length, expected.size, `row count mismatch for ${bySlugId.get(n.id)?.slug}`);
    for (const row of got) {
      const info = expected.get(row.ancestorId);
      assert.equal(row.minHops, info?.hops, `hop mismatch for ${n.id} -> ${row.ancestorId}`);
      assert.equal(row.minConfidence, info?.minConfidence, `confidence mismatch for ${n.id} -> ${row.ancestorId}`);
    }
  }

  // The target's closure must include every node on the seeded path's
  // prerequisite backbone, and never include the canon-bridge nodes (they
  // hang off `generalizes`/`example_of` edges, not `prerequisite`).
  const target = nodes.find((n) => n.slug === "why-the-sky-is-blue")!;
  const targetRows = byNode.get(target.id) ?? [];
  const ancestorSlugs = new Set(targetRows.map((r) => bySlugId.get(r.ancestorId)!.slug));
  assert.ok(ancestorSlugs.has("light-travels-in-straight-lines"));
  assert.ok(ancestorSlugs.has("rayleigh-scattering-law"));
  assert.ok(!ancestorSlugs.has("canon-waves"), "canon-bridge node must not appear in a prerequisite-only closure");
});

// ---------------------------------------------------------------------------
// computeFrontier equivalence: full-graph walk vs. closure-pruned walk
// ---------------------------------------------------------------------------

/** Every closure row for one target, in the shape computeFrontier's `ancestorRows` param expects. */
function ancestorRowsFor(targetId: string, edges: GraphEdge[]): PrereqAncestorRow[] {
  const info = ancestorsOf(targetId, edges);
  return Array.from(info.entries()).map(([ancestorId, { hops, minConfidence }]) => ({
    nodeId: targetId,
    ancestorId,
    minHops: hops,
    minConfidence,
  }));
}

function assertEquivalent(
  nodes: GraphNode[],
  edges: GraphEdge[],
  states: LearnerNodeState[],
  targetId: string,
  label: string,
) {
  const full = computeFrontier(nodes, edges, states, targetId);
  const pruned = computeFrontier(nodes, edges, states, targetId, ancestorRowsFor(targetId, edges));

  assert.deepEqual(
    full.frontier.map((n) => n.slug).sort(),
    pruned.frontier.map((n) => n.slug).sort(),
    `${label}: frontier mismatch`,
  );
  assert.deepEqual(
    full.gap.map((n) => n.slug).sort(),
    pruned.gap.map((n) => n.slug).sort(),
    `${label}: gap mismatch`,
  );
  assert.deepEqual(
    full.chain.map((s) => `${s.node.slug}:${s.stage}:${s.hops}:${s.isFrontier}`).sort(),
    pruned.chain.map((s) => `${s.node.slug}:${s.stage}:${s.hops}:${s.isFrontier}`).sort(),
    `${label}: chain mismatch`,
  );
  assert.equal(full.target.slug, pruned.target.slug, `${label}: target mismatch`);
}

test("equivalence: fresh learner, no state at all", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  assertEquivalent(nodes, edges, [], target.id, "fresh learner");
});

test("equivalence: mid-path learner, several nodes at understanding", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  const masteredSlugs = [
    "light-travels-in-straight-lines",
    "sunlight-looks-white",
    "air-is-made-of-tiny-particles",
    "white-light-splits-into-colors",
    "each-color-is-a-wavelength",
    "light-can-scatter-off-small-things",
    "waves-have-wavelength-and-frequency",
    "visible-light-is-part-of-em-spectrum",
    "blue-violet-have-shortest-visible-wavelengths",
  ];
  const states = masteredSlugs.map((s) => state(bySlug.get(s)!.id, "understanding"));
  assertEquivalent(nodes, edges, states, target.id, "mid-path learner");
});

test("equivalence: near-target learner, gap is just the target", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  const states: LearnerNodeState[] = [
    state(bySlug.get("sky-is-blue-not-violet")!.id, "understanding"),
    state(bySlug.get("blue-scatters-more-than-red")!.id, "understanding"),
  ];
  assertEquivalent(nodes, edges, states, target.id, "near-target learner");
});

test("equivalence: already-mastered target routes to just itself either way", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  const states: LearnerNodeState[] = [state(target.id, "production")];
  assertEquivalent(nodes, edges, states, target.id, "mastered target");

  // Both paths must independently produce the single-node chain, not just
  // agree with each other by coincidence.
  const pruned = computeFrontier(nodes, edges, states, target.id, ancestorRowsFor(target.id, edges));
  assert.equal(pruned.chain.length, 1);
  assert.equal(pruned.chain[0].node.slug, "why-the-sky-is-blue");
});

test("computeFrontier: empty ancestorRows array behaves exactly like omitting the argument", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  const omitted = computeFrontier(nodes, edges, [], target.id);
  const empty = computeFrontier(nodes, edges, [], target.id, []);
  assert.deepEqual(omitted.frontier.map((n) => n.slug).sort(), empty.frontier.map((n) => n.slug).sort());
});

test("computeFrontier: ancestorRows for a DIFFERENT target falls back to the full-graph walk rather than mis-pruning", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  const otherTargetRows = ancestorRowsFor(bySlug.get("rayleigh-scattering-law")!.id, edges);
  const full = computeFrontier(nodes, edges, [], target.id);
  const mismatched = computeFrontier(nodes, edges, [], target.id, otherTargetRows);
  assert.deepEqual(full.frontier.map((n) => n.slug).sort(), mismatched.frontier.map((n) => n.slug).sort());
});
