import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FERMI_LOG10_TOLERANCE } from "../../../src/lib/research-os/work-quiz/grade";
import { newDataKey } from "../src/crypto";
import { attemptId, DailyQuizError, DailyQuizStore, fermi, MAX_DAILY_QUESTIONS, parseDailyQuiz, validDay } from "../src/daily-quiz";
import { startServe, type Serve } from "../src/serve";
import { LOCAL_ONLY_TABLES, MIGRATIONS, SCHEMA_VERSION, Store, SYNC_TABLES } from "../src/store";
import { WorkQuizStore, workQuizRoutes } from "../src/work-quiz";

const DAY = "2026-09-30";
const FERMI = { id: "f1", prompt: "How many lines did the canary transcript hold?", answer: 1000, explain: "About a thousand lines." };
const CHOICE = { id: "c1", type: "recall", prompt: "Which branch takes desktop PRs?", choices: ["dev", "main"], answer: "dev", limitSec: 30, explain: "Desktop work targets dev." };
const quiz = () => ({ day: DAY, questions: [fermi(FERMI), CHOICE] });

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-dq-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("day strings", () => {
  test("accepts calendar days and refuses everything else", () => {
    expect(validDay("2026-09-30")).toBe(true);
    expect(validDay("2028-02-29")).toBe(true);
    for (const bad of ["2026-02-30", "2026-13-01", "2026-9-30", "2026-09-30T00:00", "../2026-09-30", "", null, 20260930]) expect(validDay(bad)).toBe(false);
  });
});

describe("daily quiz parsing", () => {
  test("builds a Fermi question graded on log10", () => {
    const q = fermi(FERMI);
    expect([q.type, q.answer, q.choices, q.log10Tolerance, q.limitSec]).toEqual(["estimate", "1000", null, FERMI_LOG10_TOLERANCE, 90]);
  });

  test("keeps the absolute tolerance for a numeric question without a log10 tolerance", () => {
    const q = parseDailyQuiz({ day: DAY, questions: [{ id: "n1", type: "estimate", prompt: "How many?", answer: "50", tolerance: 10, limitSec: 40 }] }).questions[0];
    expect([q.tolerance, q.log10Tolerance]).toEqual([10, undefined]);
  });

  test("refuses malformed quizzes", () => {
    const bad = (questions: unknown, day: unknown = DAY) => () => parseDailyQuiz({ day, questions });
    expect(bad([CHOICE], "2026-02-30")).toThrow(DailyQuizError);
    expect(bad([])).toThrow("between 1 and");
    expect(bad(Array.from({ length: MAX_DAILY_QUESTIONS + 1 }, (_, i) => ({ ...CHOICE, id: `c${i}` })))).toThrow("between 1 and");
    expect(bad([CHOICE, CHOICE])).toThrow("repeats a question id");
    expect(bad([{ ...CHOICE, id: "a/b" }])).toThrow("question id");
    expect(bad([{ ...CHOICE, type: "essay" }])).toThrow("unknown type");
    expect(bad([{ ...CHOICE, answer: "ops" }])).toThrow("missing from its choices");
    expect(bad([{ ...CHOICE, choices: ["dev", "dev"] }])).toThrow("repeats a choice");
    expect(bad([{ ...CHOICE, limitSec: 0 }])).toThrow("limit");
    expect(bad([{ ...CHOICE, prompt: "x".repeat(601) }])).toThrow("at most 600");
    expect(bad([{ ...CHOICE, choices: null, answer: "dev" }])).toThrow("numeric answer");
    expect(bad([{ ...CHOICE, choices: null, answer: "5" }])).toThrow("tolerance");
    expect(bad([{ ...CHOICE, choices: null, answer: "0", log10Tolerance: 0.5 }])).toThrow("positive answer");
    expect(bad([{ ...CHOICE, choices: null, answer: "-4", log10Tolerance: 0.5 }])).toThrow("positive answer");
    expect(bad([{ ...CHOICE, choices: null, answer: "5", log10Tolerance: 0 }])).toThrow("log10 tolerance");
    expect(bad([{ ...CHOICE, sources: [{ kind: "pr", ref: "1", label: "one", href: "javascript:alert(1)" }] }])).toThrow("https://");
    expect(() => fermi({ ...FERMI, answer: 0 })).toThrow("positive answer");
    expect(bad([{ ...CHOICE, explain: "x".repeat(601) }])).toThrow("explanation");
    expect(bad([{ ...CHOICE, explain: 7 }])).toThrow("explanation");
    const ref = { kind: "pr", ref: "1", label: "one", href: null };
    expect(bad([{ ...CHOICE, sources: Array.from({ length: 9 }, () => ref) }])).toThrow("at most 8 sources");
    expect(bad([{ ...CHOICE, sources: "pr 1" }])).toThrow("at most 8 sources");
    expect(parseDailyQuiz({ day: DAY, questions: [{ ...CHOICE, explain: "x".repeat(600), sources: Array.from({ length: 8 }, () => ref) }] }).questions[0].sources).toHaveLength(8);
  });
});

