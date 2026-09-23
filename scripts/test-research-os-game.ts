import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyTransition, badgesFor, levelFromXp, nextStreak, xpForTransition, xpToNextLevel } from "../src/lib/research-os/game";

test("xp accrues once per level crossed, never on a drop or a repeat", () => {
  assert.equal(xpForTransition(null, "access"), 2);
  assert.equal(xpForTransition("access", "awareness"), 10);
  assert.equal(xpForTransition("access", "understanding"), 35);
  assert.equal(xpForTransition("understanding", "understanding"), 0);
  assert.equal(xpForTransition("production", "awareness"), 0);
  assert.equal(xpForTransition(null, "production"), 187);
});

test("levels follow the 50 n (n-1) thresholds", () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(99), 1);
  assert.equal(levelFromXp(100), 2);
  assert.equal(levelFromXp(300), 3);
  assert.deepEqual(xpToNextLevel(120), { level: 2, into: 20, span: 200 });
});

test("streaks: same day holds, next day grows, a gap resets", () => {
  assert.deepEqual(nextStreak({ streakDays: 3, lastActiveDay: "2026-09-15" }, "2026-09-15"), { streakDays: 3, lastActiveDay: "2026-09-15" });
  assert.deepEqual(nextStreak({ streakDays: 3, lastActiveDay: "2026-09-14" }, "2026-09-15"), { streakDays: 4, lastActiveDay: "2026-09-15" });
  assert.deepEqual(nextStreak({ streakDays: 3, lastActiveDay: "2026-09-10" }, "2026-09-15"), { streakDays: 1, lastActiveDay: "2026-09-15" });
  assert.deepEqual(nextStreak({ streakDays: 0, lastActiveDay: null }, "2026-09-15"), { streakDays: 1, lastActiveDay: "2026-09-15" });
});

test("badges at internalization and production, once per node", () => {
  const now = new Date("2026-09-15T12:00:00Z");
  const first = badgesFor([], "n1", "understanding", "internalization", now);
  assert.deepEqual(first, [{ kind: "internalized", node_id: "n1", at: now.toISOString() }]);
  assert.deepEqual(badgesFor(first, "n1", "internalization", "internalization", now), []);
  const both = badgesFor([], "n2", "awareness", "production", now).map((b) => b.kind);
  assert.deepEqual(both, ["internalized", "produced"]);
  assert.deepEqual(badgesFor(first, "n1", "understanding", "production", now).map((b) => b.kind), ["produced"]);
});

test("applyTransition composes xp, streak, and badges", () => {
  const now = new Date("2026-09-15T12:00:00Z");
  const s0 = { xp: 90, streakDays: 2, lastActiveDay: "2026-09-14", badges: [] };
  const s1 = applyTransition(s0, "n1", "understanding", "internalization", now);
  assert.equal(s1.xp, 140);
  assert.equal(s1.streakDays, 3);
  assert.equal(s1.lastActiveDay, "2026-09-15");
  assert.equal(s1.badges.length, 1);
  const s2 = applyTransition(s1, "n1", "internalization", "internalization", now);
  assert.equal(s2.xp, 140, "no repeat xp");
  assert.equal(s2.badges.length, 1, "no repeat badge");
});
