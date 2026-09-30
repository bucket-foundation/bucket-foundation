import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey } from "../src/crypto";
import type { Item } from "../src/grade";
import { eligibleIds, freezeBank, reviewBank, reviewItem, type FrozenItem } from "../src/hai/bank";
import { loadSubmission, save } from "../src/hai/files";
import { aiVisible, displayOrder, malformedCount, pickPairs, retestDue, RETEST_MS, THINK_MS, type AiScores } from "../src/hai/probe";
import { batchRequests, estimateCost, MODEL, parseAnswer, selectForScoring } from "../src/hai/score";
import { ProbeRun, report } from "../src/hai/session";
import { bootstrapPairs, dependenceFlag, guessCorrect, halfWidthItems, point, summarize, type PairOutcome } from "../src/hai/stats";
import { HaiStore } from "../src/hai/store";
import { freeze, parseToolArgs, score } from "../src/hai/tools";
import { Store } from "../src/store";

const tiers = ["recall", "apply"];
const items: Item[] = Array.from({ length: 120 }, (_, n) => ({
  id: `b${n % 3}/atom${n}/0`,
  atomId: `atom${n}`,
  branch: `b${n % 3}`,
  title: `t${n}`,
  level: tiers[n % 2],
  prompt: `question ${n}`,
  answer: `answer number ${n} ${"x".repeat(n % 5)}`,
}));

