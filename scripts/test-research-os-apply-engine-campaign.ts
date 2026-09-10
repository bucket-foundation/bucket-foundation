/**
 * Unit tests: the export-mapping functions in scripts/research-os/apply-
 * engine-campaign.ts (ros-12 item 3's write side), `toEngineHypothesisInput`/
 * `toGapNodeInput`. Both are pure (no I/O), so each test runs against a
 * plain fixture object with no database, matching scripts/test-research-
 * os-engine-bridge.ts's own convention (node:test + node:assert, no
 * framework configured in this repo). `applyEngineCampaign` itself (the
 * part that calls Supabase through db.ts) is exercised only by a live run,
 * see that file's own header comment for why.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-apply-engine-campaign.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  toEngineHypothesisInput,
  toGapNodeInput,
  type AcceptedExportEntry,
  type GapExportEntry,
} from "./research-os/apply-engine-campaign";

function fixtureAcceptedEntry(overrides: Partial<AcceptedExportEntry> = {}): AcceptedExportEntry {
  return {
    engine: "hte",
    runId: "runs/research-os/2026-09-10T12-00-00Z",
    campaign: "research-os",
    hypothesisId: "h-af3c",
    branch: "02-physics",
    title: "Alpha Observatory team sighted comet Q",
    posterior: 0.71,
    elo: 1522.4,
    slots: { actor: "Alpha Observatory team", action: "Sighted", object: null, place: null, mechanism: null },
    evidenceRefs: ["gt-alpha"],
    derivesFromSlugs: [],
    ...overrides,
  };
}

function fixtureGapEntry(overrides: Partial<GapExportEntry> = {}): GapExportEntry {
  return {
    engine: "hte",
    runId: "runs/research-os/2026-09-10T12-00-00Z",
    campaign: "research-os",
    branch: "02-physics",
    gapId: "gap-ev-001",
    kind: "unresolved-slot",
    description: "evidence ev-001 names no value for: place, mechanism",
    valueOfInformation: 0.18,
    concernsHypothesisIds: ["h-af3c"],
    ...overrides,
  };
}

test("toEngineHypothesisInput: every export field carries straight through", () => {
  const entry = fixtureAcceptedEntry();
  const input = toEngineHypothesisInput(entry);
  assert.equal(input.engine, entry.engine);
  assert.equal(input.runId, entry.runId);
  assert.equal(input.campaign, entry.campaign);
  assert.equal(input.hypothesisId, entry.hypothesisId);
  assert.equal(input.branch, entry.branch);
  assert.equal(input.title, entry.title);
  assert.equal(input.posterior, 0.71);
  assert.equal(input.elo, 1522.4);
  assert.deepEqual(input.slots, entry.slots);
  assert.deepEqual(input.evidenceRefs, entry.evidenceRefs);
  assert.deepEqual(input.derivesFromSlugs, entry.derivesFromSlugs);
});

test("toEngineHypothesisInput: a null posterior/elo (the export's JSON-safe absence marker) becomes undefined", () => {
  const input = toEngineHypothesisInput(fixtureAcceptedEntry({ posterior: null, elo: null }));
  assert.equal(input.posterior, undefined);
  assert.equal(input.elo, undefined);
});

test("toGapNodeInput: every export field carries straight through", () => {
  const entry = fixtureGapEntry();
  const input = toGapNodeInput(entry);
  assert.equal(input.engine, entry.engine);
  assert.equal(input.runId, entry.runId);
  assert.equal(input.campaign, entry.campaign);
  assert.equal(input.branch, entry.branch);
  assert.equal(input.gapId, entry.gapId);
  assert.equal(input.kind, entry.kind);
  assert.equal(input.description, entry.description);
  assert.equal(input.valueOfInformation, 0.18);
  assert.deepEqual(input.concernsHypothesisIds, entry.concernsHypothesisIds);
});

test("toGapNodeInput: an empty concernsHypothesisIds list carries through as empty, not dropped", () => {
  const input = toGapNodeInput(fixtureGapEntry({ concernsHypothesisIds: [] }));
  assert.deepEqual(input.concernsHypothesisIds, []);
});