describe("schema 8", () => {
  function v7Fixture(path: string) {
    const db = new Database(path, { create: true, strict: true });
    for (const m of MIGRATIONS.slice(0, 7)) {
      if (typeof m === "string") db.run(m);
      else m(db);
    }
    db.run("pragma user_version = 7");
    const at = db.query("insert into work_quiz_attempts (id, question_id, type, correct, rating, elapsed_ms, at) values (?, ?, ?, ?, ?, ?, ?)");
    at.run("a1", "estimate-beads-status-open", "estimate", 1, 4, 9000, 100);
    at.run("a2", "recall-pr-341", "recall", 0, 1, 31000, 200);
    db.close();
  }

  test("the version constant matches the migration list and daily_quiz stays local", () => {
    expect(SCHEMA_VERSION).toBe(8);
    expect(MIGRATIONS.length).toBe(SCHEMA_VERSION);
    expect(LOCAL_ONLY_TABLES).toContain("daily_quiz");
    expect((SYNC_TABLES as readonly string[]).includes("daily_quiz")).toBe(false);
  });

  test("a v7 database migrates and old attempts keep their grades with a null distance", () => {
    const path = join(dir, "bkt.db");
    v7Fixture(path);
    const key = newDataKey();
    const s = new Store(path, key);
    expect(s.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(8);
    expect(s.db.query("select name from sqlite_master where name = 'daily_quiz'").get()).not.toBeNull();
    expect(s.db.query("select id, question_id, type, correct, rating, elapsed_ms, at, log10_distance from work_quiz_attempts order by at").all()).toEqual([
      { id: "a1", question_id: "estimate-beads-status-open", type: "estimate", correct: 1, rating: 4, elapsed_ms: 9000, at: 100, log10_distance: null },
      { id: "a2", question_id: "recall-pr-341", type: "recall", correct: 0, rating: 1, elapsed_ms: 31000, at: 200, log10_distance: null },
    ]);
    const wq = new WorkQuizStore(s, key);
    expect(wq.tally()).toEqual({ answered: 2, correct: 1 });
    wq.record(fermi(FERMI), true, 3, 5000, 300);
    expect(wq.tally()).toEqual({ answered: 3, correct: 2 });
    s.close();
    const again = new Store(path, key);
    expect(new WorkQuizStore(again, key).tally()).toEqual({ answered: 3, correct: 2 });
    again.close();
  });
});

describe("schema 8 failure", () => {
  test("a failing last statement rolls the whole step back, the database stays readable at 7, and a retry migrates", () => {
    const path = join(dir, "bkt.db");
    const db = new Database(path, { create: true, strict: true });
    for (const m of MIGRATIONS.slice(0, 7)) {
      if (typeof m === "string") db.run(m);
      else m(db);
    }
    db.run("pragma user_version = 7");
    db.run("insert into work_quiz_attempts (id, question_id, type, correct, rating, elapsed_ms, at) values ('a1', 'recall-pr-341', 'recall', 1, 3, 2000, 100)");
    db.run("create index work_quiz_attempts_daily on notes(updated_at)");
    db.close();
    const key = newDataKey();
    expect(() => new Store(path, key)).toThrow();
    const after = new Database(path, { strict: true });
    expect(after.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(7);
    expect(after.query("select name from sqlite_master where name = 'daily_quiz'").get()).toBeNull();
    expect(after.query<{ name: string }, []>("pragma table_info(work_quiz_attempts)").all().map((c) => c.name)).not.toContain("log10_distance");
    expect(after.query("select id, correct, rating from work_quiz_attempts").all()).toEqual([{ id: "a1", correct: 1, rating: 3 }]);
    after.run("insert into work_quiz_attempts (id, question_id, type, correct, rating, elapsed_ms, at) values ('a2', 'recall-pr-342', 'recall', 0, 1, 2000, 200)");
    after.run("drop index work_quiz_attempts_daily");
    after.close();
    const s = new Store(path, key);
    expect(s.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(SCHEMA_VERSION);
    expect(new WorkQuizStore(s, key).tally()).toEqual({ answered: 2, correct: 1 });
    s.close();
  });
});

describe("daily quiz store", () => {
  test("the database refuses a second attempt row for one daily question and leaves other rows free", () => {
    const key = newDataKey();
    const s = new Store(join(dir, "bkt.db"), key);
    const wq = new WorkQuizStore(s, key);
    const q = fermi(FERMI);
    wq.record(q, true, 3, 1000, 1, { questionId: attemptId(DAY, q.id) });
    expect(() => wq.record(q, true, 3, 1000, 2, { questionId: attemptId(DAY, q.id) })).toThrow("UNIQUE");
    wq.record(q, true, 3, 1000, 3, { questionId: attemptId("2026-09-29", q.id) });
    wq.record(q, true, 3, 1000, 4);
    wq.record(q, false, 1, 1000, 5);
    expect(wq.tally().answered).toBe(4);
    s.close();
  });

  test("seals the quiz at rest, reads it back, replaces a day and lists days", () => {
    const key = newDataKey();
    const s = new Store(join(dir, "bkt.db"), key);
    const dq = new DailyQuizStore(s, key);
    expect(dq.get(DAY)).toBeNull();
    dq.put(quiz(), 1);
    dq.put({ day: "2026-09-29", questions: [CHOICE] }, 2);
    expect(dq.get(DAY)!.questions.map((q) => q.id)).toEqual(["f1", "c1"]);
    expect(dq.days()).toEqual([DAY, "2026-09-29"]);
    dq.put({ day: DAY, questions: [CHOICE] }, 3);
    expect(dq.get(DAY)!.questions).toHaveLength(1);
    dq.put(quiz(), 4);
    s.db.run("pragma wal_checkpoint(truncate)");
    for (const f of readdirSync(dir)) {
      const bytes = readFileSync(join(dir, f));
      expect(bytes.includes("canary transcript")).toBe(false);
      expect(bytes.includes("Desktop work targets dev")).toBe(false);
    }
    expect(() => dq.put({ day: "bad", questions: [CHOICE] }, 5)).toThrow(DailyQuizError);
    expect(dq.get("../etc")).toBeNull();
    s.close();
  });

  test("a quiz sealed under another key or moved to another day does not open", () => {
    const key = newDataKey();
    const s = new Store(join(dir, "bkt.db"), key);
    const dq = new DailyQuizStore(s, key);
    dq.put(quiz(), 1);
    expect(() => new DailyQuizStore(s, newDataKey()).get(DAY)).toThrow();
    s.db.run("update daily_quiz set day = '2026-09-29'");
    expect(() => dq.get("2026-09-29")).toThrow();
    s.close();
  });
});

describe("daily quiz routes", () => {
  let store: Store;
  let wq: WorkQuizStore;
  let s: Serve;
  let auth: Record<string, string>;
  const req = (path: string, init: { method?: string; body?: unknown } = {}) =>
    fetch(`http://127.0.0.1:${s.port}${path}`, { method: init.method ?? "GET", body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { host: `127.0.0.1:${s.port}`, ...auth } });
  const answer = (b: Record<string, unknown>) => req("/local/work-quiz/answer", { method: "POST", body: { day: DAY, elapsedMs: 4000, ...b } });

  beforeEach(async () => {
    const key = newDataKey();
    store = new Store(join(dir, "bkt.db"), key);
    wq = new WorkQuizStore(store, key);
    s = startServe({ uid: 4, resolvePeerUid: () => 4, routes: workQuizRoutes(wq, { now: () => 777 }) });
    auth = {};
    const nonce = (await (await req("/")).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
    const r = await fetch(`http://127.0.0.1:${s.port}/session`, { method: "POST", body: JSON.stringify({ nonce }), headers: { host: `127.0.0.1:${s.port}`, origin: `http://127.0.0.1:${s.port}` } });
    auth = { authorization: `Bucket ${((await r.json()) as { token: string }).token}` };
  });
  afterEach(() => {
    s.stop();
    store.close();
  });

  test("the day route hides answers and refuses bad or missing days", async () => {
    expect((await req("/local/work-quiz/daily")).status).toBe(400);
    expect((await req("/local/work-quiz/daily?day=2026-02-30")).status).toBe(400);
    expect((await req(`/local/work-quiz/daily?day=${DAY}`)).status).toBe(404);
    wq.daily.put(quiz(), 1);
    const text = await (await req(`/local/work-quiz/daily?day=${DAY}`)).text();
    const got = JSON.parse(text) as { day: string; questions: { id: string }[]; answered: string[] };
    expect([got.day, got.questions.map((q) => q.id), got.answered]).toEqual([DAY, ["f1", "c1"], []]);
    for (const hidden of ["answer\"", "explain", "log10Tolerance", "About a thousand"]) expect(text.includes(hidden)).toBe(false);
  });

  test("a Fermi answer is graded on log10 distance and the distance is stored", async () => {
    wq.daily.put(quiz(), 1);
    const res = (await (await answer({ id: "f1", response: "2,000" })).json()) as { correct: boolean; rating: number; log10Distance: number; answer: string };
    expect([res.correct, res.rating, res.answer]).toEqual([true, 3, "1000"]);
    expect(res.log10Distance).toBeCloseTo(Math.log10(2), 9);
    const row = store.db.query<{ question_id: string; type: string; correct: number; log10_distance: number; at: number }, []>("select question_id, type, correct, log10_distance, at from work_quiz_attempts").get()!;
    expect([row.question_id, row.type, row.correct, row.at]).toEqual([attemptId(DAY, "f1"), "estimate", 1, 777]);
    expect(row.log10_distance).toBeCloseTo(Math.log10(2), 9);
    expect((await answer({ id: "f1", response: "1000" })).status).toBe(409);
    const day = (await (await req(`/local/work-quiz/daily?day=${DAY}`)).json()) as { answered: string[] };
    expect(day.answered).toEqual(["f1"]);
  });

  test("a far Fermi answer is wrong with its distance kept, and a choice answer stores no distance", async () => {
    wq.daily.put(quiz(), 1);
    const far = (await (await answer({ id: "f1", response: "50000" })).json()) as { correct: boolean; rating: number; log10Distance: number };
    expect([far.correct, far.rating]).toEqual([false, 1]);
    expect(far.log10Distance).toBeCloseTo(Math.log10(50), 9);
    const c = (await (await answer({ id: "c1", response: "dev" })).json()) as { correct: boolean; log10Distance: number | null };
    expect([c.correct, c.log10Distance]).toEqual([true, null]);
    expect(store.db.query("select question_id, log10_distance from work_quiz_attempts where question_id = ?").get(attemptId(DAY, "c1"))).toEqual({ question_id: attemptId(DAY, "c1"), log10_distance: null });
    expect(wq.tally()).toEqual({ answered: 2, correct: 1 });
  });

  test("zero, negative and non-numeric Fermi answers are wrong with a null distance", async () => {
    for (const [i, response] of ["0", "-1000", "many"].entries()) {
      wq.daily.put({ day: DAY, questions: [fermi({ ...FERMI, id: `z${i}` })] }, 1);
      const r = (await (await answer({ id: `z${i}`, response })).json()) as { correct: boolean; log10Distance: number | null };
      expect([r.correct, r.log10Distance]).toEqual([false, null]);
    }
  });

  test("bad days, unknown questions and a missing time are refused", async () => {
    wq.daily.put(quiz(), 1);
    expect((await answer({ id: "f1", response: "1000", day: "2026-13-40" })).status).toBe(400);
    expect((await answer({ id: "f1", response: "1000", day: "2026-09-29" })).status).toBe(404);
    expect((await answer({ id: "nope", response: "1000" })).status).toBe(404);
    expect((await answer({ id: "f1", response: "1000", elapsedMs: "fast" })).status).toBe(400);
    expect(wq.tally().answered).toBe(0);
  });

  test("a late answer times out", async () => {
    wq.daily.put(quiz(), 1);
    const r = (await (await answer({ id: "f1", response: "1000", elapsedMs: 200_000 })).json()) as { correct: boolean; timedOut: boolean };
    expect([r.correct, r.timedOut]).toEqual([false, true]);
  });

  test("forget removes stored daily quizzes", async () => {
    wq.daily.put(quiz(), 1);
    await req("/local/work-quiz/forget", { method: "POST", body: {} });
    expect((await req(`/local/work-quiz/daily?day=${DAY}`)).status).toBe(404);
    expect(store.db.query<{ n: number }, []>("select count(*) n from daily_quiz").get()!.n).toBe(0);
  });

  test("two concurrent answers to one question record one attempt", async () => {
    wq.daily.put(quiz(), 1);
    const both = await Promise.all([answer({ id: "f1", response: "1000" }), answer({ id: "f1", response: "5" })]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(wq.tally().answered).toBe(1);
  });

  test("a foreign host or origin is refused, and a foreign peer gets no token for the daily routes", async () => {
    wq.daily.put(quiz(), 1);
    const path = `/local/work-quiz/daily?day=${DAY}`;
    const url = `http://127.0.0.1:${s.port}${path}`;
    expect((await fetch(url, { headers: { host: "evil.example", ...auth } })).status).toBe(403);
    expect((await fetch(url, { headers: { host: `127.0.0.1:${s.port}`, origin: "https://evil.example", ...auth } })).status).toBe(403);
    const other = startServe({ uid: 4, resolvePeerUid: () => 5, routes: workQuizRoutes(wq) });
    try {
      const host = { host: `127.0.0.1:${other.port}` };
      const base = `http://127.0.0.1:${other.port}`;
      expect((await fetch(`${base}/`, { headers: host })).status).toBe(403);
      expect((await fetch(`${base}/session`, { method: "POST", body: JSON.stringify({ nonce: "x" }), headers: { ...host, origin: base } })).status).toBe(403);
      expect((await fetch(`${base}${path}`, { headers: { ...host, ...auth } })).status).toBe(401);
      const post = await fetch(`${base}/local/work-quiz/answer`, { method: "POST", body: JSON.stringify({ day: DAY, id: "f1", response: "1000", elapsedMs: 1 }), headers: { ...host, ...auth } });
      expect(post.status).toBe(401);
    } finally {
      other.stop();
    }
    expect(wq.tally().answered).toBe(0);
  });

  test("the daily route needs the header token", async () => {
    auth = {};
    expect((await req(`/local/work-quiz/daily?day=${DAY}`)).status).toBe(401);
  });
});
