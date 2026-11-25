import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { batchEvents, isReview, parseLogRow, replaySummary, shareable, type BatchEvent, type GateReply, type LogRow, type UploadGate } from "../src/lib/academy/learn-log";
import { flushSession, gradeShared, logExposure, logSession, openShared, type MemoryIO } from "../src/lib/academy/lang-memory-store";
import { langBranch, normalizeMemory, sharedMemoryOn, type LangRow } from "../src/lib/academy/lang-memory";
import { createSystem, type LangSystem } from "../src/lib/academy/lang-systems";
import type { ServerBranches } from "../src/lib/academy/progress-store";

const ROOT = path.join(__dirname, "..");
const VECTORS = JSON.parse(fs.readFileSync(path.join(ROOT, "src/lib/academy/review-log-vectors.json"), "utf8")) as { cases: { name: string; rows: unknown[]; expect: unknown }[] };
const T0 = Date.UTC(2026, 10, 1, 12);

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
  replies: GateReply[] = [];
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
  async postBatch(events: BatchEvent[]) {
    this.posts.push(events);
    return this.replies.shift() ?? "recorded";
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
const SESSION = { id: "s-1", started: T0, ended: T0 + 600_000, share_target: 0.7, share_real: 0.66, arm: "share70", units: 1, cards: 2 };

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
  assert.equal(io.posts.length, 0, "no request per row");
  assert.equal(await flushSession(io), "sent");
  assert.equal(io.posts.length, 1);
  assert.deepEqual(io.posts[0].map((e) => e.name), ["exposure", "exposure", "session_mix"]);
  assert.equal(io.pending.length, 0);
  assert.equal(JSON.stringify(s.view), before);
  assert.equal(s.memories.es.log.length, 3);
  assert.equal(io.gate.state, "open");
});

test("under_age or no_consent keeps the log local and replay-only", async () => {
  for (const reply of ["under_age", "no_consent"] as const) {
    const io = new IO();
    io.replies = [reply];
    let s = await session(io);
    s = logExposure(io, s, "es", EXPOSURE).session;
    s = logSession(io, s, "es", SESSION).session;
    assert.equal(await flushSession(io), "replay_only");
    assert.equal(io.gate.state, "closed");
    assert.equal(io.pending.length, 0);
    s = logExposure(io, s, "es", EXPOSURE).session;
    s = gradeShared(io, s, "es", "w1", 3).session;
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(await flushSession(io), "replay_only");
    assert.equal(io.posts.length, 1, "the closed gate sends nothing more the same day");
    const local = normalizeMemory("es", io.local.get(langBranch("es")));
    assert.equal(local.log.filter((r) => !isReview(r)).length, 3);
    const pushed = normalizeMemory("es", io.server.get(langBranch("es")));
    assert.equal(pushed.log.filter((r) => !isReview(r)).length, 0, "exposure and session rows never leave the device");
  }
});

test("a closed gate is probed with an empty batch after a day", async () => {
  const io = new IO();
  io.gate = { state: "closed", at: T0 - 2 * 86_400_000 };
  io.replies = ["under_age"];
  let s = await session(io);
  s = logExposure(io, s, "es", EXPOSURE).session;
  assert.equal(await flushSession(io), "replay_only");
  assert.deepEqual(io.posts, [[]]);
});

test("a failed post keeps the batch for the next session", async () => {
  const io = new IO();
  io.replies = ["retry"];
  const s = await session(io);
  logExposure(io, s, "es", EXPOSURE);
  assert.equal(await flushSession(io), "held");
  assert.equal(io.pending.length, 1);
  assert.equal(await flushSession(io), "sent");
  assert.equal(io.pending.length, 0);
});

test("shareable strips non-review rows until the gate opens, and batchEvents skips reviews", () => {
  const rows = VECTORS.cases[1].rows.map(parseLogRow).filter((r): r is LogRow => r !== null);
  assert.equal(shareable(rows, { state: "unknown", at: 0 }).length, 1);
  assert.equal(shareable(rows, { state: "open", at: 0 }).length, 4);
  assert.deepEqual(batchEvents(rows).map((e) => e.name), ["exposure", "exposure", "session_mix"]);
});
