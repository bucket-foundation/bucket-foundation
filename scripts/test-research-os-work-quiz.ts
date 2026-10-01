import test from "node:test";
import assert from "node:assert/strict";
import { generateQuestion, prTitle, seededRng, sourcesEmpty, LIMIT_SEC } from "../src/lib/research-os/work-quiz/generate";
import { gradeAnswer, isCorrect, log10Distance, nextCard, normalizeResponse, FERMI_CLOSE_LOG10, FERMI_LOG10_TOLERANCE, GRACE_MS } from "../src/lib/research-os/work-quiz/grade";
import { DAILY_CAP, MIN_GAP_ACTIVE_MS, P_PER_ACTIVE_MINUTE, TICK_MS, initialState, markShown, normalizeState, tick, type TriggerState } from "../src/lib/research-os/work-quiz/trigger";
import { QUIZ_TYPES, toPublic, type WorkSources } from "../src/lib/research-os/work-quiz/types";
import { DAY_MS } from "../src/lib/academy/fsrs";

const SOURCES: WorkSources = {
  repoUrl: "https://github.com/example/repo",
  beads: [
    { id: "bkt-aaaa", title: "Research OS: surprise timed work quiz", status: "open", priority: 1, createdAt: "2026-09-27" },
    { id: "bkt-bbbb", title: "Evolution labor importer for occupations", status: "closed", priority: 2, createdAt: "2026-09-20" },
    { id: "bkt-cccc", title: "Semantic primes review queue filters", status: "deferred", priority: 0, createdAt: "2026-09-18" },
    { id: "bkt-dddd", title: "Nearest node search through pgvector", status: "closed", priority: 2, createdAt: "2026-09-19" },
    { id: "bkt-eeee", title: "Attention ranking reads snapshot vectors", status: "closed", priority: 2, createdAt: "2026-09-21" },
  ],
  prs: [
    { number: 341, title: "feat(research-os): pgvector nearest-node search (#341)", date: "2026-09-22", order: 0 },
    { number: 342, title: "feat(research-os): evolution computing history, Wikidata releases (#342)", date: "2026-09-23", order: 1 },
    { number: 343, title: "docs(evolution): O*NET tasks counted (#343)", date: "2026-09-23", order: 2 },
    { number: 346, title: "feat(research-os): evolution labor importer for Eloundou (#346)", date: "2026-09-24", order: 3 },
    { number: 347, title: "docs(evolution): endoflife license cleared (#347)", date: "2026-09-24", order: 4 },
  ],
  notes: [
    { file: "_intake/ideas/IDEAS-2026-09-20.md", heading: "Swipe Breaks", date: "2026-09-20" },
    { file: "_intake/ideas/IDEAS-2026-09-27.md", heading: "Surprise Work Quiz", date: "2026-09-27" },
  ],
};

const EMPTY: WorkSources = { repoUrl: null, beads: [], prs: [], notes: [] };

test("prTitle drops the conventional prefix and the PR number", () => {
  assert.equal(prTitle("feat(research-os): evolution labor importer (#346)"), "evolution labor importer");
  assert.equal(prTitle("fix!: thing"), "thing");
});

test("the same seed yields the same question", () => {
  for (let i = 0; i < 20; i++) {
    const a = generateQuestion(SOURCES, `seed-${i}`);
    const b = generateQuestion(SOURCES, `seed-${i}`);
    assert.deepEqual(a, b);
  }
  assert.equal(seededRng("x")(), seededRng("x")());
});

test("every type generates with its answer among the choices and a source", () => {
  for (const type of QUIZ_TYPES) {
    let made = 0;
    for (let i = 0; i < 40; i++) {
      const q = generateQuestion(SOURCES, `t-${type}-${i}`, type);
      if (!q) continue;
      made++;
      assert.equal(q.type, type);
      assert.equal(q.limitSec, LIMIT_SEC[type]);
      assert.ok(q.id.startsWith(`${type}:`));
      if (q.choices) {
        assert.ok(q.choices.includes(q.answer), `${type} answer in choices`);
        assert.equal(new Set(q.choices).size, q.choices.length, `${type} choices distinct`);
      } else {
        assert.ok(Number.isFinite(Number(q.answer)));
        assert.ok(q.tolerance >= 1);
      }
      if (type !== "estimate") assert.ok(q.sources.length > 0, `${type} has a source`);
      if (type === "recall") {
        assert.ok(!q.lines.join(" ").includes(q.answer), "cloze hides the answer");
        assert.ok(q.lines[0].includes("____"));
      }
    }
    assert.ok(made > 0, `${type} generated at least once`);
  }
});

