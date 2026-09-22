/**
 * The one piece of loop copy that reads a nullable count
 * (src/lib/research-os/loop-shape.ts). A failed connection read leaves
 * `held` null, and the column has to say so rather than print the null.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { internalizationDetail, internalizationLit, internalizationState, type LoopInternalization } from "../src/lib/research-os/loop-shape";

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

test("an unknown bridge count never prints the null or a made-up number", () => {
  const unknown = internalizationDetail({ ...base, nodes: 3, bridges: null, held: null });
  assert.ok(!unknown.includes("null"), "the literal null never reaches the learner");
  assert.ok(!/\d+ bridges? one step away/.test(unknown), "and no bridge count is invented");
  assert.equal(unknown, "3 internalized · bridges unavailable");
});

test("an unknown count with nothing else to show says unknown", () => {
  // A learner who has internalized nothing yet, on a read that failed,
  // used to be told "0 internalized", which is the outage reading as an
  // answer (Bucket critic C46).
  assert.equal(internalizationDetail({ ...base, nodes: 0, bridges: null, held: null }), "bridges unavailable");
  assert.notEqual(internalizationDetail({ ...base, nodes: 0, bridges: null, held: null }), "0 internalized");
});

test("an unknown bridge count says so even when nodes are held", () => {
  // Falling back to the node count read identically to "no bridges"
  // (Bucket critic C69).
  const unknown = internalizationDetail({ ...base, nodes: 3, bridges: null, held: null });
  const none = internalizationDetail({ ...base, nodes: 3, bridges: 0 });
  assert.notEqual(unknown, none, "an unfinished read does not read as a frontier with nothing next to it");
  assert.match(unknown, /unavailable/);
  assert.match(unknown, /3 internalized/, "and it still says what is known");
});

test("a known bridge count reads as one, singular and plural", () => {
  assert.equal(internalizationDetail({ ...base, bridges: 1 }), "1 bridge one step away");
  assert.equal(internalizationDetail({ ...base, bridges: 4 }), "4 bridges one step away");
  assert.equal(internalizationDetail({ ...base, bridges: 0, nodes: 7 }), "7 internalized", "no bridges falls back to what is held");
});
