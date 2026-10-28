import { expect, test } from "bun:test";
import { dayKey } from "../../../src/lib/academy/engine";
import { liveStreak } from "../src/core/learn";

const DAY = 86_400_000;
const now = new Date(2026, 9, 21, 12).getTime();

test("a deck studied today or yesterday keeps its streak", () => {
  expect(liveStreak({ streak: 4, lastStudyDay: dayKey(now) }, now)).toBe(4);
  expect(liveStreak({ streak: 4, lastStudyDay: dayKey(now - DAY) }, now)).toBe(4);
});

test("an idle deck shows no streak", () => {
  expect(liveStreak({ streak: 9, lastStudyDay: dayKey(now - 2 * DAY) }, now)).toBe(0);
  expect(liveStreak({ streak: 9, lastStudyDay: null }, now)).toBe(0);
  expect(liveStreak({}, now)).toBe(0);
});
