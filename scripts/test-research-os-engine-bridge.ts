/**
 * Unit tests: the engine <-> Research OS graph bridge (bkt-ros, engine
 * bridge task items 1 and 3), src/lib/research-os/engine-bridge.ts. Every
 * function under test is pure (no I/O), so each test runs against a plain
 * fixture object with no database, matching scripts/test-research-os-
 * routing.ts's own convention (node:test + node:assert, no framework
 * configured in this repo).
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-engine-bridge.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  engineTierToGraphTier,
  engineNodeSlug,
  buildEngineNode,
  buildEngineEdges,
  buildProductionOutboxRow,
  type EngineHypothesisInput,
  type GraphProductionRow,
} from "../src/lib/research-os/engine-bridge";

// ---------------------------------------------------------------------------
// Task item 1: engine hypothesis -> graph.nodes / graph.edges
// ---------------------------------------------------------------------------

test("engineTierToGraphTier: T1..T6 map straight onto their own smallint", () => {
  assert.equal(engineTierToGraphTier("T1"), 1);
  assert.equal(engineTierToGraphTier("T3"), 3);
  assert.equal(engineTierToGraphTier("T6"), 6);
  assert.equal(engineTierToGraphTier(" T2 "), 2, "trims surrounding whitespace");
});

test("engineTierToGraphTier: missing or unrecognized reads as T6, not a guess", () => {
  assert.equal(engineTierToGraphTier(undefined), 6);
  assert.equal(engineTierToGraphTier(null), 6);
  assert.equal(engineTierToGraphTier(""), 6);
  assert.equal(engineTierToGraphTier("T7"), 6, "out of the T1-T6 range");
  assert.equal(engineTierToGraphTier("bogus"), 6);
});

test("engineNodeSlug: deterministic on (engine, runId, hypothesisId)", () => {
  const a = engineNodeSlug("hte", "runs/production/2026-09-10T12-00-00Z", "h-af3c");
  const b = engineNodeSlug("hte", "runs/production/2026-09-10T12-00-00Z", "h-af3c");
  assert.equal(a, b);
  assert.match(a, /^engine-hte-runs-production-2026-09-10t12-00-00z-h-af3c$/);
});

test("engineNodeSlug: any one of the three inputs changing changes the slug", () => {
  const base = engineNodeSlug("hte", "run-1", "h-af3c");
  assert.notEqual(engineNodeSlug("hte2", "run-1", "h-af3c"), base);
  assert.notEqual(engineNodeSlug("hte", "run-2", "h-af3c"), base);
  assert.notEqual(engineNodeSlug("hte", "run-1", "h-0000"), base);
});

function fixtureHypothesis(overrides: Partial<EngineHypothesisInput> = {}): EngineHypothesisInput {
  return {
    engine: "hte",
    runId: "runs/production/2026-09-10T12-00-00Z",
    campaign: "production",
    hypothesisId: "h-af3c",
    model: "sonnet",
    tierAssigned: "T2",
    branch: "02-physics",
    title: "Rayleigh scattering explains the daytime sky's blue color",
    posterior: 0.82,
    elo: 1540,
    slots: { actor: null, action: "scatters", object: "short-wavelength light", place: null, mechanism: "rayleigh-scattering" },
    addressTimeBin: "1871",
    evidenceRefs: ["rayleigh-scattering-law"],
    derivesFromSlugs: ["waves-have-wavelength-and-frequency"],
    ...overrides,
  };
}

test("buildEngineNode: fixture hypothesis becomes a well-formed node draft", () => {
  const draft = buildEngineNode(fixtureHypothesis());
  assert.equal(draft.slug, engineNodeSlug("hte", "runs/production/2026-09-10T12-00-00Z", "h-af3c"));
  assert.equal(draft.kind, "derivation", "defaults to derivation");
  assert.equal(draft.tier, 2, "T2 -> 2");
  assert.equal(draft.branch, "02-physics");
  assert.equal(draft.title, "Rayleigh scattering explains the daytime sky's blue color");
  assert.equal(draft.summary, draft.title, "summary defaults to title when omitted");
  assert.equal(draft.provenance.type, "engine_hypothesis");
  assert.equal(draft.provenance.engine, "hte");
  assert.equal(draft.provenance.run_id, "runs/production/2026-09-10T12-00-00Z");
  assert.equal(draft.provenance.hypothesis_id, "h-af3c");
  assert.equal(draft.provenance.tier_assigned, "T2");
  assert.equal(draft.provenance.posterior, 0.82);
  assert.equal(draft.provenance.elo, 1540);
  assert.deepEqual(draft.provenance.evidence_refs, ["rayleigh-scattering-law"]);
});

test("buildEngineNode: kind 'artifact' and an explicit summary both pass through", () => {
  const draft = buildEngineNode(fixtureHypothesis({ kind: "artifact", summary: "An emitted export, not a claim." }));
  assert.equal(draft.kind, "artifact");
  assert.equal(draft.summary, "An emitted export, not a claim.");
});

test("buildEngineNode: a missing required field throws rather than writing a broken row", () => {
  assert.throws(() => buildEngineNode(fixtureHypothesis({ title: "" })), /title is required/);
  assert.throws(() => buildEngineNode(fixtureHypothesis({ engine: "" })), /engine is required/);
  assert.throws(() => buildEngineNode(fixtureHypothesis({ branch: "   " })), /branch is required/);
});

test("buildEngineEdges: one cites edge per evidence ref, one derives_from per canon ref", () => {
  const edges = buildEngineEdges(fixtureHypothesis());
  assert.deepEqual(edges, [
    { toSlug: "rayleigh-scattering-law", kind: "cites" },
    { toSlug: "waves-have-wavelength-and-frequency", kind: "derives_from" },
  ]);
});

test("buildEngineEdges: no refs at all yields no edges", () => {
  const edges = buildEngineEdges(fixtureHypothesis({ evidenceRefs: [], derivesFromSlugs: [] }));
  assert.deepEqual(edges, []);
});

// ---------------------------------------------------------------------------
// Task item 3: an accepted production -> the engine outbox row
// ---------------------------------------------------------------------------

function fixtureProduction(overrides: Partial<GraphProductionRow> = {}): GraphProductionRow {
  return {
    id: "3f8f1e2a-6b4d-4c7f-9a1e-8d2c5b0a9f11",
    learner_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    target_node_id: "1111aaaa-2222-bbbb-3333-cccc44445555",
    claim: "The sky is blue because short wavelengths scatter more than long ones.",
    evidence: [{ source_id: "rayleigh-1871", locator: "sec. 2", quote: "the intensity varies as the inverse fourth power" }],
    sources: [{ label: "Rayleigh 1871", doi: "10.1080/14786447108640452" }],
    status: "accepted",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-05T14:30:00Z",
    ...overrides,
  };
}

const fixtureTargetNode = { slug: "why-the-sky-is-blue", title: "Why is the sky blue?", tier: 5, branch: "02-physics" };

test("buildProductionOutboxRow: an accepted production becomes a raw, PII-free outbox row", () => {
  const row = buildProductionOutboxRow(fixtureProduction(), fixtureTargetNode);
  assert.equal(row.id, "3f8f1e2a-6b4d-4c7f-9a1e-8d2c5b0a9f11", "the production's own id, no synthetic prefix");
  assert.equal(row.target_node_id, "1111aaaa-2222-bbbb-3333-cccc44445555");
  assert.equal(row.claim, "The sky is blue because short wavelengths scatter more than long ones.");
  assert.deepEqual(row.evidence, fixtureProduction().evidence);
  assert.deepEqual(row.sources, fixtureProduction().sources);
  assert.equal(row.status, "accepted");
  assert.equal(row.created_at, "2026-09-01T10:00:00Z");
  assert.equal(row.updated_at, "2026-09-05T14:30:00Z");
  assert.deepEqual(row._target_node, fixtureTargetNode);
  assert.ok(!("learner_id" in row), "learner_id must never reach the outbox row");
  assert.ok(!("transfer_proof" in row), "transfer_proof must never reach the outbox row");
});

test("buildProductionOutboxRow: a null target node is allowed (engine falls back to grade_band 'unknown')", () => {
  const row = buildProductionOutboxRow(fixtureProduction(), null);
  assert.equal(row._target_node, null);
});

test("buildProductionOutboxRow: missing updated_at falls back to null, not undefined", () => {
  const { updated_at: _drop, ...withoutUpdatedAt } = fixtureProduction();
  const row = buildProductionOutboxRow(withoutUpdatedAt as GraphProductionRow, fixtureTargetNode);
  assert.equal(row.updated_at, null);
});

test("buildProductionOutboxRow: a non-accepted status throws, this is the accept-time hook only", () => {
  assert.throws(
    () => buildProductionOutboxRow(fixtureProduction({ status: "draft" }), fixtureTargetNode),
    /is not accepted \(status=draft\)/,
  );
  assert.throws(() => buildProductionOutboxRow(fixtureProduction({ status: "submitted" }), fixtureTargetNode), /is not accepted/);
});

test("buildProductionOutboxRow: non-array evidence/sources coerce to empty arrays rather than throwing", () => {
  const row = buildProductionOutboxRow(
    fixtureProduction({ evidence: null as unknown as unknown[], sources: undefined as unknown as unknown[] }),
    fixtureTargetNode,
  );
  assert.deepEqual(row.evidence, []);
  assert.deepEqual(row.sources, []);
});