test("true-false answers match the source facts", () => {
  for (let i = 0; i < 60; i++) {
    const q = generateQuestion(SOURCES, `tf-${i}`, "true_false");
    assert.ok(q);
    const line = q.lines[0];
    const bead = SOURCES.beads.find((b) => line.includes(b.id));
    if (bead) {
      assert.equal(q.answer, line.includes(`status ${bead.status}.`) ? "true" : "false");
    } else {
      const pr = SOURCES.prs.find((p) => line.includes(`#${p.number}`));
      assert.ok(pr);
      assert.equal(q.answer, line.includes(`on ${pr.date}.`) ? "true" : "false");
    }
  }
});

test("which-came-first names the older item", () => {
  for (let i = 0; i < 40; i++) {
    const q = generateQuestion(SOURCES, `wf-${i}`, "which_first");
    assert.ok(q && q.choices);
    const note = SOURCES.notes.find((n) => n.heading === q.answer);
    if (note) {
      assert.equal(note.heading, "Swipe Breaks");
      continue;
    }
    const orders = q.choices.map((c) => SOURCES.prs.find((p) => prTitle(p.title) === c)!.order);
    const answerOrder = SOURCES.prs.find((p) => prTitle(p.title) === q.answer)!.order;
    assert.equal(answerOrder, Math.min(...orders));
  }
});

test("spot-the-error changes exactly the field it names", () => {
  for (let i = 0; i < 40; i++) {
    const q = generateQuestion(SOURCES, `se-${i}`, "spot_error");
    assert.ok(q);
    if (q.lines[0].startsWith("number:")) {
      const shown = { num: Number(q.lines[0].slice(9)), date: q.lines[1].slice(8), title: q.lines[2].slice(7) };
      const pr = SOURCES.prs.find((p) => q.sources[0].ref === `#${p.number}`)!;
      const wrong = [shown.num !== pr.number && "the number", shown.date !== pr.date && "the date", shown.title !== prTitle(pr.title) && "the title"].filter(Boolean);
      assert.deepEqual(wrong, [q.answer]);
    } else {
      const b = SOURCES.beads.find((x) => q.sources[0].ref === x.id)!;
      const wrong = [q.lines[1] !== `id: ${b.id}` && "the id", q.lines[2] !== `status: ${b.status}` && "the status", q.lines[3] !== `priority: P${b.priority}` && "the priority"].filter(Boolean);
      assert.deepEqual(wrong, [q.answer]);
    }
  }
});

test("estimate answers are true counts", () => {
  for (let i = 0; i < 30; i++) {
    const q = generateQuestion(SOURCES, `es-${i}`, "estimate");
    assert.ok(q);
    const m = q.prompt.match(/status (\w+)\?/);
    if (m) assert.equal(Number(q.answer), SOURCES.beads.filter((b) => b.status === m[1]).length);
  }
});

test("empty sources give no question", () => {
  assert.ok(sourcesEmpty(EMPTY));
  assert.equal(generateQuestion(EMPTY, "any"), null);
});

test("the public question carries no answer or explanation", () => {
  const q = generateQuestion(SOURCES, "pub")!;
  const pub = toPublic(q) as Record<string, unknown>;
  assert.equal(pub.answer, undefined);
  assert.equal(pub.explain, undefined);
  assert.equal(pub.tolerance, undefined);
  assert.equal(pub.sources, undefined);
  for (let i = 0; i < 40; i++) {
    const r = generateQuestion(SOURCES, `leak-${i}`, "recall")!;
    assert.ok(!JSON.stringify(toPublic(r)).includes(r.explain.replace("The title reads: ", "")), "recall payload hides the full title");
    const e = generateQuestion(SOURCES, `leak-${i}`, "spot_error")!;
    const truth = e.explain.replace(/\.$/, "");
    assert.ok(!JSON.stringify(toPublic(e)).includes(truth), "spot-the-error payload hides the true facts");
  }
});

