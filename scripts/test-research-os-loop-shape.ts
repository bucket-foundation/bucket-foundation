/**
 * The one piece of loop copy that reads a nullable count
 * (src/lib/research-os/loop-shape.ts). A failed connection read leaves
 * `held` null, and the column has to say so rather than print the null.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { internalizationLit, internalizationState, type LoopInternalization } from "../src/lib/research-os/loop-shape";

const base: LoopInternalization = { nodes: 0, held: 0, bridges: 0, nextBridge: null };

test("a known count reads as a count, singular and plural", () => {
  assert.equal(internalizationState({ ...base, held: 0 }), "0 connections held");
  assert.equal(internalizationState({ ...base, held: 1 }), "1 connection held");
  assert.equal(internalizationState({ ...base, held: 4 }), "4 connections held");
});

test("an unknown count says unknown, and never prints the null", () => {
  const out = internalizationState({ ...base, held: null, bridges: null, connectionsUnavailable: true });
  assert.equal(out, "connections unavailable");
  assert.ok(!out.includes("null"), "the literal null never reaches the learner");
  assert.ok(!/\bNaN\b/.test(out));
});

test("an unknown count lights the column only on what is known", () => {
  assert.equal(internalizationLit({ ...base, held: null, bridges: null, nodes: 0 }), false, "unknown is not evidence of a connection");
  assert.equal(internalizationLit({ ...base, held: null, bridges: null, nodes: 2 }), true, "internalized nodes still light it");
  assert.equal(internalizationLit({ ...base, held: 1 }), true);
  assert.equal(internalizationLit({ ...base, held: 0, nodes: 0 }), false);
});
