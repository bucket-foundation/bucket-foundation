/**
 * Unit tests: the Phase 0 seed path's integrity, and frontier-backward
 * routing (src/lib/research-os/frontier.ts) against three synthetic learner
 * states plus one edge case, per task item 3 ("unit-tested with the seed
 * path and three synthetic learner states").
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-routing.ts
 * (matches scripts/test-kruse-token.ts's invocation; no test framework is
 * configured in this repo, node:test + node:assert is the existing pattern.)
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

/** Turn the slug-keyed seed fixture into id-keyed GraphNode/GraphEdge arrays (slug doubles as id, tests don't touch a database). */
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
// Seed integrity
// ---------------------------------------------------------------------------

test("seed path has 15-25 nodes, unique slugs, and the target exists", () => {
  const seed = loadSeed();
  assert.ok(seed.nodes.length >= 15 && seed.nodes.length <= 25, `expected 15-25 nodes, got ${seed.nodes.length}`);
  const slugs = seed.nodes.map((n) => n.slug);
  assert.equal(new Set(slugs).size, slugs.length, "duplicate slugs in seed");
  assert.ok(slugs.includes(seed.target_slug), `target_slug ${seed.target_slug} missing from nodes`);
});

test("every edge endpoint resolves to a defined node", () => {
  const seed = loadSeed();
  const slugs = new Set(seed.nodes.map((n) => n.slug));
  for (const e of seed.edges) {
    assert.ok(slugs.has(e.from), `edge from unknown node ${e.from}`);
    assert.ok(slugs.has(e.to), `edge to unknown node ${e.to}`);
  }
});

test("every node has a real citation (author/publisher + year, or a DOI/url)", () => {
  const seed = JSON.parse(readFileSync(SEED_PATH, "utf8")) as { nodes: Array<{ slug: string; provenance?: Record<string, unknown> }> };
  for (const n of seed.nodes) {
    const p = n.provenance;
    assert.ok(p, `node ${n.slug} has no provenance`);
    const hasCitation = !!(p!.doi || p!.url || (p!.author && p!.year) || p!.source /* canon-bridge mirror */);
    assert.ok(hasCitation, `node ${n.slug} provenance has no doi/url/author+year/mirror source`);
  }
});

// ---------------------------------------------------------------------------
// Frontier-backward routing, three synthetic learner states + one edge case
// ---------------------------------------------------------------------------

test("fresh learner (no state records at all): frontier is exactly the prerequisite roots", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  const result = computeFrontier(nodes, edges, [], target.id);

  const hasIncoming = new Set(edges.filter((e) => e.kind === "prerequisite").map((e) => e.toId));
  const expectedRoots = nodes.filter((n) => !hasIncoming.has(n.id) && n.id !== target.id).map((n) => n.slug);
  const frontierSlugs = result.frontier.map((n) => n.slug).sort();
  // Only roots that are real ancestors of the target should appear (the
  // canon-bridge nodes are also rootless but are not prerequisite-ancestors
  // of the target, so they must NOT show up in the frontier).
  for (const slug of frontierSlugs) {
    assert.ok(expectedRoots.includes(slug), `${slug} unexpectedly in frontier`);
  }
  assert.ok(frontierSlugs.includes("light-travels-in-straight-lines"));
  assert.ok(frontierSlugs.includes("air-is-made-of-tiny-particles"));
  assert.ok(!frontierSlugs.includes("canon-waves"), "canon bridge node must not appear in a prerequisite-only frontier");
  assert.equal(result.chain[result.chain.length - 1].node.slug, "why-the-sky-is-blue", "chain must end at the target");
  assert.equal(result.chain[result.chain.length - 1].hops, 0);
});

test("mid-path learner: everything through tier 5 at understanding, frontier sits right after it", () => {
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
  const result = computeFrontier(nodes, edges, states, target.id);

  const frontierSlugs = result.frontier.map((n) => n.slug).sort();
  // The frontier should be exactly the mastered nodes with no un-mastered
  // node between them and a root (i.e. the outermost mastered boundary).
  assert.ok(frontierSlugs.includes("light-as-a-wave") === false, "light-as-a-wave is not mastered, should not be frontier");
  assert.ok(frontierSlugs.every((s) => masteredSlugs.includes(s)), `frontier contains an un-mastered node: ${frontierSlugs}`);
  assert.ok(frontierSlugs.length > 0, "expected a non-empty frontier");

  // The gap (still to do) must not include anything already mastered.
  const gapSlugs = result.gap.map((n) => n.slug);
  for (const s of masteredSlugs) assert.ok(!gapSlugs.includes(s), `${s} is mastered but appears in gap`);
  assert.ok(gapSlugs.includes("rayleigh-scattering-law"), "rayleigh-scattering-law should still be in the gap");
});

test("near-target learner: both direct prerequisites of the target at understanding, gap is just the target", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  const states: LearnerNodeState[] = [
    state(bySlug.get("sky-is-blue-not-violet")!.id, "understanding"),
    state(bySlug.get("blue-scatters-more-than-red")!.id, "understanding"),
  ];
  const result = computeFrontier(nodes, edges, states, target.id);

  assert.deepEqual(result.gap.map((n) => n.slug), ["why-the-sky-is-blue"], "gap should be just the target");
  const frontierSlugs = result.frontier.map((n) => n.slug).sort();
  assert.deepEqual(frontierSlugs, ["blue-scatters-more-than-red", "sky-is-blue-not-violet"]);
});

test("a stage below understanding (awareness) does not count as mastered", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  // Put "understanding" one step past a root so the routing must check the
  // stage threshold rather than stopping at the root anyway.
  const states: LearnerNodeState[] = [state(bySlug.get("light-can-scatter-off-small-things")!.id, "awareness")];
  const result = computeFrontier(nodes, edges, states, target.id);

  const step = result.chain.find((s) => s.node.slug === "light-can-scatter-off-small-things")!;
  assert.equal(step.stage, "awareness", "the chain must report the learner's recorded stage as-is");
  assert.equal(step.isFrontier, false, "awareness must not be treated as mastered (frontier requires >= understanding)");
  // Its own prerequisites (roots) must still have been walked to, since
  // awareness didn't stop the backward walk.
  const frontierSlugs = result.frontier.map((n) => n.slug);
  assert.ok(frontierSlugs.includes("light-travels-in-straight-lines"));
  assert.ok(frontierSlugs.includes("air-is-made-of-tiny-particles"));
});

test("mastering the target itself is not treated as its own frontier (target is never expanded past)", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("why-the-sky-is-blue")!;
  const states: LearnerNodeState[] = [state(target.id, "production")];
  const result = computeFrontier(nodes, edges, states, target.id);
  assert.equal(result.chain.length, 1, "an already-produced target should route to just itself");
  assert.equal(result.chain[0].node.slug, "why-the-sky-is-blue");
});