test("grading: choices, numbers, timeouts and ratings", () => {
  const choice = { choices: ["a", "b"], answer: "a", tolerance: 0, limitSec: 20 };
  assert.equal(normalizeResponse(choice, "c"), null);
  assert.deepEqual(gradeAnswer(choice, "a", 2000), { correct: true, timedOut: false, rating: 4 });
  assert.deepEqual(gradeAnswer(choice, "a", 15000), { correct: true, timedOut: false, rating: 3 });
  assert.deepEqual(gradeAnswer(choice, "b", 1000), { correct: false, timedOut: false, rating: 1 });
  assert.deepEqual(gradeAnswer(choice, "a", 20000 + GRACE_MS + 1), { correct: false, timedOut: true, rating: 1 });
  assert.deepEqual(gradeAnswer(choice, null, 1000), { correct: false, timedOut: false, rating: 1 });
  const num = { choices: null, answer: "50", tolerance: 10, limitSec: 40 };
  assert.equal(normalizeResponse(num, "1,200"), "1200");
  assert.equal(normalizeResponse(num, "many"), null);
  assert.ok(isCorrect(num, "60"));
  assert.ok(isCorrect(num, "40"));
  assert.ok(!isCorrect(num, "61"));
});

test("Fermi grading: log10 distance bands, non-positive answers, and the old tolerance left alone", () => {
  const f = { choices: null, answer: "1000", tolerance: 0, log10Tolerance: FERMI_LOG10_TOLERANCE, limitSec: 90 };
  assert.equal(log10Distance("1000", "1000"), 0);
  assert.ok(Math.abs(log10Distance("1000", "100")! - 1) < 1e-12);
  assert.ok(Math.abs(log10Distance("1000", "10000")! - 1) < 1e-12);
  for (const bad of ["0", "-5", "abc", null]) assert.equal(log10Distance("1000", bad), null);
  assert.equal(log10Distance("0", "10"), null);
  assert.equal(log10Distance("-3", "10"), null);
  assert.equal(FERMI_LOG10_TOLERANCE, 0.5);
  assert.ok(isCorrect(f, "3162"));
  assert.ok(isCorrect(f, "317"));
  assert.ok(!isCorrect(f, "3200"));
  assert.ok(!isCorrect(f, "310"));
  assert.ok(!isCorrect(f, "0"));
  assert.ok(!isCorrect(f, "-1000"));
  assert.ok(isCorrect({ ...f, answer: "1e12" }, String(10 ** 12.5)));
  assert.deepEqual(gradeAnswer(f, "1000", 80_000), { correct: true, timedOut: false, rating: 4 });
  assert.deepEqual(gradeAnswer(f, String(1000 * 10 ** FERMI_CLOSE_LOG10), 1000), { correct: true, timedOut: false, rating: 4 });
  assert.deepEqual(gradeAnswer(f, "2000", 1000), { correct: true, timedOut: false, rating: 3 });
  assert.deepEqual(gradeAnswer(f, "9000", 1000), { correct: false, timedOut: false, rating: 1 });
  assert.deepEqual(gradeAnswer(f, "1000", 90_000 + GRACE_MS + 1), { correct: false, timedOut: true, rating: 1 });
  assert.deepEqual(gradeAnswer(f, null, 1000), { correct: false, timedOut: false, rating: 1 });
  const old = { choices: null, answer: "1000", tolerance: 10, limitSec: 40 };
  assert.ok(!isCorrect(old, "2000"));
  assert.ok(isCorrect(old, "1010"));
  assert.deepEqual(gradeAnswer(old, "1005", 1000), { correct: true, timedOut: false, rating: 4 });
  assert.ok(isCorrect({ ...f, choices: ["1000", "5"], answer: "5" }, "5"));
});

