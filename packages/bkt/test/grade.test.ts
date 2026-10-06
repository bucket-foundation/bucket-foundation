import { describe, expect, test } from "bun:test";
import { GRACE_MS, buildQuestion, gradeChoice, isDue, limitFor, schedule, selfRating, type Item } from "../src/grade";
import { isSubsequence, matchCommands } from "../src/app";

const item = (id: string, branch: string, answer: string): Item => ({
  id,
  atomId: id,
  branch,
  title: id,
  level: "recall",
  prompt: `prompt ${id}`,
  answer,
});

const pool = [item("a", "physics", "A"), item("b", "physics", "B"), item("c", "physics", "C"), item("d", "physics", "D"), item("e", "math", "E")];

describe("buildQuestion", () => {
  test("has the answer once and two same-branch distractors", () => {
    const q = buildQuestion(pool[0], pool, "s1");
    expect(q.choices).toHaveLength(3);
    expect(q.choices[q.answerIndex]).toBe("A");
    expect(q.choices.filter((c) => c === "A")).toHaveLength(1);
    expect(q.choices).not.toContain("E");
  });

  test("is deterministic per seed", () => {
    expect(buildQuestion(pool[0], pool, "s1")).toEqual(buildQuestion(pool[0], pool, "s1"));
  });

  test("falls back to other branches when a branch is short", () => {
    const q = buildQuestion(pool[4], pool, "s2");
    expect(q.choices).toHaveLength(3);
    expect(q.choices[q.answerIndex]).toBe("E");
  });

  test("drops duplicate answers from distractors", () => {
    const dup = [item("x", "p", "same"), item("y", "p", "same"), item("z", "p", "other")];
    const q = buildQuestion(dup[0], dup, "s");
    expect(q.choices.sort()).toEqual(["other", "same"]);
  });

  test("time limit stays within 20 to 90 seconds", () => {
    expect(limitFor({ prompt: "x", answer: "y" })).toBe(20);
    expect(limitFor({ prompt: "w ".repeat(500), answer: "y" })).toBe(90);
  });
});

describe("gradeChoice", () => {
  const q = { answerIndex: 2, limitSec: 30, choices: ["a", "b", "c", "d"] };

  test("fast correct answer rates easy", () => {
    expect(gradeChoice(q, 2, 5_000)).toEqual({ correct: true, timedOut: false, rating: 4 });
  });

  test("slow correct answer rates good", () => {
    expect(gradeChoice(q, 2, 25_000)).toEqual({ correct: true, timedOut: false, rating: 3 });
  });

  test("wrong answer rates again", () => {
    expect(gradeChoice(q, 1, 5_000)).toEqual({ correct: false, timedOut: false, rating: 1 });
  });

  test("answer inside the grace window still counts", () => {
    expect(gradeChoice(q, 2, 30_000 + GRACE_MS).correct).toBe(true);
  });

  test("answer past the grace window times out", () => {
    expect(gradeChoice(q, 2, 30_001 + GRACE_MS)).toEqual({ correct: false, timedOut: true, rating: 1 });
  });

  test("no answer at the limit times out", () => {
    expect(gradeChoice(q, null, 30_000).timedOut).toBe(true);
  });

  test("out of range choice is wrong", () => {
    expect(gradeChoice(q, 9, 1_000).correct).toBe(false);
    expect(gradeChoice(q, -1, 1_000).correct).toBe(false);
    expect(gradeChoice(q, 1.5, 1_000).correct).toBe(false);
  });
});

describe("scheduling", () => {
  test("again schedules one day out and good schedules further", () => {
    const now = 1_000_000;
    const again = schedule(null, 1, now);
    const good = schedule(null, 3, now);
    expect(again.due).toBe(now + 86_400_000);
    expect(good.due!).toBeGreaterThan(again.due!);
    expect(isDue(good, now)).toBe(false);
    expect(isDue(good, good.due!)).toBe(true);
    expect(isDue(null, now)).toBe(true);
  });

  test("self rating keys map to FSRS ratings", () => {
    expect(["1", "2", "3", "4", "a", "h", "g", "e", "x"].map(selfRating)).toEqual([1, 2, 3, 4, 1, 2, 3, 4, null]);
  });
});

describe("palette", () => {
  test("fuzzy matches by subsequence", () => {
    expect(isSubsequence("rv", "review")).toBe(true);
    expect(isSubsequence("vr", "review")).toBe(false);
    expect(matchCommands("qz").map((c) => c.name)).toEqual(["quiz"]);
    expect(matchCommands("").length).toBeGreaterThan(3);
  });
});