function scoresFor(bank: ReturnType<typeof freezeBank>): AiScores {
  const answers: AiScores["answers"] = {};
  bank.items.forEach((i, n) => {
    const correct = n % 3 !== 0;
    answers[i.id] = { choice: correct ? i.answerIndex : (i.answerIndex + 1) % 4, correct, rationale: `r${n}` };
  });
  return { bankVersion: bank.version, model: MODEL, scoredAt: "2026-09-29", answers };
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-hai-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("bank", () => {
  test("freeze is deterministic and keeps the answer among 4 choices", () => {
    const a = freezeBank(items, "p1");
    const b = freezeBank(items, "p1");
    expect(a).toEqual(b);
    for (const i of a.items) {
      expect(i.choices).toHaveLength(4);
      expect(i.choices[i.answerIndex]).toBe(items.find((x) => x.id === i.id)!.answer);
    }
    expect(freezeBank(items, "p1", "other").version).not.toBe(a.version);
  });

  const base: FrozenItem = {
    id: "x",
    atomId: "a",
    branch: "b",
    tier: "recall",
    prompt: "p",
    choices: ["red blood cell", "white cell", "platelet", "plasma"],
    answerIndex: 0,
    limitSec: 30,
    choiceAtoms: ["a", "c", "d", "e"],
  };

  test("review flags duplicates, containment, overlap, length cues and same-atom distractors", () => {
    expect(reviewItem(base)).toEqual([]);
    const kinds = (i: FrozenItem) => reviewItem(i).map((f) => f.kind);
    expect(kinds({ ...base, choices: ["red blood cell", "Plasma", "platelet", "plasma"] })).toContain("duplicate-choice");
    expect(kinds({ ...base, choices: ["red blood cell", "the red blood cell count", "platelet", "plasma"] })).toContain("contains-answer");
    expect(kinds({ ...base, choices: ["mature red blood cell", "red blood cell nucleus", "platelet", "plasma"] })).toContain("near-answer");
    expect(kinds({ ...base, choices: ["a long answer that gives itself away", "no", "yes", "maybe"] })).toContain("length-cue");
    expect(kinds({ ...base, choiceAtoms: ["a", "a", "d", "e"] })).toContain("same-atom");
  });

  test("flagged items stay out until cleared, and a stale review is refused", () => {
    const bank = freezeBank(items, "p1");
    bank.items[0].choices[1] = bank.items[0].choices[bank.items[0].answerIndex === 1 ? 0 : 1] = bank.items[0].choices[bank.items[0].answerIndex];
    const r = reviewBank(bank);
    expect(eligibleIds(bank, r).has(bank.items[0].id)).toBe(false);
    expect(eligibleIds(bank, reviewBank(bank, [bank.items[0].id])).has(bank.items[0].id)).toBe(true);
    expect(() => eligibleIds(bank, { ...r, bankVersion: "old" })).toThrow("review is for bank old");
  });
});

describe("probe", () => {
  const bank = freezeBank(items, "p1");
  const scores = scoresFor(bank);
  const all = new Set(bank.items.map((i) => i.id));

  test("pairs match on tier and AI correctness, one solo and one pair each", () => {
    const slots = pickPairs(bank, scores, all, new Set(), "s1");
    expect(slots).toHaveLength(40);
    expect(new Set(slots.map((s) => s.itemId)).size).toBe(40);
    const byPair = new Map<string, typeof slots>();
    for (const s of slots) byPair.set(s.pairId, [...(byPair.get(s.pairId) ?? []), s]);
    for (const pair of byPair.values()) {
      expect(pair.map((s) => s.condition).sort()).toEqual(["pair", "solo"]);
      const [x, y] = pair.map((s) => bank.items.find((i) => i.id === s.itemId)!);
      expect(x.tier).toBe(y.tier);
      expect(scores.answers[x.id].correct).toBe(scores.answers[y.id].correct);
    }
    expect(pickPairs(bank, scores, all, new Set(), "s1")).toEqual(slots);
  });

  test("used items are skipped and a short bank throws", () => {
    const first = pickPairs(bank, scores, all, new Set(), "s1");
    const used = new Set(first.map((s) => s.itemId));
    expect(pickPairs(bank, scores, all, used, "s2").some((s) => used.has(s.itemId))).toBe(false);
    expect(() => pickPairs(bank, scores, new Set([...all].slice(0, 20)), new Set(), "s")).toThrow("matched pairs left");
    expect(() => pickPairs(bank, { ...scores, bankVersion: "x" }, all, new Set(), "s")).toThrow("AI scores are for bank x");
  });

  test("think window, display order and retest date", () => {
    expect(aiVisible("pair", THINK_MS - 1)).toBe(false);
    expect(aiVisible("pair", THINK_MS)).toBe(true);
    expect(aiVisible("solo", THINK_MS * 10)).toBe(false);
    expect(displayOrder(bank.items[0], "s").sort()).toEqual([0, 1, 2, 3]);
    expect(retestDue(1000)).toBe(1000 + RETEST_MS);
  });
});

describe("stats", () => {
  test("guess correction maps chance to 0 and perfect to 1", () => {
    expect(guessCorrect(0.25)).toBeCloseTo(0);
    expect(guessCorrect(1)).toBeCloseTo(1);
    expect(guessCorrect(0)).toBeCloseTo(-1 / 3);
  });

  test("D, m and the floor", () => {
    const pairs: PairOutcome[] = [
      { pairId: "1", h: 1, j: 1, a: 0 },
      { pairId: "2", h: 0, j: 1, a: 1 },
    ];
    const p = point(pairs);
    expect(p.H).toBeCloseTo(guessCorrect(0.5));
    expect(p.J).toBeCloseTo(1);
    expect(p.D).toBeCloseTo(1 - guessCorrect(0.5));
    expect(p.m).toBeCloseTo(1 / guessCorrect(0.5));
    expect(point([{ pairId: "1", h: 0, j: 1, a: 0 }]).m).toBeNull();
  });

  test("R and L use retest scores, L is exposure matched", () => {
    const pairs: PairOutcome[] = Array.from({ length: 40 }, (_, n) => ({ pairId: `${n}`, h: 1, j: 1, a: 1, hRetest: n % 2, jRetest: 0 }));
    const s = summarize(pairs, 200);
    expect(s.R.value).toBeCloseTo(guessCorrect(0.5) - 1);
    expect(s.L.value).toBeCloseTo(guessCorrect(0) - guessCorrect(0.5));
    expect(s.retested).toBe(40);
  });

  test("bootstrap over pairs is seeded and brackets the point", () => {
    const pairs: PairOutcome[] = Array.from({ length: 60 }, (_, n) => ({ pairId: `${n}`, h: n % 2, j: n % 3 ? 1 : 0, a: n % 4 ? 1 : 0 }));
    const a = bootstrapPairs(pairs, (s) => point(s).D, 500, "x");
    expect(a).toEqual(bootstrapPairs(pairs, (s) => point(s).D, 500, "x"));
    expect(a.lo!).toBeLessThanOrEqual(a.value!);
    expect(a.hi!).toBeGreaterThanOrEqual(a.value!);
    expect(bootstrapPairs([], () => 1).value).toBeNull();
  });

  test("dependence needs J - H above 0 and L at or below 0", () => {
    expect(dependenceFlag({ value: 0.2, lo: 0.1, hi: 0.3 }, { value: -0.1, lo: -0.2, hi: -0.01 })).toBe(true);
    expect(dependenceFlag({ value: 0.2, lo: -0.1, hi: 0.3 }, { value: -0.1, lo: -0.2, hi: -0.01 })).toBe(false);
    expect(dependenceFlag({ value: 0.2, lo: 0.1, hi: 0.3 }, { value: 0.1, lo: 0.05, hi: 0.2 })).toBe(false);
    expect(dependenceFlag({ value: 0.2, lo: 0.1, hi: 0.3 }, { value: 0.05, lo: -0.1, hi: 0.2 })).toBe(true);
    expect(dependenceFlag({ value: 0.2, lo: null, hi: null }, { value: 0, lo: 0, hi: 0 })).toBeNull();
  });

  test("half-width sizing matches the design numbers", () => {
    expect(halfWidthItems(0.1)).toBe(342);
    expect(halfWidthItems(0.15)).toBe(152);
  });
});

describe("store and session", () => {
  const bank = freezeBank(items, "p1");
  const review = reviewBank(bank, bank.items.map((i) => i.id));
  const scores = scoresFor(bank);

  function open() {
    const key = newDataKey();
    const store = new Store(join(dir, "bkt.db"), key);
    return { store, hai: new HaiStore(store, key) };
  }

  test("writes need consent and wipe removes everything", () => {
    const { store, hai } = open();
    expect(() => hai.startProbe(bank.version, "s", 1)).toThrow("consent");
    hai.consent(1);
    const run = ProbeRun.start(hai, bank, review, scores, 1000, "s");
    run.answer(0, 5, 1001);
    expect(hai.answers()).toHaveLength(1);
    hai.wipe();
    expect(hai.answers()).toHaveLength(0);
    expect(hai.probes()).toHaveLength(0);
    expect(hai.consented()).toBe(false);
    store.close();
  });

  test("a full probe schedules a retest, reports stay empty until it ends", () => {
    const { store, hai } = open();
    hai.consent(0);
    const t0 = 1_000_000;
    const run = ProbeRun.start(hai, bank, review, scores, t0, "seed");
    let aiAccepted = 0;
    while (!run.done) {
      const c = run.current()!;
      expect(c.ai === null).toBe(c.slot.condition === "solo");
      if (c.slot.condition === "pair") {
        expect(run.aiShown(THINK_MS - 1)).toBe(false);
        run.answer(c.ai!.choice, THINK_MS + 10, t0 + 1);
        aiAccepted++;
      } else run.answer(c.item.answerIndex, 3000, t0 + 1);
    }
    expect(aiAccepted).toBe(20);
    expect(hai.answers().filter((a) => a.acceptedAi === true)).toHaveLength(20);
    expect(hai.answers().filter((a) => a.condition === "solo").every((a) => a.acceptedAi === null)).toBe(true);
    const due = t0 + 1 + RETEST_MS;
    expect(hai.probes()[0].due_at).toBe(due);
    expect(hai.dueRetests(due - 1)).toHaveLength(0);
    expect(report(hai, scores).summary).toBeNull();
    const [p] = hai.dueRetests(due);
    const re = ProbeRun.retest(hai, bank, scores, p.id, p.seed);
    expect(re.total).toBe(40);
    while (!re.done) {
      const c = re.current()!;
      expect(c.ai).toBeNull();
      expect(re.aiShown(THINK_MS * 2)).toBe(false);
      re.answer(c.slot.condition === "solo" ? c.item.answerIndex : null, 1000, due + 5);
    }
    const r = report(hai, scores);
    expect(r.retestedProbes).toBe(1);
    expect(r.trend).toBe(false);
    expect(r.summary!.pairs).toBe(20);
    expect(r.summary!.H).toBeCloseTo(1);
    expect(r.summary!.R.value).toBeCloseTo(0);
    expect(r.summary!.L.value).toBeCloseTo(guessCorrect(0) - 1);
    expect(hai.dueRetests(due + RETEST_MS)).toHaveLength(0);
    const second = ProbeRun.start(hai, bank, review, scores, due + 10, "seed2");
    const firstItems = new Set(hai.slots(p.id).map((s) => s.itemId));
    expect(second.current()!.item.id).not.toBeOneOf([...firstItems]);
    store.close();
  });

  test("answers are sealed at rest", () => {
    const { store, hai } = open();
    hai.consent(0);
    const run = ProbeRun.start(hai, bank, review, scores, 1, "s");
    run.answer(2, 10, 2);
    const raw = store.db.query<{ response_enc: string }, []>("select response_enc from hai_answer").get()!;
    expect(raw.response_enc.startsWith("v1:")).toBe(true);
    expect(hai.answers()[0].choice).toBe(2);
    store.close();
  });
});

describe("scorer", () => {
  const bank = freezeBank(items, "p1");
  test("requests carry the frozen question and the model", () => {
    const [req] = batchRequests(bank.items.slice(0, 1));
    expect(req.params.model).toBe("claude-opus-5-5");
    expect(req.params.output_config.effort).toBe("low");
    for (const c of bank.items[0].choices) expect(req.params.messages[0].content).toContain(c);
  });

  test("parseAnswer grades letters and survives junk", () => {
    const i = bank.items[0];
    const letter = "ABCD"[i.answerIndex];
    expect(parseAnswer(i, JSON.stringify({ choice: letter, rationale: "ok" }))).toEqual({ choice: i.answerIndex, correct: true, rationale: "ok" });
    expect(parseAnswer(i, "nope")).toEqual({ choice: null, correct: false, rationale: "", malformed: true });
    expect(parseAnswer(i, JSON.stringify({ choice: "Z" })).malformed).toBe(true);
  });

  test("malformed replies never enter a probe", () => {
    const s = scoresFor(bank);
    for (const i of bank.items.slice(0, 60)) s.answers[i.id] = { choice: null, correct: false, rationale: "", malformed: true };
    const all = new Set(bank.items.map((i) => i.id));
    const bad = new Set(bank.items.slice(0, 60).map((i) => i.id));
    expect(malformedCount(s)).toBe(60);
    expect(pickPairs(bank, s, all, new Set(), "m", 10).some((x) => bad.has(x.itemId))).toBe(false);
  });

  test("a pending batch blocks resubmission until collected, and the cap blocks overspend", async () => {
    const a = { ...parseToolArgs(["--pilot", "20"]), dir };
    freeze({ version: "p1", source: "t", items }, a, () => {});
    let created = 0;
    const fake = () => ({ messages: { batches: { create: async () => ({ id: `batch${++created}` }) } } }) as never;
    const env = { ANTHROPIC_API_KEY: "test" };
    await score({ ...a, yes: true }, () => {}, env, fake);
    expect(created).toBe(1);
    expect(loadSubmission(dir)!.batchId).toBe("batch1");
    await expect(score({ ...a, yes: true }, () => {}, env, fake)).rejects.toThrow("not collected");
    expect(loadSubmission(dir)!.batchId).toBe("batch1");
    save("submission", { ...loadSubmission(dir)!, collectedAt: "now" }, dir);
    await expect(score({ ...a, yes: true, maxUsd: 0.0001 }, () => {}, env, fake)).rejects.toThrow("above --max-usd");
    expect(created).toBe(1);
    await score({ ...a, yes: true }, () => {}, env, fake);
    expect(created).toBe(2);
  });

  test("pilot is stratified and cost is positive", () => {
    const pilot = selectForScoring(bank, new Set(bank.items.map((i) => i.id)), 40);
    expect(pilot).toHaveLength(40);
    expect(new Set(pilot.map((i) => i.tier))).toEqual(new Set(tiers));
    const est = estimateCost(pilot);
    expect(est.usdBatch).toBeCloseTo(est.usd / 2);
    expect(est.usd).toBeGreaterThan(0);
  });

  test("score without --yes never builds a client", async () => {
    const lines: string[] = [];
    const a = { ...parseToolArgs(["--pilot", "20"]), dir };
    freeze({ version: "p1", source: "t", items }, a, (l) => lines.push(l));
    await score(a, (l) => lines.push(l), {}, () => {
      throw new Error("client built");
    });
    expect(lines.at(-1)).toContain("dry run");
    await expect(score({ ...a, yes: true }, () => {}, {}, () => { throw new Error("client built"); })).rejects.toThrow("ANTHROPIC_API_KEY");
  });
});
