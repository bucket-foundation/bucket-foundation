import { test } from "node:test";
import assert from "node:assert/strict";
import { answeredShare, boardStates, hostError, nextTeamSlot, roomRequest, toggledTarget } from "./host";

test("host room request carries teams only in chorus", () => {
  const base = { home: "en", targets: ["es"], school: false, teamCount: 3 };
  assert.deepEqual(roomRequest({ ...base, mode: "open_floor" }), { product: "polingual", settings: { home: "en", targets: ["es"] }, school_mode: false, mode: "open_floor" });
  assert.equal(roomRequest({ ...base, mode: "chorus" }).teams, 3);
});

test("host helpers", () => {
  assert.equal(hostError("offline"), "Live rooms are offline right now.");
  assert.equal(hostError("weird"), "The room did not open. Try again.");
  assert.deepEqual(toggledTarget(["es"], "es"), []);
  assert.deepEqual(toggledTarget(["es"], "fr"), ["es", "fr"]);
  assert.equal(toggledTarget(Array.from({ length: 12 }, (_, i) => `l${i}`), "fr").length, 12);
  assert.equal(answeredShare(3, 4), 75);
  assert.equal(answeredShare(3, 0), 0);
  assert.deepEqual(boardStates(true, 1), ["dim", "right", "dim", "dim"]);
  assert.deepEqual(boardStates(false, 1), ["idle", "idle", "idle", "idle"]);
  assert.equal(nextTeamSlot(1, 2), 0);
  assert.equal(nextTeamSlot(null, 3), 1);
});

test("phone helpers live in lib", async () => {
  const { announce, resultText, sfxBuzz, refetchDelay, roundSeconds } = await import("./phone");
  assert.equal(announce(5, false), "5 seconds left.");
  assert.equal(resultText(1, true, 30, 2), "Right. 30 points, place 2.");
  assert.equal(resultText(null, false, 0, null), "No answer this time. 0 points.");
  assert.deepEqual(sfxBuzz("right"), [40, 60, 40]);
  assert.equal(refetchDelay("reveal", () => 0.5), 0);
  assert.equal(roundSeconds({ opens_at: null, closes_at: null }), 20);
});
