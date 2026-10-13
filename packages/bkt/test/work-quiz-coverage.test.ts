import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey } from "../src/crypto";
import { LOCAL_ONLY_TABLES, MIGRATIONS, SCHEMA_VERSION, Store } from "../src/store";
import { WorkQuizStore, workQuizRoutes } from "../src/work-quiz";
import { cellStats, dueFrom, sampleQuiz } from "../../../src/lib/research-os/work-quiz/sampler";
import { parseDailyQuiz } from "../src/daily-quiz";
import type { BeadFact } from "../../../src/lib/research-os/work-quiz/types";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-coverage-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const TITLES = JSON.parse(readFileSync(join(import.meta.dir, "../../../scripts/fixtures/quiz-titles.json"), "utf8")) as { beads: string[] };
const BEADS: BeadFact[] = TITLES.beads.map((title, i) => ({ id: `bkt-f${i.toString(36)}`, title, status: ["open", "closed", "in_progress"][i % 3], priority: i % 5, createdAt: "2026-09-01" }));

describe("schema 10 coverage", () => {
  test("a v9 database migrates to the current schema and the coverage table stays local", () => {
    const path = join(dir, "bkt.db");
    const db = new Database(path, { create: true, strict: true });
    for (const m of MIGRATIONS.slice(0, 9)) {
      if (typeof m === "string") db.run(m);
      else m(db);
    }
    db.run("pragma user_version = 9");
    db.run("insert into work_quiz_cards (card_key, fact_id, form, state, due, updated_at) values ('pr:1|order', 'pr:1', 'order', '{}', 1, 1)");
    db.close();
    const s = new Store(path, newDataKey());
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(10);
    expect(s.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(SCHEMA_VERSION);
    expect(s.db.query("select card_key from work_quiz_cards").all()).toEqual([{ card_key: "pr:1|order" }]);
    expect(LOCAL_ONLY_TABLES).toContain("work_quiz_coverage");
    s.close();
  });

  test("picks and misses persist and feed the next sample", () => {
    const key = newDataKey();
    const s = new Store(join(dir, "bkt.db"), key);
    const wq = new WorkQuizStore(s, key);
    const first = sampleQuiz({ day: "2026-10-01", sources: { beads: BEADS, prs: [], notes: [], repoUrl: null } });
    wq.recordPicks(first.picks, "2026-10-01");
    wq.recordPicks(first.picks.slice(0, 1), "2026-10-02");
    const stats = cellStats(wq.coverage());
    expect(stats.get(first.picks[0].cell)).toEqual({ picks: 2, lastDay: "2026-10-02" });
    wq.record(first.questions[0], false, 1, 1000, Date.parse("2026-10-02T10:00:00Z"));
    expect(wq.coverage().filter((r) => r.cell === "miss").map((r) => r.misses)).toEqual([1]);
    s.close();
  });

  test("the daily route serves the sampled quiz for today and bkt daily reads the stored copy", async () => {
    const key = newDataKey();
    const s = new Store(join(dir, "bkt.db"), key);
    const wq = new WorkQuizStore(s, key);
    wq.setBeads(BEADS, 1);
    const at = Date.parse("2026-10-01T15:00:00");
    const routes = workQuizRoutes(wq, { now: () => at, log: () => {} });
    const day = new Date(at).toLocaleDateString("en-CA");
    const res = await routes["GET /local/work-quiz/daily"](new Request("http://x"), new URL(`http://x/?day=${day}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { questions: { id: string }[] };
    const want = sampleQuiz({ day, sources: { beads: BEADS, prs: [], notes: [], repoUrl: null } });
    expect(body.questions.map((q) => q.id)).toEqual(want.questions.map((q) => q.id));
    expect(wq.daily.get(day)!.questions.map((q) => q.id)).toEqual(want.questions.map((q) => q.id));
    expect(() => parseDailyQuiz({ day, questions: want.questions })).not.toThrow();
    expect(cellStats(wq.coverage()).size).toBe(want.picks.length);
    s.close();
  });

  test("/next serves a card that came due from a wrong answer, and a day's samples never repeat a fact", async () => {
    const key = newDataKey();
    const s = new Store(join(dir, "bkt.db"), key);
    const wq = new WorkQuizStore(s, key);
    wq.setBeads(BEADS, 1);
    let at = Date.parse("2026-10-01T09:00:00");
    const routes = workQuizRoutes(wq, { now: () => at, log: () => {} });
    const next = async () => (await (await routes["GET /local/work-quiz/next"](new Request("http://x"), new URL("http://x/"))).json()) as { id: string };
    const first = await next();
    const ans = await routes["POST /local/work-quiz/answer"](new Request("http://x", { method: "POST", body: JSON.stringify({ id: first.id, response: "no such choice", elapsedMs: 1000 }) }), new URL("http://x/"));
    expect(((await ans.json()) as { correct: boolean }).correct).toBe(false);
    expect(wq.dueCards(at + 86_400_000).map((c) => c.question.id)).toEqual([first.id]);
    at += 86_400_000 + 1;
    expect((await next()).id).toBe(first.id);
    const facts: string[] = [];
    at = Date.parse("2026-10-05T09:00:00");
    for (let i = 0; i < 6; i++) {
      const q = await next();
      const day = wq.coverage().filter((r) => r.lastDay === "2026-10-05" && r.cell !== "miss");
      facts.push(...day.flatMap((r) => r.factId.split("+")));
      expect(q.id).toBeTruthy();
    }
    const today = wq.coverage().filter((r) => r.lastDay === "2026-10-05" && r.cell !== "miss").flatMap((r) => r.factId.split("+"));
    expect(new Set(today).size).toBe(today.length);
    expect(today.length).toBeGreaterThanOrEqual(6);
    s.close();
  });

  test("the daily build places due cards in the review slots", async () => {
    const key = newDataKey();
    const s = new Store(join(dir, "bkt.db"), key);
    const wq = new WorkQuizStore(s, key);
    wq.setBeads(BEADS, 1);
    const sources = { beads: BEADS, prs: [], notes: [], repoUrl: null };
    const old = sampleQuiz({ day: "2026-09-20", sources }).questions[0];
    wq.record(old, false, 1, 1000, Date.parse("2026-09-20T10:00:00"));
    const at = Date.parse("2026-10-01T15:00:00");
    const day = new Date(at).toLocaleDateString("en-CA");
    expect(dueFrom(old, 0).cardKey).toContain("|");
    const routes = workQuizRoutes(wq, { now: () => at, log: () => {} });
    const res = await routes["GET /local/work-quiz/daily"](new Request("http://x"), new URL(`http://x/?day=${day}`));
    const body = (await res.json()) as { questions: { id: string }[] };
    expect(body.questions[0].id).toBe(old.id);
    s.close();
  });
});