test("a miss makes an FSRS card due within a day; a first correct answer makes none", () => {
  const now = Date.UTC(2026, 8, 27);
  assert.equal(nextCard(null, 3, now), null);
  const card = nextCard(null, 1, now)!;
  assert.ok(card.due! > now && card.due! <= now + DAY_MS);
  const later = nextCard(card, 3, card.due!)!;
  assert.ok(later.due! > card.due!);
  assert.equal(later.reps, 2);
});

function runActive(state: TriggerState, minutes: number, start: number, rand: number, typing = false) {
  let s = state;
  let fired = 0;
  for (let i = 0; i < minutes; i++) {
    const now = start + i * TICK_MS;
    const r = tick(s, { now, visible: true, lastInputAt: now, typing, quizOpen: false, rand });
    s = r.state;
    if (r.fire) fired++;
  }
  return { s, fired };
}

test("the trigger never fires before the minimum active gap", () => {
  const start = new Date(2026, 8, 27, 9).getTime();
  const { fired } = runActive(initialState(start), MIN_GAP_ACTIVE_MS / TICK_MS - 1, start, 0);
  assert.equal(fired, 0);
});

test("the trigger fires once the gap passes and the draw lands, then resets", () => {
  const start = new Date(2026, 8, 27, 9).getTime();
  const { s, fired } = runActive(initialState(start), MIN_GAP_ACTIVE_MS / TICK_MS, start, 0);
  assert.equal(fired, 1);
  assert.equal(s.activeMsSinceLast, 0);
  assert.equal(s.shownToday, 1);
  const miss = runActive(initialState(start), 600, start, P_PER_ACTIVE_MINUTE);
  assert.equal(miss.fired, 0);
});

test("the trigger waits while typing, idle, hidden or with a quiz open", () => {
  const start = new Date(2026, 8, 27, 9).getTime();
  const ready: TriggerState = { activeMsSinceLast: MIN_GAP_ACTIVE_MS, day: normalizeState({}, start).day, shownToday: 0 };
  assert.equal(tick(ready, { now: start, visible: true, lastInputAt: start, typing: true, quizOpen: false, rand: 0 }).fire, false);
  assert.equal(tick(ready, { now: start, visible: false, lastInputAt: start, typing: false, quizOpen: false, rand: 0 }).fire, false);
  assert.equal(tick(ready, { now: start, visible: true, lastInputAt: start - 10 * TICK_MS, typing: false, quizOpen: false, rand: 0 }).fire, false);
  assert.equal(tick(ready, { now: start, visible: true, lastInputAt: start, typing: false, quizOpen: true, rand: 0 }).fire, false);
  const idle = tick({ ...ready, activeMsSinceLast: 0 }, { now: start, visible: true, lastInputAt: start - 10 * TICK_MS, typing: false, quizOpen: false, rand: 0 });
  assert.equal(idle.state.activeMsSinceLast, 0);
});

test("the daily cap holds and resets the next day", () => {
  const start = new Date(2026, 8, 27, 9).getTime();
  const { fired, s } = runActive(initialState(start), 600, start, 0);
  assert.equal(fired, DAILY_CAP);
  const tomorrow = new Date(2026, 8, 28, 9).getTime();
  assert.equal(normalizeState(s, tomorrow).shownToday, 0);
  assert.equal(markShown(s, start).shownToday, DAILY_CAP + 1);
});

test("with the real draw the quiz stays rare", () => {
  const start = new Date(2026, 8, 27, 9).getTime();
  const rng = seededRng("rarity");
  let s = initialState(start);
  let fired = 0;
  for (let i = 0; i < 8 * 60; i++) {
    const now = start + i * TICK_MS;
    const r = tick(s, { now, visible: true, lastInputAt: now, typing: false, quizOpen: false, rand: rng() });
    s = r.state;
    if (r.fire) fired++;
  }
  assert.ok(fired <= DAILY_CAP);
});

import { randomUUID } from "node:crypto";
import { githubUrl, parseBeads, parseNotes, parsePrLog } from "../src/lib/research-os/work-quiz/sources-server";
import { keyTerms, matchLearnItem } from "../src/lib/research-os/work-quiz/learn-match";
import { answerQuestion, issueQuestion, type QuizDeps } from "../src/lib/research-os/work-quiz/service";
import type { AnswerFields, AttemptRow, CardRow, QuizMode } from "../src/lib/research-os/work-quiz/db";
import type { QuizQuestion } from "../src/lib/research-os/work-quiz/types";
import type { Card } from "../src/lib/academy/fsrs";

