import { test } from "node:test";
import assert from "node:assert/strict";
import { applyReward, comboMultiplier, EMPTY_REWARD, touchStreak } from "./reward";

test("hits build a combo and multiply xp up to five", () => {
  let s = EMPTY_REWARD;
  const gains: number[] = [];
  for (let i = 0; i < 7; i++) {
    const step = applyReward(s, "hit", "2026-11-22");
    gains.push(step.gained);
    s = step.state;
  }
  assert.deepEqual(gains, [10, 20, 30, 40, 50, 50, 50]);
  assert.equal(s.best, 7);
  assert.equal(comboMultiplier(0), 1);
});

test("a miss resets the combo and keeps xp", () => {
  const s = applyReward(applyReward(EMPTY_REWARD, "hit", "2026-11-22").state, "miss", "2026-11-22").state;
  assert.equal(s.combo, 0);
  assert.equal(s.xp, 10);
});

test("streak grows on consecutive days and restarts after a gap", () => {
  let s = touchStreak(EMPTY_REWARD, "2026-11-20");
  s = touchStreak(s, "2026-11-21");
  s = touchStreak(s, "2026-11-21");
  assert.equal(s.streak, 2);
  s = touchStreak(s, "2026-11-24");
  assert.equal(s.streak, 1);
  assert.equal(touchStreak({ ...EMPTY_REWARD, streak: 4, lastDay: "2026-11-30" }, "2026-12-01").streak, 5);
});

test("saved words and round ends pay xp", () => {
  assert.equal(applyReward(EMPTY_REWARD, "save", "2026-11-22").gained, 5);
  assert.equal(applyReward(EMPTY_REWARD, "round-end", "2026-11-22").gained, 25);
});
