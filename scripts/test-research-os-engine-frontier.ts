/**
 * Unit tests: engine hypothesis nodes as a candidate "frontier" target
 * (bkt-ros, engine bridge task item 2), src/lib/research-os/engine-
 * frontier.ts. Fixture: the Phase 0 sky-blue seed
 * (supabase/seed/research-os-sky-blue.json) plus one synthetic engine
 * fixture node, per the task's own "test with the sky-blue seed plus one
 * engine fixture node." No database; matches scripts/test-research-os-
 * routing.ts's own convention (node:test + node:assert).
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-engine-frontier.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findFrontierEngineTargets } from "../src/lib/research-os/engine-frontier";
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

const ENGINE_NODE_ID = "engine-hte-runs-production-2026-09-10-h-af3c";

/** The seed's own nodes/edges, plus one synthetic engine hypothesis node
 * (provenance.type "engine_hypothesis") whose two `derives_from` targets
 * are real seed nodes, the fixture the task names ("the sky-blue seed
 * plus one engine fixture node"). Slug doubles as id, matching
 * test-research-os-routing.ts's own toGraph helper; tests don't touch a
 * database. */
function toGraphWithEngineFixture(seed: Seed): { nodes: GraphNode[]; edges: GraphEdge[] } {
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

  const engineNode: GraphNode = {
    id: ENGINE_NODE_ID,
    slug: ENGINE_NODE_ID,
    title: "Rayleigh scattering explains the daytime sky's blue color",
    kind: "derivation",
    tier: 2,
    branch: "02-physics",
    summary: "An engine hypothesis fixture for frontier tests.",
    provenance: { type: "engine_hypothesis" },
  };
  nodes.push(engineNode);
  edges.push(
    { fromId: ENGINE_NODE_ID, toId: "tyndall-scattering-by-small-particles", kind: "derives_from" },
    { fromId: ENGINE_NODE_ID, toId: "rayleigh-scattering-law", kind: "derives_from" },
  );

  return { nodes, edges };
}

function state(nodeId: string, stage: Stage): LearnerNodeState {
  return { nodeId, stage };
}

test("no learner state: an engine node's derives_from prerequisites are 0% held, below the default 0.5 threshold", () => {
  const { nodes, edges } = toGraphWithEngineFixture(loadSeed());
  const candidates = findFrontierEngineTargets(nodes, edges, []);
  assert.deepEqual(candidates, [], "0/2 held should not clear the default minHeldFraction");
});

test("both derives_from prerequisites held at understanding: the engine node is a candidate", () => {
  const { nodes, edges } = toGraphWithEngineFixture(loadSeed());
  const states: LearnerNodeState[] = [
    state("tyndall-scattering-by-small-particles", "understanding"),
    state("rayleigh-scattering-law", "understanding"),
  ];
  const candidates = findFrontierEngineTargets(nodes, edges, states);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].node.id, ENGINE_NODE_ID);
  assert.equal(candidates[0].heldCount, 2);
  assert.equal(candidates[0].totalCount, 2);
  assert.equal(candidates[0].heldFraction, 1);
  assert.deepEqual(candidates[0].prerequisiteNodeIds.sort(), ["rayleigh-scattering-law", "tyndall-scattering-by-small-particles"]);
});

test("exactly half the prerequisites held: still a candidate, the default threshold is inclusive", () => {
  const { nodes, edges } = toGraphWithEngineFixture(loadSeed());
  const states: LearnerNodeState[] = [state("rayleigh-scattering-law", "understanding")];
  const candidates = findFrontierEngineTargets(nodes, edges, states);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].heldFraction, 0.5);
});

test("a prerequisite held only at awareness, below the understanding minStage, does not count as held", () => {
  const { nodes, edges } = toGraphWithEngineFixture(loadSeed());
  const states: LearnerNodeState[] = [
    state("tyndall-scattering-by-small-particles", "awareness"),
    state("rayleigh-scattering-law", "understanding"),
  ];
  const candidates = findFrontierEngineTargets(nodes, edges, states);
  assert.equal(candidates.length, 1, "0.5 still clears the inclusive default threshold");
  assert.equal(candidates[0].heldCount, 1);
});

test("a K-12 path node, even one at 'understanding', is never itself returned as a candidate", () => {
  const { nodes, edges } = toGraphWithEngineFixture(loadSeed());
  const states: LearnerNodeState[] = [
    state("tyndall-scattering-by-small-particles", "understanding"),
    state("rayleigh-scattering-law", "understanding"),
  ];
  const candidates = findFrontierEngineTargets(nodes, edges, states);
  assert.ok(
    candidates.every((c) => c.node.provenance?.type === "engine_hypothesis"),
    "only provenance.type === 'engine_hypothesis' nodes may appear",
  );
});

test("an engine node with no derives_from edges at all is vacuously held regardless of learner state", () => {
  const { nodes, edges } = toGraphWithEngineFixture(loadSeed());
  const isolatedId = "engine-hte-runs-production-2026-09-10-h-0000";
  nodes.push({
    id: isolatedId,
    slug: isolatedId,
    title: "An isolated engine hypothesis with no prerequisites",
    kind: "artifact",
    tier: 4,
    branch: "02-physics",
    summary: "No derives_from edges at all.",
    provenance: { type: "engine_hypothesis" },
  });
  const candidates = findFrontierEngineTargets(nodes, edges, []);
  const isolated = candidates.find((c) => c.node.id === isolatedId);
  assert.ok(isolated, "an engine node with zero prerequisites must still be a candidate");
  assert.equal(isolated!.totalCount, 0);
  assert.equal(isolated!.heldFraction, 1);
});

test("minHeldFraction, limit, and minStage options are honored", () => {
  const { nodes, edges } = toGraphWithEngineFixture(loadSeed());
  const states: LearnerNodeState[] = [state("rayleigh-scattering-law", "understanding")];

  assert.deepEqual(
    findFrontierEngineTargets(nodes, edges, states, { minHeldFraction: 0.75 }),
    [],
    "0.5 held must not clear a 0.75 threshold",
  );
  assert.equal(findFrontierEngineTargets(nodes, edges, states, { minHeldFraction: 0.5, limit: 0 }).length, 0, "limit:0 returns none");
  assert.equal(
    findFrontierEngineTargets(nodes, edges, [state("rayleigh-scattering-law", "internalization")], { minStage: "internalization" }).length,
    1,
    "a stage above minStage still counts as held",
  );
});

test("candidates sort by held fraction descending, ties broken by slug", () => {
  const { nodes, edges } = toGraphWithEngineFixture(loadSeed());
  const secondId = "engine-hte-runs-production-2026-09-10-h-aaaa";
  nodes.push({
    id: secondId,
    slug: secondId,
    title: "A second engine hypothesis, fully held",
    kind: "derivation",
    tier: 3,
    branch: "02-physics",
    summary: "No derives_from edges, vacuously held like the first, ties on slug.",
    provenance: { type: "engine_hypothesis" },
  });
  const states: LearnerNodeState[] = [
    state("tyndall-scattering-by-small-particles", "understanding"),
    state("rayleigh-scattering-law", "understanding"),
  ];
  const candidates = findFrontierEngineTargets(nodes, edges, states);
  // Both the original fixture node (2/2 held) and the vacuously-held second
  // node read heldFraction 1; slug order breaks the tie: "...-h-aaaa" sorts
  // before "...-h-af3c".
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].heldFraction, 1);
  assert.equal(candidates[1].heldFraction, 1);
  assert.equal(candidates[0].node.id, secondId);
  assert.equal(candidates[1].node.id, ENGINE_NODE_ID);
});
