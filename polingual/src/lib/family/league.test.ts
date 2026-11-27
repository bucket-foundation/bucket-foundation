import { test } from "node:test";
import assert from "node:assert/strict";
import { capped, cohortFor, COHORT_SIZE, DAILY_CAP, leagueAllowed, nextTier, previousWeekId, ranked, weekOf } from "@academy/league";
import { leagueEligible, nearMe } from "./league";

test("weeks start on Monday UTC and step back by seven days", () => {
  const w = weekOf(Date.parse("2026-11-29T23:00:00Z"));
  assert.equal(w.id, "2026-11-23");
  assert.equal(w.endsAt, "2026-11-30T00:00:00.000Z");
  assert.equal(previousWeekId("2026-11-23"), "2026-11-16");
});

test("top 7 promote, bottom 5 demote, tier 1 holds and tier 8 caps", () => {
  assert.equal(nextTier(null), 1);
  assert.equal(nextTier({ tier: 3, rank: 7, size: 30 }), 4);
  assert.equal(nextTier({ tier: 3, rank: 26, size: 30 }), 2);
  assert.equal(nextTier({ tier: 3, rank: 15, size: 30 }), 3);
  assert.equal(nextTier({ tier: 1, rank: 30, size: 30 }), 1);
  assert.equal(nextTier({ tier: 8, rank: 1, size: 30 }), 8);
  assert.equal(nextTier({ tier: 2, rank: 1, size: 3 }), 2);
});

test("cohorts fill to 30 before opening the next", () => {
  assert.equal(cohortFor(new Map()), 0);
  assert.equal(cohortFor(new Map([[0, COHORT_SIZE], [1, 4]])), 1);
  assert.equal(cohortFor(new Map([[0, COHORT_SIZE], [1, COHORT_SIZE]])), 2);
});

test("league points cap at 1,500 a day and only 13+ accounts join", () => {
  assert.equal(capped(900, 0), 900);
  assert.equal(capped(900, 1000), DAILY_CAP - 1000);
  assert.equal(capped(900, 2000), 0);
  assert.equal(leagueAllowed("13to17"), true);
  assert.equal(leagueAllowed("under13"), false);
  assert.equal(leagueAllowed(null), false);
  assert.equal(leagueEligible("under13", true), false);
  assert.equal(leagueEligible("teen", false), false);
  assert.equal(leagueEligible("adult", true), true);
});

test("board ranks by points and shows the rows near me", () => {
  assert.deepEqual(ranked([{ user_id: "b", points: 1 }, { user_id: "a", points: 5 }]).map((r) => r.user_id), ["a", "b"]);
  const board = Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, name: `P${i}`, points: 100 - i, me: i === 6 }));
  assert.deepEqual(nearMe(board).map((r) => r.rank), [5, 6, 7, 8, 9]);
});
