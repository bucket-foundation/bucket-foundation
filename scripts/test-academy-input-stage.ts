import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeState } from "../src/lib/academy/engine";
import { parseProps } from "../src/lib/academy/events";
import { addSeen, chooseUnit, dueLemmas, EMPTY_VIEWING, exposureRows, reveal, inputSlot, inputStageOn, learnerFromState, PLACEHOLDER_INPUT_SHARE, toggleTap } from "../src/lib/academy/input-stage";
import { parseBundle } from "../src/lib/academy/input-selector";
import { logExposure, openShared, type MemoryIO } from "../src/lib/academy/lang-memory-store";
import { createSystem } from "../src/lib/academy/lang-systems";
import type { LangRow } from "../src/lib/academy/lang-memory";
import { parseLogRow, type LogRow } from "../src/lib/academy/learn-log";

const bundle = parseBundle(JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/polingual-input/es.json"), "utf8")))!;
const T0 = Date.UTC(2026, 10, 20, 12);

test("the stage is on in dev, off in production unless the flag says 1, and 0 turns it off", () => {
  assert.equal(inputStageOn(undefined, "development"), true);
  assert.equal(inputStageOn(undefined, "production"), false);
  assert.equal(inputStageOn("1", "production"), true);
  assert.equal(inputStageOn("0", "development"), false);
});

test("the stage sits at the placeholder 0.3 share and never after the last card", () => {
  assert.equal(PLACEHOLDER_INPUT_SHARE, 0.3);
  assert.equal(inputSlot(10), 7);
  assert.equal(inputSlot(1), 0);
  for (let n = 1; n < 50; n++) assert.ok(inputSlot(n) >= 0 && inputSlot(n) < n);
});

const allKnownBut = (unknown: Set<string>) => {
  const resolve = (_l: string, lemma: string) => `es:${lemma}`;
  const state = normalizeState(null);
  for (const i of bundle.items) for (const t of i.tokens) if (!unknown.has(t.lemma)) state.cards[`es:${t.lemma}`] = { state: "review", stability: 50, difficulty: 5, lastReview: T0 - 86_400_000, due: T0 + 30 * 86_400_000, reps: 3, lapses: 0 };
  return { state, resolve };
};

test("the stage picks a sentence set or an episode from the selector", () => {
  const { state, resolve } = allKnownBut(new Set(["mi", "casa"]));
  const choice = chooseUnit(bundle, learnerFromState(state, "es", resolve, T0, 0, dueLemmas(bundle, state, "es", resolve, T0)));
  assert.ok(choice);
  assert.ok(choice!.items.length > 0);
  assert.ok(bundle.units.some((u) => u.id === choice!.unit.id));
  assert.ok(choice!.plan.tokens >= 40);
});

test("taps ride inside the exposure rows and every row passes the server validator", () => {
  const { state, resolve } = allKnownBut(new Set(["mi"]));
  const choice = chooseUnit(bundle, learnerFromState(state, "es", resolve, T0, 0, new Set()))!;
  const first = choice.items[0];
  let taps = toggleTap({ taps: {} }, first.id, first.tokens[0].lemma);
  taps = toggleTap(taps, first.id, first.tokens[1].lemma);
  taps = toggleTap(taps, first.id, first.tokens[1].lemma);
  const all = choice.items.map((i) => i.id);
  const v = addSeen({ ...EMPTY_VIEWING, taps }, all, 95_000);
  const rows = exposureRows(choice, v, true);
  assert.equal(rows.length, choice.items.length);
  assert.deepEqual(rows[0].taps, [first.tokens[0].lemma]);
  assert.ok(rows.slice(1).every((r) => r.taps.length === 0));
  assert.ok(Math.abs(rows.reduce((s, r) => s + r.seconds, 0) - 95) <= rows.length);
  for (const r of rows) assert.equal(parseProps("exposure", r).ok, true, JSON.stringify(r).slice(0, 120));
  assert.ok(exposureRows(choice, addSeen(v, all, 99_999_000), false).every((r) => r.seconds <= 3600 && r.completed === false));
});

test("only sentences on screen count as seen, with their measured seconds", () => {
  const { state, resolve } = allKnownBut(new Set(["mi"]));
  const choice = chooseUnit(bundle, learnerFromState(state, "es", resolve, T0, 0, new Set()))!;
  const [a, b] = choice.items;
  let v = addSeen(EMPTY_VIEWING, [a.id], 4000);
  v = addSeen(v, [a.id, b.id], 6000);
  const rows = exposureRows(choice, v, true);
  assert.deepEqual(rows.map((r) => [r.item, r.seconds]), [[a.id, 7], [b.id, 3]]);
  assert.deepEqual(exposureRows(choice, EMPTY_VIEWING, false), [], "a skip before anything shows logs nothing");
});

test("translations start hidden and a reveal is logged on that sentence's row", () => {
  const { state, resolve } = allKnownBut(new Set(["mi"]));
  const choice = chooseUnit(bundle, learnerFromState(state, "es", resolve, T0, 0, new Set()))!;
  const all = choice.items.map((i) => i.id);
  assert.equal(EMPTY_VIEWING.revealed.size, 0);
  const v = reveal(addSeen(EMPTY_VIEWING, all, 10_000), all[1]);
  const rows = exposureRows(choice, v, true);
  assert.deepEqual(rows.map((r) => r.revealed), all.map((id) => id === all[1]));
  assert.equal(parseProps("exposure", { ...rows[0], revealed: "yes" }).ok, false);
  const parsed = parseLogRow({ ...rows[1], kind: "exposure", review_id: "r", reviewed_at: 1, device_id: "d", tz: "UTC", system_id: "s", lang: "es" });
  assert.equal(parsed?.kind === "exposure" && parsed.revealed, true);
});

class IO implements MemoryIO {
  local = new Map<string, unknown>();
  pending: LogRow[] = [];
  n = 0;
  async pull() {
    return {};
  }
  readRaw(b: string) {
    return this.local.get(b) ?? null;
  }
  writeRaw(b: string, d: unknown) {
    this.local.set(b, JSON.parse(JSON.stringify(d)));
  }
  async push() {
    return true;
  }
  readOutbox(): LangRow[] {
    return [];
  }
  writeOutbox() {}
  readPending() {
    return [...this.pending];
  }
  writePending(rows: LogRow[]) {
    this.pending = rows;
  }
  uuid() {
    return `00000000-0000-4000-8000-${String(++this.n).padStart(12, "0")}`;
  }
  deviceId() {
    return "d-0000000000000000";
  }
  tz() {
    return "UTC";
  }
  now() {
    return T0;
  }
}

test("completing the stage writes one exposure row per item into the log and the session batch", async () => {
  const { state, resolve } = allKnownBut(new Set(["mi"]));
  const choice = chooseUnit(bundle, learnerFromState(state, "es", resolve, T0, 0, new Set()))!;
  const io = new IO();
  const sys = createSystem("en", ["es"], [], T0);
  let s = await openShared(io, sys, [sys], null);
  const v = addSeen({ ...EMPTY_VIEWING, taps: toggleTap({ taps: {} }, choice.items[0].id, choice.items[0].tokens[0].lemma) }, choice.items.map((i) => i.id), 60_000);
  const rows = exposureRows(choice, v, true);
  for (const r of rows) s = logExposure(io, s, "es", r).session;
  const log = s.memories.es.log.filter((r) => r.kind === "exposure");
  assert.equal(log.length, rows.length);
  assert.equal(io.pending.length, rows.length);
  assert.ok(log.every((r) => r.kind === "exposure" && r.unit === choice.unit.id));
});
