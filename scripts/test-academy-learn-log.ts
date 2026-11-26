import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { batchEvents, deviceHash, isReview, parseLogRow, replaySummary, shareable, takeBatch, type BatchEvent, type BatchReply, type LogRow, type UploadGate } from "../src/lib/academy/learn-log";
import { flushSession, gradeShared, logExposure, logSession, openShared, type MemoryIO } from "../src/lib/academy/lang-memory-store";
import { langBranch, normalizeMemory, sharedMemoryOn, type LangRow } from "../src/lib/academy/lang-memory";
import { createSystem, type LangSystem } from "../src/lib/academy/lang-systems";
import type { ServerBranches } from "../src/lib/academy/progress-store";

const ROOT = path.join(__dirname, "..");
const VECTORS = JSON.parse(fs.readFileSync(path.join(ROOT, "src/lib/academy/review-log-vectors.json"), "utf8")) as { cases: { name: string; rows: unknown[]; expect: unknown }[]; deviceHash: { salt: string; device: string; hash: string }[] };
const T0 = Date.UTC(2026, 10, 1, 12);

test("golden: device ids hash with the install salt", () => {
  for (const v of VECTORS.deviceHash) assert.equal(deviceHash(v.salt, v.device), v.hash);
});

for (const c of VECTORS.cases) {
  test(`golden: ${c.name}`, () => {
    assert.deepEqual(replaySummary(c.rows), c.expect);
  });
}

class IO implements MemoryIO {
  local = new Map<string, unknown>();
  server = new Map<string, unknown>();
  outbox: LangRow[] = [];
  pending: LogRow[] = [];
  gate: UploadGate = { state: "unknown", at: 0 };
  posts: BatchEvent[][] = [];
  replies: BatchReply[] = [];
  appended: string[] = [];
  clock = T0;
  n = 0;
  async pull(): Promise<ServerBranches> {
    return Object.fromEntries(Array.from(this.server.entries()).map(([k, v]) => [k, { data: JSON.parse(JSON.stringify(v)), updated_at: "" }]));
  }
  readRaw(b: string) {
    const v = this.local.get(b);
    return v === undefined ? null : JSON.parse(JSON.stringify(v));
  }
  writeRaw(b: string, d: unknown) {
    this.local.set(b, JSON.parse(JSON.stringify(d)));
  }
  async push(b: string, d: unknown) {
    this.server.set(b, JSON.parse(JSON.stringify(d)));
    return true;
  }
  readOutbox() {
    return [...this.outbox];
  }
  writeOutbox(rows: LangRow[]) {
    this.outbox = [...rows];
  }
  readGate() {
    return this.gate;
  }
  writeGate(g: UploadGate) {
    this.gate = g;
  }
  readPending() {
    return [...this.pending];
  }
  writePending(rows: LogRow[]) {
    this.pending = [...rows];
  }
  async postBatch(events: BatchEvent[]): Promise<BatchReply> {
    this.posts.push(events);
    return this.replies.shift() ?? { outcome: "recorded", limited: [] };
  }
  appendReview(_b: string, r: { review_id: string }) {
    this.appended.push(r.review_id);
  }
  uuid() {
    return `00000000-0000-4000-8000-${String(++this.n).padStart(12, "0")}`;
  }
  deviceId() {
    return "dev-a";
  }
  tz() {
    return "UTC";
  }
  now() {
    return this.clock;
  }
}

const EXPOSURE = { item: "tatoeba:1", unit: "set:es:1", lemmas_seen: ["casa"], taps: ["casa"], seconds: 30, coverage_pred: 0.95, completed: true };
const SESSION = { id: "s-1", started: T0, ended: T0 + 600_000, share_target: null, share_real: null, arm: null, units: null, cards: 2 };
const reply = (outcome: BatchReply["outcome"], limited: string[] = []): BatchReply => ({ outcome, limited });
const settle = () => new Promise((r) => setTimeout(r, 0));

async function session(io: IO) {
  const system: LangSystem = createSystem("en", ["es"], [], T0);
  return openShared(io, system, [system]);
}

test("the shared log is on by default", () => {
  assert.equal(sharedMemoryOn(undefined), true);
  assert.equal(sharedMemoryOn("0"), false);
});

test("a graded review row carries elapsedDays, S_before, S_after and D", async () => {
  const io = new IO();
  let s = await session(io);
  const id = "w1";
  s = gradeShared(io, s, "es", id, 3).session;
  io.clock += 3 * 86_400_000;
  const g = gradeShared(io, s, "es", id, 3);
  await g.saved;
  const rows = g.session.memories.es.log.filter(isReview);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].S_before, 0);
  assert.equal(rows[1].elapsedDays, 3);
  assert.equal(rows[1].S_before, rows[0].S_after);
  assert.ok((rows[1].S_after ?? 0) > (rows[0].S_after ?? 0));
  assert.ok(typeof rows[1].D === "number");
});

test("a session sends its exposures and mix in one batch and the rows replay as no-ops", async () => {
  const io = new IO();
  let s = await session(io);
  const before = JSON.stringify(s.view);
  s = logExposure(io, s, "es", EXPOSURE).session;
  s = logExposure(io, s, "es", { ...EXPOSURE, item: "tatoeba:2" }).session;
  s = logSession(io, s, "es", SESSION).session;
  assert.deepEqual(io.posts.map((p) => p.length), [0], "only the open-time gate probe before the session ends");
  assert.equal(await flushSession(io), "sent");
  assert.equal(io.posts.length, 2);
  assert.deepEqual(io.posts[1].map((e) => e.name), ["exposure", "exposure", "session_mix"]);
  const mix = io.posts[1][2].props as Record<string, unknown>;
  assert.deepEqual([mix.share_target, mix.share_real, mix.arm, mix.units, mix.cards, mix.seconds], [null, null, null, null, 2, 600]);
  assert.equal(io.pending.length, 0);
  assert.equal(JSON.stringify(s.view), before);
  assert.equal(s.memories.es.log.length, 3);
  assert.equal(io.gate.state, "open");
});

