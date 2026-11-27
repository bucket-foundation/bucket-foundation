import { test } from "node:test";
import assert from "node:assert/strict";
import { basePoints, claimOpen, cohortFor, COHORT_SIZE, familyJoinAllowed, leagueAllowed, nextTier, previousWeekId, ranked, weekOf } from "@academy/league";
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

test("league pays base points only, so a slow-round window adds nothing", () => {
  assert.equal(basePoints([{ correct: true }, { correct: false }, { correct: true }]), 200);
});

test("claims open only after the game ends with two or more humans", () => {
  const start = Date.parse("2026-11-27T20:00:00Z");
  const lobby = { status: "playing" as const, started_at: new Date(start).toISOString(), rounds: 3, round_seconds: 10, reveal_seconds: 0 };
  assert.equal(claimOpen(lobby, 2, start + 5_000), false);
  assert.equal(claimOpen(lobby, 2, start + 120_000), true);
  assert.equal(claimOpen(lobby, 1, start + 120_000), false);
  assert.equal(claimOpen({ ...lobby, status: "done" }, 3, start), true);
});

test("under-13 accounts cannot join a family group", () => {
  assert.equal(familyJoinAllowed("family", "under13"), false);
  assert.equal(familyJoinAllowed("family", "13to17"), true);
  assert.equal(familyJoinAllowed("family", null), false);
  assert.equal(familyJoinAllowed("friends", "under13"), true);
});

test("only 13+ accounts join leagues", () => {
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