test("source parsers keep valid rows and skip bad ones", () => {
  const beads = parseBeads(['{"id":"bkt-1","title":"A","status":"open","priority":1,"created_at":"2026-09-27T01:00:00Z"}', "not json", '{"id":2}', ""].join("\n"));
  assert.deepEqual(beads, [{ id: "bkt-1", title: "A", status: "open", priority: 1, createdAt: "2026-09-27" }]);
  const prs = parsePrLog(["2026-09-24|feat(x): newer (#12)", "2026-09-23|Merge branch dev", "2026-09-22|fix: older | piped (#11)"].join("\n"));
  assert.deepEqual(prs.map((p) => [p.number, p.order]), [[11, 0], [12, 1]]);
  assert.equal(prs[0].title, "fix: older | piped (#11)");
  const notes = parseNotes("_intake/ideas/IDEAS-2026-09-27.md", "# Top\n## Surprise Work Quiz\ntext\n### deeper\n## Another");
  assert.deepEqual(notes.map((n) => [n.heading, n.date]), [["Surprise Work Quiz", "2026-09-27"], ["Another", "2026-09-27"]]);
  assert.equal(parseNotes("learning/research/_synthesis/DECISIONS.md", "## A")[0].date, "");
  assert.equal(githubUrl("git@github.com:bucket-foundation/bucket-foundation.git"), "https://github.com/bucket-foundation/bucket-foundation");
  assert.equal(githubUrl("https://github.com/o/r"), "https://github.com/o/r");
  assert.equal(githubUrl("/local/path"), null);
});

test("sources with only undated notes still allow bead and PR questions", () => {
  const src: WorkSources = { ...SOURCES, notes: [{ file: "learning/research/_synthesis/DECISIONS.md", heading: "A", date: "" }] };
  for (let i = 0; i < 10; i++) assert.ok(generateQuestion(src, `u-${i}`));
});

test("learn matching needs a distinctive shared term", () => {
  const atoms = [
    { branchFile: "04-information", id: "vector-spaces", title: "Vector spaces" },
    { branchFile: "02-physics", id: "entropy", title: "Entropy and the second law" },
    { branchFile: "04-information", id: "search", title: "Search" },
  ];
  assert.deepEqual(matchLearnItem("PR #341: nearest-node search over vector spaces", atoms), { href: "/research-os/learn/04-information/vector-spaces", title: "Vector spaces" });
  assert.equal(matchLearnItem("labor importer for occupations", atoms), null);
  assert.equal(matchLearnItem("", atoms), null);
  assert.ok(keyTerms("Entropies entropy").has("entropy"));
});

function fakeDeps(sources: WorkSources = SOURCES) {
  const attempts = new Map<string, AttemptRow>();
  const cards = new Map<string, CardRow>();
  let raceOnce = false;
  const deps: QuizDeps = {
    loadSources: async () => sources,
    matchLearn: () => ({ href: "/research-os/learn/02-physics/entropy", title: "Entropy" }),
    dueCards: async (learnerId, now, limit) =>
      Array.from(cards.values()).filter((c) => c.learner_id === learnerId && c.due_at <= now.toISOString()).sort((a, b) => a.due_at.localeCompare(b.due_at)).slice(0, limit),
    issueAttempt: async (learnerId, question, mode: QuizMode) => {
      const row: AttemptRow = { id: randomUUID(), learner_id: learnerId, question_id: question.id, question, mode, issued_at: new Date(clock).toISOString(), answered_at: null, response: null, correct: null, timed_out: null, skipped: null, elapsed_ms: null, rating: null };
      attempts.set(row.id, row);
      return row;
    },
    loadAttempt: async (learnerId, id) => {
      const r = attempts.get(id);
      return r && r.learner_id === learnerId ? { ...r } : null;
    },
    answerAttempt: async (learnerId, id, fields: AnswerFields, answeredAt) => {
      const r = attempts.get(id);
      if (!r || r.learner_id !== learnerId || r.answered_at) return null;
      const next = { ...r, ...fields, answered_at: answeredAt };
      attempts.set(id, next);
      return { ...next };
    },
    loadCard: async (learnerId, qid) => cards.get(`${learnerId}|${qid}`) ?? null,
    writeCard: async (learnerId, question: QuizQuestion, card: Card, previous) => {
      const key = `${learnerId}|${question.id}`;
      const cur = cards.get(key) ?? null;
      if (raceOnce) {
        raceOnce = false;
        return false;
      }
      if ((cur?.reps ?? null) !== (previous?.reps ?? null)) return false;
      cards.set(key, { learner_id: learnerId, question_id: question.id, question: previous?.question ?? question, card, due_at: new Date(card.due!).toISOString(), reps: card.reps ?? 0 });
      return true;
    },
  };
  return { deps, attempts, cards, race: () => (raceOnce = true) };
}