test("under_age or no_consent uploads nothing, review rows included, and replays locally", async () => {
  for (const outcome of ["under_age", "no_consent"] as const) {
    const io = new IO();
    io.replies = [reply(outcome)];
    let s = await session(io);
    assert.equal(io.gate.state, "closed");
    const g = gradeShared(io, s, "es", "w1", 3);
    s = g.session;
    await g.saved;
    s = logExposure(io, s, "es", EXPOSURE).session;
    s = logSession(io, s, "es", SESSION).session;
    await settle();
    assert.equal(await flushSession(io), "replay_only");
    assert.deepEqual(io.posts.map((p) => p.length), [0], "only the gate probe went out");
    assert.equal(io.server.size, 0, "no branch pushed");
    assert.deepEqual(io.appended, [], "no review row appended upstream");
    assert.deepEqual([io.outbox.length, io.pending.length], [0, 0]);
    const local = normalizeMemory("es", io.local.get(langBranch("es")));
    assert.equal(local.log.length, 3);
    assert.equal(s.view.cards["es:w1"]?.reps, 1, "local replay still schedules the card");
  }
});

test("a closed gate is probed again after a day with an empty batch", async () => {
  const io = new IO();
  io.gate = { state: "closed", at: T0 - 2 * 86_400_000 };
  io.replies = [reply("under_age")];
  await session(io);
  assert.deepEqual(io.posts.map((p) => p.length), [0]);
  assert.equal(io.gate.at, T0);
  assert.equal(await flushSession(io), "replay_only");
  assert.equal(io.posts.length, 1);
});

test("a failed post keeps the batch for the next session", async () => {
  const io = new IO();
  const s = await session(io);
  io.replies = [reply("retry")];
  logExposure(io, s, "es", EXPOSURE);
  assert.equal(await flushSession(io), "held");
  assert.equal(io.pending.length, 1);
  assert.equal(await flushSession(io), "sent");
  assert.equal(io.pending.length, 0);
});

test("rate limited rows stay queued until the next UTC day", async () => {
  const io = new IO();
  let s = await session(io);
  s = logExposure(io, s, "es", EXPOSURE).session;
  s = logExposure(io, s, "es", { ...EXPOSURE, item: "tatoeba:2" }).session;
  const limitedId = io.pending[1].review_id;
  io.replies = [reply("recorded", [limitedId])];
  assert.equal(await flushSession(io), "held");
  assert.deepEqual(io.pending.map((r) => r.review_id), [limitedId]);
  assert.equal(await flushSession(io), "held");
  assert.equal(io.posts.length, 2, "no resend the same day");
  io.clock = Date.UTC(2026, 10, 2, 0, 1);
  assert.equal(await flushSession(io), "sent");
  assert.deepEqual(io.posts[2].map((e) => e.id), [limitedId]);
});

test("one request never carries more exposures than the daily cap", async () => {
  const io = new IO();
  let s = await session(io);
  for (let i = 0; i < 350; i++) s = logExposure(io, s, "es", { ...EXPOSURE, item: `tatoeba:${i}` }).session;
  s = logSession(io, s, "es", SESSION).session;
  assert.equal(await flushSession(io), "sent");
  const sent = io.posts[1];
  assert.equal(sent.filter((e) => e.name === "exposure").length, 300);
  assert.equal(sent.filter((e) => e.name === "session_mix").length, 1);
  assert.equal(io.pending.length, 50);
  assert.equal(takeBatch(io.pending).send.length, 50);
});

test("shareable strips non-review rows until the gate opens, and batchEvents skips reviews", () => {
  const rows = VECTORS.cases[1].rows.map(parseLogRow).filter((r): r is LogRow => r !== null);
  assert.equal(shareable(rows, { state: "unknown", at: 0 }).length, 1);
  assert.equal(shareable(rows, { state: "closed", at: 0 }).length, 0);
  assert.equal(shareable(rows, { state: "open", at: 0 }).length, 4);
  assert.deepEqual(batchEvents(rows).map((e) => e.name), ["exposure", "exposure", "session_mix"]);
});

test("a vocab test row parses, batches, and rejects impossible counts", () => {
  const raw = { kind: "vocab_test", review_id: "v1", reviewed_at: 5, device_id: "d", tz: "UTC", system_id: "s", lang: "es", phase: "day28", form: "B", arm: "s70", hits: 40, words: 50, false_alarms: 2, pseudowords: 20, known: 6222.2, day: 30, seconds: 140 };
  const row = parseLogRow(raw);
  assert.ok(row && row.kind === "vocab_test");
  assert.deepEqual(batchEvents([row!]), [{ id: "v1", name: "vocab_test", props: { phase: "day28", form: "B", arm: "s70", hits: 40, words: 50, false_alarms: 2, pseudowords: 20, known: 6222.2, day: 30, seconds: 140 } }]);
  assert.equal(parseLogRow({ ...raw, hits: 51 }), null);
  assert.equal(parseLogRow({ ...raw, phase: "day7" }), null);
  assert.equal(parseLogRow({ ...raw, arm: "S70!" }), null);
});
