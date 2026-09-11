/**
 * Unit tests: lateral reading (bkt-ros, learning/research-os/
 * PLAN-REVISION-3.md section 2c; Wineburg and McGrew 2019, Breakstone and
 * colleagues 2021). Pure, no I/O, no live Supabase or network, matching
 * this repo's existing research-os test convention (node:test +
 * node:assert, plain fixture objects, injectable stores where a store
 * exists).
 *
 * Covers, across the four files this bead touches:
 *   - src/lib/research-os/locate.ts: assessSourceIndependence,
 *     findIndependentSources ("find another source" mode).
 *   - src/lib/research-os/lateral-reading.ts: the arm switch
 *     (envSecondSourceRequiredDefault/resolveSecondSourceRequired),
 *     secondSourceRequiredAtStage, and checkSecondSourceGate, the exact
 *     gate workspace/route.ts's "check" phase 2 calls.
 *   - src/lib/research-os/production-guard.ts Rule 5: hasCorroboration,
 *     lateralReadingFlag.
 *   - src/lib/research-os/stages.ts: onCorroborationRecorded, and
 *     onCheckResult's secondSourceRequired/secondSourceNodeId threading.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-lateral-reading.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { assessSourceIndependence, findIndependentSources, type IndependentSourceCandidate } from "../src/lib/research-os/locate";
import {
  envSecondSourceRequiredDefault,
  resolveSecondSourceRequired,
  secondSourceRequiredAtStage,
  checkSecondSourceGate,
  SECOND_SOURCE_MISSING_MESSAGE,
} from "../src/lib/research-os/lateral-reading";
import { hasCorroboration, lateralReadingFlag, type CorroborationRecord } from "../src/lib/research-os/production-guard";
import { onCorroborationRecorded, onCheckResult } from "../src/lib/research-os/stages";
import type { GraphNode, Provenance, Stage } from "../src/lib/research-os/types";

// ---------------------------------------------------------------------------
// locate.ts: assessSourceIndependence
// ---------------------------------------------------------------------------

function prov(overrides: Partial<Provenance> = {}): Provenance {
  return { publisher: "Royal Society", url: "https://royalsocietypublishing.org/doi/10.1098/rspl.1869.0033", ...overrides };
}

test("assessSourceIndependence: the same publisher (case/whitespace-insensitive) is never independent", () => {
  const a = assessSourceIndependence(prov({ publisher: "Royal Society" }), prov({ publisher: "  royal society  " }));
  assert.equal(a.independent, false);
  assert.match(a.reason, /same publisher/);
});

test("assessSourceIndependence: the same domain with no publisher on file is never independent", () => {
  const a = assessSourceIndependence(
    { url: "https://en.wikipedia.org/wiki/Rayleigh_scattering" },
    { url: "https://en.wikipedia.org/wiki/Electromagnetic_spectrum" },
  );
  assert.equal(a.independent, false);
  assert.match(a.reason, /same domain/);
});

test("assessSourceIndependence: a different publisher AND a different domain is independent", () => {
  const a = assessSourceIndependence(
    prov({ publisher: "Philosophical Magazine", url: "https://www.tandfonline.com/doi/10.1080/14786447108640507" }),
    { publisher: "NASA", url: "https://spaceplace.nasa.gov/blue-sky/en/" },
  );
  assert.equal(a.independent, true);
  assert.match(a.reason, /different publisher/);
});

test("assessSourceIndependence: no provenance on either side reads independent by default, naming the gap", () => {
  const a = assessSourceIndependence(undefined, undefined);
  assert.equal(a.independent, true);
  assert.match(a.reason, /no publisher or domain on file/);
});

test("assessSourceIndependence: a malformed url never throws, just carries no domain signal", () => {
  const a = assessSourceIndependence({ publisher: "Royal Society", url: "not a url" }, { publisher: "NASA", url: "https://spaceplace.nasa.gov/blue-sky/en/" });
  assert.equal(a.independent, true, "different publisher alone is enough once domain comparison is unavailable on one side");
});

// ---------------------------------------------------------------------------
// locate.ts: findIndependentSources, "find another source" mode
// ---------------------------------------------------------------------------

type FixtureNode = Pick<GraphNode, "id" | "slug" | "title" | "kind" | "tier" | "summary" | "provenance">;

function node(overrides: Partial<FixtureNode> = {}): FixtureNode {
  return {
    id: "n-generic",
    slug: "generic",
    title: "A generic node",
    kind: "concept",
    tier: 1,
    summary: "scattering of light by small particles",
    provenance: prov(),
    ...overrides,
  };
}

const QUOTED = { id: "n-rayleigh", provenance: prov({ publisher: "Philosophical Magazine", url: "https://www.tandfonline.com/doi/10.1080/14786447108640507" }) };

test("findIndependentSources: excludes the already-quoted node itself even when it matches the query", () => {
  const nodes = [node({ id: QUOTED.id, slug: "rayleigh", title: "Rayleigh scattering", provenance: QUOTED.provenance })];
  const out = findIndependentSources(nodes, "scatter", QUOTED);
  assert.equal(out.length, 0);
});

test("findIndependentSources: excludes a same-publisher candidate", () => {
  const nodes = [node({ id: "n-2", slug: "sibling", title: "Scattering sequel", provenance: QUOTED.provenance })];
  const out = findIndependentSources(nodes, "scatter", QUOTED);
  assert.equal(out.length, 0, "same publisher as the quoted source never qualifies as independent");
});

test("findIndependentSources: a non-matching query narrows to nothing", () => {
  const nodes = [node({ id: "n-2", slug: "nasa", title: "Why is the sky blue", provenance: { publisher: "NASA", url: "https://spaceplace.nasa.gov/blue-sky/en/" } })];
  const out = findIndependentSources(nodes, "photosynthesis", QUOTED);
  assert.equal(out.length, 0);
});

test("findIndependentSources: an independent, matching candidate is returned with its own independence reason", () => {
  const nodes = [node({ id: "n-2", slug: "nasa", title: "Why the sky scatters blue light", provenance: { publisher: "NASA", url: "https://spaceplace.nasa.gov/blue-sky/en/" } })];
  const out: IndependentSourceCandidate[] = findIndependentSources(nodes, "scatter", QUOTED);
  assert.equal(out.length, 1);
  assert.equal(out[0].nodeId, "n-2");
  assert.match(out[0].independenceReason, /different publisher/);
});

test("findIndependentSources: caps at three, even with more independent matches on file", () => {
  const nodes = [1, 2, 3, 4, 5].map((i) =>
    node({ id: `n-${i}`, slug: `s${i}`, title: `Scattering source ${i}`, provenance: { publisher: `Publisher ${i}`, url: `https://example${i}.org/scatter` } }),
  );
  const out = findIndependentSources(nodes, "scatter", QUOTED);
  assert.equal(out.length, 3);
});

test("findIndependentSources: a blank query returns nothing, never the whole graph", () => {
  const nodes = [node({ id: "n-2", provenance: { publisher: "NASA", url: "https://spaceplace.nasa.gov/blue-sky/en/" } })];
  assert.equal(findIndependentSources(nodes, "   ", QUOTED).length, 0);
});

// ---------------------------------------------------------------------------
// lateral-reading.ts: the arm switch
// ---------------------------------------------------------------------------

test("envSecondSourceRequiredDefault is on unless RESEARCH_OS_SECOND_SOURCE_REQUIRED is exactly false or 0", () => {
  const saved = process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED;
  try {
    delete process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED;
    assert.equal(envSecondSourceRequiredDefault(), true, "unset defaults on");
    process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED = "false";
    assert.equal(envSecondSourceRequiredDefault(), false);
    process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED = "0";
    assert.equal(envSecondSourceRequiredDefault(), false);
    process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED = "FALSE";
    assert.equal(envSecondSourceRequiredDefault(), false, "case-insensitive");
    process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED = "garbage";
    assert.equal(envSecondSourceRequiredDefault(), true, "an unparseable value falls back to on");
  } finally {
    if (saved === undefined) delete process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED;
    else process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED = saved;
  }
});

test("resolveSecondSourceRequired: a class override wins over the env default either direction", () => {
  const saved = process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED;
  try {
    delete process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED; // env default: on
    assert.equal(resolveSecondSourceRequired(true), true);
    assert.equal(resolveSecondSourceRequired(false), false, "an explicit false override beats the on-by-default env");
    assert.equal(resolveSecondSourceRequired(null), true, "null defers to the env default");
    assert.equal(resolveSecondSourceRequired(undefined), true, "undefined defers to the env default");
  } finally {
    if (saved === undefined) delete process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED;
    else process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED = saved;
  }
});

// ---------------------------------------------------------------------------
// lateral-reading.ts: secondSourceRequiredAtStage, "Awareness stays
// single-source" floor
// ---------------------------------------------------------------------------

test("secondSourceRequiredAtStage: off entirely when the switch is off, regardless of stage", () => {
  const stages: Stage[] = ["access", "awareness", "understanding", "internalization", "production"];
  for (const s of stages) assert.equal(secondSourceRequiredAtStage(s, false), false);
});

test("secondSourceRequiredAtStage: Access and Awareness stay single-source even with the switch on", () => {
  assert.equal(secondSourceRequiredAtStage("access", true), false);
  assert.equal(secondSourceRequiredAtStage("awareness", true), false);
});

test("secondSourceRequiredAtStage: Understanding and above require a second source once the switch is on", () => {
  assert.equal(secondSourceRequiredAtStage("understanding", true), true);
  assert.equal(secondSourceRequiredAtStage("internalization", true), true);
  assert.equal(secondSourceRequiredAtStage("production", true), true);
});

// ---------------------------------------------------------------------------
// lateral-reading.ts: checkSecondSourceGate, the exact gate workspace/
// route.ts's "check" phase 2 calls
// ---------------------------------------------------------------------------

test("checkSecondSourceGate: the arm switch off reveals with no second source, at any stage", () => {
  const result = checkSecondSourceGate({ required: false, stage: "understanding", secondSourceWasQuoted: false, secondSourceIndependent: false });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.secondSourceRequired, false);
});

test("checkSecondSourceGate: Awareness reveals with a single source, even with the switch on", () => {
  const result = checkSecondSourceGate({ required: true, stage: "awareness", secondSourceWasQuoted: false, secondSourceIndependent: false });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.secondSourceRequired, false);
});

test("checkSecondSourceGate: Understanding, switch on, no second source attached at all -- withheld", () => {
  const result = checkSecondSourceGate({ required: true, stage: "understanding", secondSourceWasQuoted: false, secondSourceIndependent: false });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "second_source_required");
    assert.equal(result.message, SECOND_SOURCE_MISSING_MESSAGE);
  }
});

test("checkSecondSourceGate: a node id with no real Quote call behind it still withholds (client cannot self-report)", () => {
  const result = checkSecondSourceGate({
    required: true,
    stage: "understanding",
    secondSourceNodeId: "n-2",
    secondSourceWasQuoted: false,
    secondSourceIndependent: true,
  });
  assert.equal(result.ok, false);
});

test("checkSecondSourceGate: a real Quote call on a NOT-independent source still withholds", () => {
  const result = checkSecondSourceGate({
    required: true,
    stage: "understanding",
    secondSourceNodeId: "n-2",
    secondSourceWasQuoted: true,
    secondSourceIndependent: false,
  });
  assert.equal(result.ok, false);
});

test("checkSecondSourceGate: Understanding, a real Quote call on an independent source -- revealed", () => {
  const result = checkSecondSourceGate({
    required: true,
    stage: "understanding",
    secondSourceNodeId: "n-2",
    secondSourceWasQuoted: true,
    secondSourceIndependent: true,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.secondSourceRequired, true);
});

test("checkSecondSourceGate: Internalization and Production also require the gate once the switch is on", () => {
  const base = { required: true, secondSourceNodeId: "n-2", secondSourceWasQuoted: true, secondSourceIndependent: true };
  assert.equal(checkSecondSourceGate({ ...base, stage: "internalization" }).ok, true);
  assert.equal(checkSecondSourceGate({ ...base, stage: "production" }).ok, true);
  assert.equal(checkSecondSourceGate({ ...base, stage: "internalization", secondSourceWasQuoted: false }).ok, false);
});

// ---------------------------------------------------------------------------
// production-guard.ts Rule 5: hasCorroboration / lateralReadingFlag
// ---------------------------------------------------------------------------

function corrRecord(overrides: Partial<CorroborationRecord> = {}): CorroborationRecord {
  return { firstSourceId: "n-1", secondSourceId: "n-2", ...overrides };
}

test("lateralReadingFlag: no corroboration record on file reads single-source", () => {
  assert.equal(lateralReadingFlag("n-1", []), "single-source");
});

test("hasCorroboration / lateralReadingFlag: a record naming the target as firstSourceId corroborates", () => {
  const records = [corrRecord({ firstSourceId: "n-1", secondSourceId: "n-9" })];
  assert.equal(hasCorroboration("n-1", records), true);
  assert.equal(lateralReadingFlag("n-1", records), null);
});

test("hasCorroboration / lateralReadingFlag: a record naming the target as secondSourceId ALSO corroborates (either direction)", () => {
  const records = [corrRecord({ firstSourceId: "n-9", secondSourceId: "n-1" })];
  assert.equal(hasCorroboration("n-1", records), true);
  assert.equal(lateralReadingFlag("n-1", records), null);
});

test("lateralReadingFlag: a corroboration record for an unrelated node pair leaves the target single-source", () => {
  const records = [corrRecord({ firstSourceId: "n-8", secondSourceId: "n-9" })];
  assert.equal(lateralReadingFlag("n-1", records), "single-source");
});

// ---------------------------------------------------------------------------
// stages.ts: onCorroborationRecorded
// ---------------------------------------------------------------------------

test("onCorroborationRecorded: never changes stage, fromStage === toStage === currentStage", () => {
  const t = onCorroborationRecorded("understanding", {
    firstSourceId: "n-1",
    secondSourceId: "n-2",
    independenceReason: "different publisher (NASA vs Royal Society)",
    passagesAgree: true,
  });
  assert.equal(t.nextStage, "understanding");
  assert.equal(t.event.fromStage, "understanding");
  assert.equal(t.event.toStage, "understanding");
  assert.equal(t.event.kind, "corroboration");
});

test("onCorroborationRecorded: persists the two source ids, the independence reason, and the learner's own agree/disagree mark", () => {
  const t = onCorroborationRecorded("understanding", {
    sessionId: "session-1",
    firstSourceId: "n-1",
    secondSourceId: "n-2",
    independenceReason: "different domain (nasa.gov vs royalsocietypublishing.org)",
    passagesAgree: false,
  });
  assert.equal(t.event.firstSourceId, "n-1");
  assert.equal(t.event.secondSourceId, "n-2");
  assert.equal(t.event.independenceReason, "different domain (nasa.gov vs royalsocietypublishing.org)");
  assert.equal(t.event.passagesAgree, false);
  assert.equal(t.event.sessionId, "session-1");
});

// ---------------------------------------------------------------------------
// stages.ts: onCheckResult, the secondSourceRequired/secondSourceNodeId
// threading this bead adds
// ---------------------------------------------------------------------------

test("onCheckResult: secondSourceRequired/secondSourceNodeId persist on the event when supplied", () => {
  const t = onCheckResult(
    "understanding",
    { result: "support", confidence: "high", abstained: false },
    { secondSourceRequired: true, secondSourceNodeId: "n-2" },
  );
  assert.equal(t.event.secondSourceRequired, true);
  assert.equal(t.event.secondSourceNodeId, "n-2");
});

test("onCheckResult: with no lateral-reading context at all, both fields read undefined", () => {
  const t = onCheckResult("awareness", { result: "support", confidence: "high", abstained: false });
  assert.equal(t.event.secondSourceRequired, undefined);
  assert.equal(t.event.secondSourceNodeId, undefined);
});

test("onCheckResult: secondSourceRequired:false with no secondSourceNodeId is the Awareness-tier shape", () => {
  const t = onCheckResult(
    "awareness",
    { result: "support", confidence: "high", abstained: false },
    { secondSourceRequired: false },
  );
  assert.equal(t.event.secondSourceRequired, false);
  assert.equal(t.event.secondSourceNodeId, undefined);
});
