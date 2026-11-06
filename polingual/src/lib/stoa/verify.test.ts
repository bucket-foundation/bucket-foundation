import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRoomKeys, openSignKey, signEvent } from "./keys";
import { verifyEvent, type VerifyContext } from "./verify";

const env = { STOA_ROOM_SECRET: "s".repeat(40) };
const NOW = 1_800_000_000_000;

function room() {
  const id = randomUUID();
  const keys = createRoomKeys(id, env);
  return { id, verifyKey: keys.verifyKey, key: openSignKey(id, keys.signKey, env)! };
}

const a = room();
const b = room();
const ctx = (over: Partial<VerifyContext> = {}): VerifyContext => ({ roomId: a.id, lastSeq: 4, publicKey: a.verifyKey, now: NOW, clockOffsetMs: 0, ...over });
const open = { idx: 0, prompt: { en: "water", lang: "es" }, options: ["agua", "fuego", "tierra", "aire"], closes_at: NOW + 20_000 };

test("a signed event verifies and yields its payload", async () => {
  const r = await verifyEvent(signEvent(a.id, 5, "open", NOW, open, a.key), ctx());
  assert.deepEqual(r, { ok: true, seq: 5, type: "open", issuedAt: NOW, payload: open });
});

test("an event for another room is rejected", async () => {
  const r = await verifyEvent(signEvent(b.id, 5, "open", NOW, open, b.key), ctx());
  assert.deepEqual(r, { ok: false, reason: "room" });
});

test("a replay from another room relabeled for this one fails the signature", async () => {
  const ev = { ...signEvent(b.id, 5, "open", NOW, open, b.key), room_id: a.id };
  assert.deepEqual(await verifyEvent(ev, ctx()), { ok: false, reason: "signature" });
});

test("a seq at or below the last one seen is rejected", async () => {
  assert.deepEqual(await verifyEvent(signEvent(a.id, 4, "open", NOW, open, a.key), ctx()), { ok: false, reason: "seq" });
  assert.deepEqual(await verifyEvent(signEvent(a.id, 3, "open", NOW, open, a.key), ctx()), { ok: false, reason: "seq" });
});

test("an event older than 30 seconds by the clock offset is stale", async () => {
  const ev = signEvent(a.id, 5, "open", NOW, open, a.key);
  assert.deepEqual(await verifyEvent(ev, ctx({ now: NOW + 30_001 })), { ok: false, reason: "stale" });
  assert.equal((await verifyEvent(ev, ctx({ now: NOW + 30_000 }))).ok, true);
  assert.equal((await verifyEvent(ev, ctx({ now: NOW + 40_000, clockOffsetMs: -15_000 }))).ok, true);
  assert.deepEqual(await verifyEvent(ev, ctx({ now: NOW - 31_000 })), { ok: false, reason: "stale" });
});

test("a changed body, type or seq fails the signature", async () => {
  const ev = signEvent(a.id, 5, "reveal", NOW, { idx: 0, answer: 1 }, a.key);
  assert.equal((await verifyEvent({ ...ev, body: JSON.stringify({ idx: 0, answer: 2 }) }, ctx())).ok, false);
  assert.deepEqual(await verifyEvent({ ...ev, type: "open" }, ctx()), { ok: false, reason: "signature" });
  assert.deepEqual(await verifyEvent({ ...ev, seq: 6 }, ctx()), { ok: false, reason: "signature" });
  assert.deepEqual(await verifyEvent({ ...ev, issued_at: NOW + 1 }, ctx()), { ok: false, reason: "signature" });
});

test("a signature from another room key fails", async () => {
  const ev = signEvent(a.id, 5, "open", NOW, open, b.key);
  assert.deepEqual(await verifyEvent(ev, ctx()), { ok: false, reason: "signature" });
});

test("unsigned and malformed events drop before the payload is parsed", async () => {
  assert.deepEqual(await verifyEvent({ room_id: a.id, seq: 5, type: "open", issued_at: NOW, body: "{}" }, ctx()), { ok: false, reason: "shape" });
  assert.deepEqual(await verifyEvent(null, ctx()), { ok: false, reason: "shape" });
  assert.deepEqual(await verifyEvent({ ...signEvent(a.id, 5, "open", NOW, open, a.key), seq: 0 }, ctx()), { ok: false, reason: "shape" });
  assert.deepEqual(await verifyEvent(signEvent(a.id, 5, "open", NOW, open, a.key), ctx({ publicKey: "bad" })), { ok: false, reason: "signature" });
});