let clock = Date.UTC(2026, 8, 27, 12);
const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

test("issue hides the answer and records the full question server side", async () => {
  const { deps, attempts } = fakeDeps();
  const out = await issueQuestion(deps, ME, "surprise", new Date(clock));
  assert.equal(out.status, "issued");
  if (out.status !== "issued") return;
  const payload = JSON.stringify(out);
  const stored = attempts.get(out.attemptId)!;
  assert.ok(!("answer" in out.question));
  assert.ok(!payload.includes('"explain"'));
  assert.equal(stored.question.id, out.question.id);
  assert.ok(stored.question.learn);
});

test("answering grades on server time, and a retry returns the stored result", async () => {
  const { deps, attempts, cards } = fakeDeps();
  const out = await issueQuestion(deps, ME, "manual", new Date(clock));
  assert.equal(out.status, "issued");
  if (out.status !== "issued") return;
  const q = attempts.get(out.attemptId)!.question;
  const wrong = q.choices ? q.choices.find((c) => c !== q.answer)! : String(Number(q.answer) + q.tolerance + 50);
  const first = await answerQuestion(deps, ME, { attemptId: out.attemptId, response: wrong }, new Date(clock + 5000));
  assert.equal(first.status, "ok");
  if (first.status !== "ok") return;
  assert.equal(first.result.correct, false);
  assert.equal(first.result.answer, q.answer);
  assert.equal(first.result.elapsedMs, 5000);
  assert.ok(first.result.reviewDueAt);
  assert.equal(cards.size, 1);
  const again = await answerQuestion(deps, ME, { attemptId: out.attemptId, response: q.answer }, new Date(clock + 6000));
  assert.equal(again.status, "ok");
  if (again.status !== "ok") return;
  assert.equal(again.result.correct, false);
  assert.equal(cards.get(`${ME}|${q.id}`)!.reps, 1);
});

test("another learner cannot answer my attempt", async () => {
  const { deps } = fakeDeps();
  const out = await issueQuestion(deps, ME, "manual", new Date(clock));
  if (out.status !== "issued") throw new Error("not issued");
  assert.deepEqual(await answerQuestion(deps, OTHER, { attemptId: out.attemptId, response: "x" }, new Date(clock)), { status: "not_found" });
  assert.deepEqual(await answerQuestion(deps, ME, { attemptId: "nope" }, new Date(clock)), { status: "invalid", error: "attempt_id_required" });
});

test("a late answer is a timeout even when right", async () => {
  const { deps, attempts } = fakeDeps();
  const out = await issueQuestion(deps, ME, "manual", new Date(clock));
  if (out.status !== "issued") throw new Error("not issued");
  const q = attempts.get(out.attemptId)!.question;
  const res = await answerQuestion(deps, ME, { attemptId: out.attemptId, response: q.answer }, new Date(clock + (q.limitSec + 10) * 1000));
  assert.ok(res.status === "ok" && res.result.timedOut && !res.result.correct);
});

test("an unanswered expiry counts as out of time", async () => {
  const { deps, attempts } = fakeDeps();
  const out = await issueQuestion(deps, ME, "manual", new Date(clock));
  if (out.status !== "issued") throw new Error("not issued");
  const q = attempts.get(out.attemptId)!.question;
  const res = await answerQuestion(deps, ME, { attemptId: out.attemptId }, new Date(clock + q.limitSec * 1000 + 200));
  assert.ok(res.status === "ok" && res.result.timedOut);
});

