import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkLimits } from "../src/lib/research-os/work-quiz/limits";
import { makeForm } from "../src/lib/research-os/work-quiz/forms";
import { DAY_MS, QUIZ_SLOTS, REVIEW_SLOTS, builtCells, cellStats, daySeed, factWeights, recordPicks, sampleQuiz, type CoverageRow, type DueCard } from "../src/lib/research-os/work-quiz/sampler";
import type { WorkSources } from "../src/lib/research-os/work-quiz/types";

const TITLES = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/fixtures/quiz-titles.json"), "utf8")) as { prs: string[]; beads: string[] };
const STATUSES = ["open", "closed", "in_progress", "deferred"];
const day = (i: number) => new Date(Date.UTC(2026, 8, 1 + Math.floor(i / 4))).toISOString().slice(0, 10);
const SOURCES: WorkSources = {
  repoUrl: "https://github.com/example/repo",
  prs: TITLES.prs.map((title, i) => ({ number: 400 + i, title: `${title} (#${400 + i})`, date: day(i), order: i })),
  beads: TITLES.beads.map((title, i) => ({ id: `bkt-f${i.toString(36)}`, title, status: STATUSES[i % STATUSES.length], priority: i % 5, createdAt: day(i) })),
  notes: [],
};
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

test("the seed is sha256 of the day and the same day gives the same quiz", () => {
  assert.match(daySeed("2026-10-01"), /^[0-9a-f]{64}$/);
  const a = sampleQuiz({ day: "2026-10-01", sources: SOURCES });
  const b = sampleQuiz({ day: "2026-10-01", sources: SOURCES });
  assert.deepEqual(a, b);
  assert.equal(a.questions.length, QUIZ_SLOTS);
  assert.notDeepEqual(a.questions.map((q) => q.id), sampleQuiz({ day: "2026-10-02", sources: SOURCES }).questions.map((q) => q.id));
});

test("no fact appears twice in a day and every question passes checkLimits", () => {
  let d = "2026-10-01";
  for (let i = 0; i < 60; i++, d = nextDay(d)) {
    const quiz = sampleQuiz({ day: d, sources: SOURCES });
    const facts = quiz.picks.flatMap((p) => p.factIds);
    assert.equal(new Set(facts).size, facts.length, d);
    for (const q of quiz.questions) assert.deepEqual(checkLimits(q), [], `${d} ${q.id}`);
    assert.deepEqual(quiz.blocked, ["which_changed"]);
  }
});

const due = (key: string, factIds: string[], dueAt: number): DueCard => {
  const q = makeForm("true_false", SOURCES, key, 1)!;
  return { cardKey: `${factIds.join("+")}|true_false`, factIds, question: { ...q, id: `${q.id}-${key}` }, dueAt };
};

test("two slots go to the most overdue cards and are released when none are due", () => {
  const now = Date.parse("2026-10-01T12:00:00Z");
  const cards = [due("a", ["bead:x1"], now - 3 * DAY_MS), due("b", ["bead:x2"], now - 5 * DAY_MS), due("c", ["bead:x3"], now - DAY_MS), due("d", ["bead:x4"], now + DAY_MS)];
  const quiz = sampleQuiz({ day: "2026-10-01", sources: SOURCES, due: cards, now });
  assert.equal(quiz.reviewed, REVIEW_SLOTS);
  assert.deepEqual(quiz.questions.slice(0, 2).map((q) => q.id), [cards[1].question.id, cards[0].question.id]);
  assert.equal(quiz.questions.length, QUIZ_SLOTS);
  const none = sampleQuiz({ day: "2026-10-01", sources: SOURCES, due: [cards[3]], now });
  assert.equal(none.reviewed, 0);
  assert.equal(none.picks.length, QUIZ_SLOTS);
});

test("a due card whose fact is already used that day is skipped", () => {
  const now = Date.parse("2026-10-01T12:00:00Z");
  const cards = [due("a", ["bead:x1"], now - 2 * DAY_MS), due("b", ["bead:x1"], now - 3 * DAY_MS)];
  assert.equal(sampleQuiz({ day: "2026-10-01", sources: SOURCES, due: cards, now }).reviewed, 1);
});

test("over 30 simulated days coverage moves to the least-seen cell and reaches every built cell", () => {
  let coverage: CoverageRow[] = [];
  let d = "2026-10-01";
  const cells = builtCells().length;
  for (let i = 0; i < 30; i++, d = nextDay(d)) {
    const before = cellStats(coverage);
    const min = Math.min(...builtCells().map((c) => before.get(`${c.form}/${c.format}/${c.depth}`)?.picks ?? 0));
    const quiz = sampleQuiz({ day: d, sources: SOURCES, coverage });
    assert.equal(before.get(quiz.picks[0].cell)?.picks ?? 0, min, `${d} first pick is a least-seen cell`);
    coverage = recordPicks(coverage, quiz.picks, d);
  }
  const stats = cellStats(coverage);
  assert.equal(stats.size, cells);
  const counts = Array.from(stats.values()).map((s) => s.picks);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, counts.join(","));
});

test("misses and overdue days raise a fact's weight", () => {
  const now = Date.parse("2026-10-01T12:00:00Z");
  const w = factWeights([{ cell: "order/order/1", factId: "pr:1+pr:2+pr:3", picks: 1, misses: 2, lastDay: "2026-09-30" }], [due("a", ["bead:x1"], now - 4 * DAY_MS)], now);
  assert.equal(w.get("pr:2"), 5);
  assert.equal(w.get("bead:x1"), 5);
});
