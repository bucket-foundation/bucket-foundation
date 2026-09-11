/**
 * Unit tests: faded guidance for low-prior-knowledge learners (bkt-ros
 * ros-14). Covers src/lib/research-os/guidance.ts's two pure rules
 * (computeGuidanceLevel, the base level; nextGuidanceLevel, the fading
 * schedule; classifyCheckOutcome), src/lib/research-os/db.ts's
 * decideGuidanceEnabled (the class arm-switch combination rule), and
 * src/lib/research-os/worked-examples.ts's firstHalfOfWorkedExample. No
 * network call, no database, matching this repo's existing research-os
 * test convention: every function under test here is pure.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-guidance.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { computeGuidanceLevel, nextGuidanceLevel, classifyCheckOutcome, type CheckOutcome } from "../src/lib/research-os/guidance";
import { decideGuidanceEnabled } from "../src/lib/research-os/db";
import { firstHalfOfWorkedExample } from "../src/lib/research-os/worked-examples";
import type { GuidanceLevel, Stage } from "../src/lib/research-os/types";

// ---------------------------------------------------------------------------
// computeGuidanceLevel: the base level from the chain's first two nodes
// ---------------------------------------------------------------------------

test("computeGuidanceLevel: both nodes below Understanding -> high", () => {
  const belowPairs: Stage[][] = [
    ["access", "access"],
    ["access", "awareness"],
    ["awareness", "awareness"],
  ];
  for (const pair of belowPairs) {
    assert.equal(computeGuidanceLevel(pair), "high", `expected high for ${JSON.stringify(pair)}`);
  }
});

test("computeGuidanceLevel: exactly one node below Understanding -> medium", () => {
  const pairs: Stage[][] = [
    ["access", "understanding"],
    ["awareness", "internalization"],
    ["production", "access"],
  ];
  for (const pair of pairs) {
    assert.equal(computeGuidanceLevel(pair), "medium", `expected medium for ${JSON.stringify(pair)}`);
  }
});

test("computeGuidanceLevel: neither node below Understanding -> low", () => {
  const pairs: Stage[][] = [
    ["understanding", "understanding"],
    ["internalization", "production"],
    ["production", "production"],
  ];
  for (const pair of pairs) {
    assert.equal(computeGuidanceLevel(pair), "low", `expected low for ${JSON.stringify(pair)}`);
  }
});

test("computeGuidanceLevel: order does not matter (one below in either position is still medium)", () => {
  assert.equal(computeGuidanceLevel(["access", "understanding"]), "medium");
  assert.equal(computeGuidanceLevel(["understanding", "access"]), "medium");
});

test("computeGuidanceLevel: zero entries -> medium (the neutral default, nothing to grade)", () => {
  assert.equal(computeGuidanceLevel([]), "medium");
});

test("computeGuidanceLevel: exactly one entry -> medium if below Understanding, low otherwise", () => {
  assert.equal(computeGuidanceLevel(["access"]), "medium");
  assert.equal(computeGuidanceLevel(["awareness"]), "medium");
  assert.equal(computeGuidanceLevel(["understanding"]), "low");
  assert.equal(computeGuidanceLevel(["production"]), "low");
});

// ---------------------------------------------------------------------------
// classifyCheckOutcome
// ---------------------------------------------------------------------------

test("classifyCheckOutcome: support, not abstained, not low confidence -> pass", () => {
  assert.equal(classifyCheckOutcome({ result: "support", confidence: "high", abstained: false }), "pass");
  assert.equal(classifyCheckOutcome({ result: "support", confidence: "medium", abstained: false }), "pass");
});

test("classifyCheckOutcome: everything else -> fail", () => {
  assert.equal(classifyCheckOutcome({ result: "support", confidence: "low", abstained: false }), "fail");
  assert.equal(classifyCheckOutcome({ result: "support", confidence: "high", abstained: true }), "fail");
  assert.equal(classifyCheckOutcome({ result: "contradiction", confidence: "high", abstained: false }), "fail");
  assert.equal(classifyCheckOutcome({ result: "unknown", confidence: "low", abstained: true }), "fail");
});

// ---------------------------------------------------------------------------
// nextGuidanceLevel: the fading schedule
// ---------------------------------------------------------------------------

test("nextGuidanceLevel: two passes in a row drops one level", () => {
  assert.equal(nextGuidanceLevel("high", ["pass", "pass"]), "medium");
  assert.equal(nextGuidanceLevel("medium", ["pass", "pass"]), "low");
});

test("nextGuidanceLevel: two passes at the floor (low) stays low, no lower level to drop to", () => {
  assert.equal(nextGuidanceLevel("low", ["pass", "pass"]), "low");
});

test("nextGuidanceLevel: two fails in a row rises one level", () => {
  assert.equal(nextGuidanceLevel("low", ["fail", "fail"]), "medium");
  assert.equal(nextGuidanceLevel("medium", ["fail", "fail"]), "high");
});

test("nextGuidanceLevel: two fails at the ceiling (high) stays high, no higher level to rise to", () => {
  assert.equal(nextGuidanceLevel("high", ["fail", "fail"]), "high");
});

test("nextGuidanceLevel: a mixed pair leaves the base level unchanged", () => {
  const bases: GuidanceLevel[] = ["high", "medium", "low"];
  const mixedPairs: CheckOutcome[][] = [
    ["pass", "fail"],
    ["fail", "pass"],
  ];
  for (const base of bases) {
    for (const pair of mixedPairs) {
      assert.equal(nextGuidanceLevel(base, pair), base, `expected ${base} unchanged for ${JSON.stringify(pair)}`);
    }
  }
});

test("nextGuidanceLevel: fewer than two outcomes on record leaves the base level unchanged", () => {
  assert.equal(nextGuidanceLevel("high", []), "high");
  assert.equal(nextGuidanceLevel("medium", ["pass"]), "medium");
  assert.equal(nextGuidanceLevel("low", ["fail"]), "low");
});

test("nextGuidanceLevel: only the two most recent outcomes matter, a longer streak with an older break still reads as a two-in-a-row streak", () => {
  // oldest-first input, per this function's own header: a fail followed by
  // two passes still reads as "the last two were both pass."
  assert.equal(nextGuidanceLevel("high", ["fail", "pass", "pass"]), "medium");
  assert.equal(nextGuidanceLevel("low", ["pass", "fail", "fail"]), "medium");
});

// ---------------------------------------------------------------------------
// decideGuidanceEnabled (src/lib/research-os/db.ts): the class arm-switch
// combination rule
// ---------------------------------------------------------------------------

test("decideGuidanceEnabled: no class rows at all (no membership, or every membership dangling) -> enabled", () => {
  assert.equal(decideGuidanceEnabled([]), true);
});

test("decideGuidanceEnabled: a single class with the switch on -> enabled", () => {
  assert.equal(decideGuidanceEnabled([{ id: "c1", research_os_guidance_enabled: true }]), true);
});

test("decideGuidanceEnabled: a single class with the switch off -> disabled", () => {
  assert.equal(decideGuidanceEnabled([{ id: "c1", research_os_guidance_enabled: false }]), false);
});

test("decideGuidanceEnabled: every class off -> disabled", () => {
  assert.equal(
    decideGuidanceEnabled([
      { id: "c1", research_os_guidance_enabled: false },
      { id: "c2", research_os_guidance_enabled: false },
    ]),
    false,
  );
});

test("decideGuidanceEnabled: at least one class on among several -> enabled (OR, not AND)", () => {
  assert.equal(
    decideGuidanceEnabled([
      { id: "c1", research_os_guidance_enabled: false },
      { id: "c2", research_os_guidance_enabled: true },
    ]),
    true,
  );
});

test("decideGuidanceEnabled: a null switch value (pre-migration row) reads as on", () => {
  assert.equal(decideGuidanceEnabled([{ id: "c1", research_os_guidance_enabled: null }]), true);
});

// ---------------------------------------------------------------------------
// firstHalfOfWorkedExample (src/lib/research-os/worked-examples.ts)
// ---------------------------------------------------------------------------

test("firstHalfOfWorkedExample: a 3-sentence example returns the first 2 (rounds up)", () => {
  const text = "First sentence. Second sentence. Third sentence.";
  const half = firstHalfOfWorkedExample(text);
  assert.equal(half, "First sentence. Second sentence.");
});

test("firstHalfOfWorkedExample: a 4-sentence example returns exactly the first 2", () => {
  const text = "One. Two. Three. Four.";
  assert.equal(firstHalfOfWorkedExample(text), "One. Two.");
});

test("firstHalfOfWorkedExample: a single sentence returns itself unchanged (nothing shorter to cut to)", () => {
  const text = "Just one sentence here.";
  assert.equal(firstHalfOfWorkedExample(text), text);
});

test("firstHalfOfWorkedExample: no sentence-ending punctuation returns the whole string unchanged", () => {
  const text = "no punctuation at all just words";
  assert.equal(firstHalfOfWorkedExample(text), text);
});

test("firstHalfOfWorkedExample: empty or whitespace-only input returns an empty string", () => {
  assert.equal(firstHalfOfWorkedExample(""), "");
  assert.equal(firstHalfOfWorkedExample("   "), "");
});

test("firstHalfOfWorkedExample: never returns more text than the input had", () => {
  const text = "Light travels in a straight line, like a laser pointer beam. It keeps going straight until it hits something. When it hits something, it can bounce off (reflect), bend, or scatter in a new direction.";
  const half = firstHalfOfWorkedExample(text);
  assert.ok(half.length < text.length, "the first half must be shorter than the full example");
  assert.ok(text.startsWith(half.slice(0, -1)) || text.includes(half), "the first half must be a prefix drawn from the real text, never invented");
});
