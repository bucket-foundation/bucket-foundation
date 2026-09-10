/**
 * Unit tests: the diagnostic probe (src/lib/research-os/probe.ts), bkt-ros
 * Phase 1 item 2 ("tests").
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-probe.ts
 * (same invocation as scripts/test-research-os-routing.ts; no test
 * framework configured in this repo, node:test + node:assert is the
 * existing pattern.)
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ancestorsOf } from "../src/lib/research-os/closure";
import { probeDue, selectProbeNodes, probeQuestion, buildProbe, MAX_PROBE_QUESTIONS } from "../src/lib/research-os/probe";
import { onProbeCheckResult } from "../src/lib/research-os/stages";
import type { GraphNode, GraphEdge, LearnerNodeState } from "../src/lib/research-os/types";

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

function state(nodeId: string, stage: LearnerNodeState["stage"]): LearnerNodeState {
  return { nodeId, stage };
}

function targetAncestorIds(nodes: GraphNode[], edges: GraphEdge[], targetSlug: string): Set<string> {
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  const target = bySlug.get(targetSlug)!;
  return new Set(ancestorsOf(target.id, edges).keys());
}

// ---------------------------------------------------------------------------
// probeDue
// ---------------------------------------------------------------------------

test("probeDue: fresh learner, no state at all -> due", () => {
  const { nodes, edges } = toGraph(loadSeed());
  const ancestorIds = targetAncestorIds(nodes, edges, "why-the-sky-is-blue");
  assert.equal(probeDue(ancestorIds, []), true);
});

test("probeDue: learner has state on one ancestor -> not due", () => {
  const { nodes, edges } = toGraph(loadSeed());
  const ancestorIds = targetAncestorIds(nodes, edges, "why-the-sky-is-blue");
  const anyAncestorId = Array.from(ancestorIds)[0];
  const states = [state(anyAncestorId, "awareness")];
  assert.equal(probeDue(ancestorIds, states), false);
});

test("probeDue: learner has state ONLY on non-ancestor nodes (e.g. the target itself) -> still due", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const ancestorIds = targetAncestorIds(nodes, edges, "why-the-sky-is-blue");
  const target = bySlug.get("why-the-sky-is-blue")!;
  assert.ok(!ancestorIds.has(target.id), "sanity: the target is not its own ancestor");
  const states = [state(target.id, "awareness")];
  assert.equal(probeDue(ancestorIds, states), true);
});

test("probeDue: empty ancestor set (a root target) is never due", () => {
  assert.equal(probeDue(new Set(), []), false);
  assert.equal(probeDue(new Set(), [state("anything", "awareness")]), false);
});

// ---------------------------------------------------------------------------
// selectProbeNodes
// ---------------------------------------------------------------------------

test("selectProbeNodes: a small ancestor set (<= 5) returns every candidate, sorted by rising tier", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const target = bySlug.get("blue-violet-have-shortest-visible-wavelengths")!;
  const ancestorIds = new Set(ancestorsOf(target.id, edges).keys());
  assert.ok(ancestorIds.size > 0 && ancestorIds.size <= MAX_PROBE_QUESTIONS, `expected a small ancestor set, got ${ancestorIds.size}`);

  const selected = selectProbeNodes(nodes, ancestorIds);
  assert.equal(selected.length, ancestorIds.size);
  for (let i = 1; i < selected.length; i++) assert.ok(selected[i].tier >= selected[i - 1].tier, "not sorted by rising tier");
});

test("selectProbeNodes: a large ancestor set is capped at MAX_PROBE_QUESTIONS, spread from lowest to highest tier, no duplicates", () => {
  const { nodes, edges } = toGraph(loadSeed());
  const ancestorIds = targetAncestorIds(nodes, edges, "why-the-sky-is-blue");
  assert.ok(ancestorIds.size > MAX_PROBE_QUESTIONS, `expected a large ancestor set for the full target, got ${ancestorIds.size}`);

  const selected = selectProbeNodes(nodes, ancestorIds);
  assert.ok(selected.length > 0 && selected.length <= MAX_PROBE_QUESTIONS);
  assert.equal(new Set(selected.map((n) => n.id)).size, selected.length, "duplicate node in probe selection");
  for (const n of selected) assert.ok(ancestorIds.has(n.id), `${n.slug} is not an ancestor of the target`);
  for (let i = 1; i < selected.length; i++) assert.ok(selected[i].tier >= selected[i - 1].tier, "not sorted by rising tier");

  const candidates = nodes.filter((n) => ancestorIds.has(n.id)).sort((a, b) => a.tier - b.tier);
  assert.equal(selected[0].tier, candidates[0].tier, "should sample the lowest tier");
  assert.equal(selected[selected.length - 1].tier, candidates[candidates.length - 1].tier, "should sample the highest tier");
});

test("selectProbeNodes: only samples nodes inside ancestorIds, never the target or an unrelated node", () => {
  const { nodes, edges, bySlug } = toGraph(loadSeed());
  const ancestorIds = targetAncestorIds(nodes, edges, "why-the-sky-is-blue");
  const target = bySlug.get("why-the-sky-is-blue")!;
  const selected = selectProbeNodes(nodes, ancestorIds);
  assert.ok(!selected.some((n) => n.id === target.id));
});

// ---------------------------------------------------------------------------
// probeQuestion / buildProbe
// ---------------------------------------------------------------------------

test("probeQuestion: prompt references the node's own title and never leaks its summary", () => {
  const { bySlug } = toGraph(loadSeed());
  const node = bySlug.get("light-travels-in-straight-lines")!;
  const q = probeQuestion(node);
  assert.ok(q.prompt.includes(node.title));
  assert.equal(q.nodeId, node.id);
  assert.equal(q.nodeSlug, node.slug);
  assert.equal(q.tier, node.tier);
  assert.ok(!q.prompt.includes(node.summary || "__never__"), "probe prompt must not leak the grounding-truth summary");
});

test("buildProbe: not due -> no questions; due -> 3-5 questions, every one inside the ancestor set", () => {
  const { nodes, edges } = toGraph(loadSeed());
  const ancestorIds = targetAncestorIds(nodes, edges, "why-the-sky-is-blue");

  const notDue = buildProbe(nodes, ancestorIds, [state(Array.from(ancestorIds)[0], "awareness")]);
  assert.equal(notDue.due, false);
  assert.deepEqual(notDue.questions, []);

  const due = buildProbe(nodes, ancestorIds, []);
  assert.equal(due.due, true);
  assert.ok(due.questions.length >= 1 && due.questions.length <= MAX_PROBE_QUESTIONS);
  for (const q of due.questions) assert.ok(ancestorIds.has(q.nodeId));
});

// ---------------------------------------------------------------------------
// onProbeCheckResult (src/lib/research-os/stages.ts)
// ---------------------------------------------------------------------------

test("onProbeCheckResult: strongly grounded support jumps straight to understanding (skips awareness)", () => {
  const t = onProbeCheckResult({ result: "support", confidence: "high", abstained: false });
  assert.equal(t.nextStage, "understanding");
  assert.equal(t.event.kind, "check");
  assert.equal(t.event.note, "diagnostic_probe");
});

test("onProbeCheckResult: low-confidence support earns awareness, not understanding", () => {
  const t = onProbeCheckResult({ result: "support", confidence: "low", abstained: false });
  assert.equal(t.nextStage, "awareness");
});

test("onProbeCheckResult: unrelated/abstained answer stays at access", () => {
  const t1 = onProbeCheckResult({ result: "unknown", confidence: "low", abstained: true });
  assert.equal(t1.nextStage, "access");
  const t2 = onProbeCheckResult({ result: "contradiction", confidence: "high", abstained: false });
  assert.equal(t2.nextStage, "access");
});
