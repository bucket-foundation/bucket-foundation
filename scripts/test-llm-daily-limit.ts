import test from "node:test";
import assert from "node:assert/strict";
import { capsFor, checkDailyLimits, envCap, memoryLimiter, secondsUntilUtcMidnight, type DailyLimiter } from "../src/lib/llm/daily-limit";

test("seconds until UTC midnight", () => {
  assert.equal(secondsUntilUtcMidnight(new Date("2026-09-23T23:59:30Z")), 30);
  assert.equal(secondsUntilUtcMidnight(new Date("2026-09-23T00:00:00Z")), 86_400);
});

test("caps read the environment and fall back on bad values", () => {
  delete process.env.ACADEMY_TUTOR_DAILY_CAP;
  delete process.env.RESEARCH_AGENT_DAILY_CAP;
  delete process.env.LLM_GLOBAL_DAILY_CAP;
  assert.deepEqual(capsFor("tutor"), { user: 60, global: 2000 });
  assert.deepEqual(capsFor("agent"), { user: 10, global: 2000 });
  process.env.ACADEMY_TUTOR_DAILY_CAP = "5";
  process.env.LLM_GLOBAL_DAILY_CAP = "-3";
  assert.deepEqual(capsFor("tutor"), { user: 5, global: 2000 });
  process.env.X_CAP = "abc";
  assert.equal(envCap("X_CAP", 7), 7);
  delete process.env.ACADEMY_TUTOR_DAILY_CAP;
  delete process.env.LLM_GLOBAL_DAILY_CAP;
});

test("the memory limiter counts per subject, route and UTC day", async () => {
  const l = memoryLimiter();
  const day1 = new Date("2026-09-23T10:00:00Z");
  assert.equal(await l.hit("u", "tutor", day1), 1);
  assert.equal(await l.hit("u", "tutor", day1), 2);
  assert.equal(await l.hit("u", "agent", day1), 1);
  assert.equal(await l.hit("v", "tutor", day1), 1);
  assert.equal(await l.hit("u", "tutor", new Date("2026-09-24T00:00:01Z")), 1);
});

test("a refused user never touches the global counter", async () => {
  const seen: string[] = [];
  const inner = memoryLimiter();
  const l: DailyLimiter = { hit: (s, r, n) => (seen.push(`${r}:${s}`), inner.hit(s, r, n)) };
  const now = new Date("2026-09-23T10:00:00Z");
  assert.equal((await checkDailyLimits(l, "u", "tutor", { user: 1, global: 10 }, now)).allowed, true);
  const refused = await checkDailyLimits(l, "u", "tutor", { user: 1, global: 10 }, now);
  assert.deepEqual(refused, { allowed: false, scope: "user", cap: 1, retryAfterSeconds: 14 * 3600 });
  assert.deepEqual(seen, ["tutor:u", "all:global", "tutor:u"]);
});