test("skip records the attempt and makes no card; a bad choice is refused", async () => {
  const { deps, cards, attempts } = fakeDeps();
  const out = await issueQuestion(deps, ME, "manual", new Date(clock));
  if (out.status !== "issued") throw new Error("not issued");
  const q = attempts.get(out.attemptId)!.question;
  if (q.choices) assert.deepEqual(await answerQuestion(deps, ME, { attemptId: out.attemptId, response: "not a choice" }, new Date(clock)), { status: "invalid", error: "response_not_a_choice" });
  const res = await answerQuestion(deps, ME, { attemptId: out.attemptId, skip: true }, new Date(clock + 1000));
  assert.ok(res.status === "ok" && res.result.skipped);
  assert.equal(cards.size, 0);
  assert.equal(attempts.get(out.attemptId)!.skipped, true);
});

test("review mode serves due misses and says when nothing is due", async () => {
  const { deps, attempts, cards } = fakeDeps();
  assert.deepEqual(await issueQuestion(deps, ME, "review", new Date(clock)), { status: "empty", reason: "nothing_due" });
  const out = await issueQuestion(deps, ME, "manual", new Date(clock));
  if (out.status !== "issued") throw new Error("not issued");
  await answerQuestion(deps, ME, { attemptId: out.attemptId, skip: false, response: null }, new Date(clock + 1000));
  assert.equal(cards.size, 1);
  const due = cards.values().next().value!.due_at;
  const later = new Date(new Date(due).getTime() + 1000);
  const saved = clock;
  clock = later.getTime();
  const review = await issueQuestion(deps, ME, "review", later);
  assert.equal(review.status, "issued", JSON.stringify({ review, due, later }));
  assert.ok(review.status === "issued" && review.fromReview);
  if (review.status !== "issued") return;
  assert.equal(attempts.get(review.attemptId)!.question.id, out.question.id);
  const res = await answerQuestion(deps, ME, { attemptId: review.attemptId, response: attempts.get(review.attemptId)!.question.answer }, new Date(later.getTime() + 1000));
  assert.ok(res.status === "ok" && res.result.correct);
  assert.equal(cards.values().next().value!.reps, 2);
  clock = saved;
});

test("a card write race retries once from the fresh card", async () => {
  const { deps, cards, race } = fakeDeps();
  const out = await issueQuestion(deps, ME, "manual", new Date(clock));
  if (out.status !== "issued") throw new Error("not issued");
  race();
  const res = await answerQuestion(deps, ME, { attemptId: out.attemptId, response: null }, new Date(clock + 1000));
  assert.ok(res.status === "ok" && res.result.reviewSaved);
  assert.equal(cards.size, 1);
});

test("with no sources and nothing due the quiz stays quiet", async () => {
  const { deps } = fakeDeps(EMPTY);
  assert.deepEqual(await issueQuestion(deps, ME, "surprise", new Date(clock)), { status: "empty", reason: "no_sources" });
});

test("an open unanswered attempt is served again until its time runs out", async () => {
  const { deps, attempts } = fakeDeps();
  const { stillOpen } = await import("../src/lib/research-os/work-quiz/open");
  deps.openAttempt = async (learnerId, mode, now) =>
    Array.from(attempts.values()).find((r) => r.learner_id === learnerId && r.mode === mode && stillOpen(r, now)) ?? null;
  const first = await issueQuestion(deps, ME, "surprise", new Date(clock));
  const again = await issueQuestion(deps, ME, "surprise", new Date(clock + 1000));
  assert.ok(first.status === "issued" && again.status === "issued");
  assert.equal(again.attemptId, first.attemptId);
  assert.equal(attempts.size, 1);
  const other = await issueQuestion(deps, OTHER, "surprise", new Date(clock + 1000));
  assert.ok(other.status === "issued" && other.attemptId !== first.attemptId);
  const later = await issueQuestion(deps, ME, "surprise", new Date(clock + 120_000));
  assert.ok(later.status === "issued" && later.attemptId !== first.attemptId);
});
