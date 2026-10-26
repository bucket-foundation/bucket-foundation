import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKey, normalizeState } from "@academy/engine";
import { DAY_MS } from "@academy/fsrs";
import { liveStreak, streakCard } from "./streak";

const NOW = new Date(2027, 2, 10, 12).getTime();
const st = (streak: number, daysAgo: number | null) => {
  const s = normalizeState(null);
  s.stats.streak = streak;
  s.stats.lastStudyDay = daysAgo === null ? null : dayKey(NOW - daysAgo * DAY_MS);
  return s;
};

test("liveStreak holds through yesterday and resets after a missed day", () => {
  assert.deepEqual(liveStreak(st(5, 0).stats, NOW), { streak: 5, studiedToday: true });
  assert.deepEqual(liveStreak(st(5, 1).stats, NOW), { streak: 5, studiedToday: false });
  assert.deepEqual(liveStreak(st(5, 2).stats, NOW), { streak: 0, studiedToday: false });
  assert.deepEqual(liveStreak(st(0, null).stats, NOW), { streak: 0, studiedToday: false });
});

test("streakCard reads Day N of 100 from the best live system and caps at 100", () => {
  assert.equal(streakCard([], NOW).label, "Day 0 of 100");
  const c = streakCard([st(3, 1), st(12, 0), st(40, 3)], NOW);
  assert.equal(c.label, "Day 12 of 100");
  assert.equal(c.studiedToday, true);
  const done = streakCard([st(130, 0)], NOW);
  assert.equal(done.label, "Day 100 of 100");
  assert.equal(done.complete, true);
});
