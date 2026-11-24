import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DAILY_BRANCH } from "./store";
import { dayKey } from "./rng";

const ROOT = join(process.cwd(), "..");
const GAMES = ["daily-set", "mini", "word-groups", "speed-match", "which-voice", "letter-sprint"];

test("iPhone and Android write the same daily book branch and game names as the web", () => {
  const swift = readFileSync(join(ROOT, "apple/BucketKit/Sources/BucketKit/Polingual/DailyBook.swift"), "utf8");
  const kotlin = readFileSync(join(ROOT, "android/polingual/src/main/kotlin/com/polingual/app/DailyBook.kt"), "utf8");
  for (const src of [swift, kotlin]) {
    assert.ok(src.includes(`"${DAILY_BRANCH}"`));
    assert.ok(src.includes('"polingual/daily/v1"'));
    for (const g of GAMES) assert.ok(src.includes(`"${g}"`), g);
  }
});

test("every platform keys the day as year-month-day without padding", () => {
  assert.equal(dayKey(0, new Date(2026, 0, 5)), "2026-1-5");
  const swift = readFileSync(join(ROOT, "apple/BucketKit/Sources/BucketKit/Polingual/Engine.swift"), "utf8");
  assert.match(swift, /return "\\\(c\.year!\)-\\\(c\.month!\)-\\\(c\.day!\)"/);
  const kotlin = readFileSync(join(ROOT, "android/polingual/src/main/kotlin/com/polingual/app/DailyBook.kt"), "utf8");
  assert.ok(kotlin.includes('"${date.year}-${date.monthValue}-${date.dayOfMonth}"'));
});
