import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey } from "../src/crypto";
import { LOCAL_ONLY_TABLES, MIGRATIONS, SCHEMA_VERSION, Store } from "../src/store";
import { WorkQuizStore, workQuizRoutes } from "../src/work-quiz";
import { cellStats, sampleQuiz } from "../../../src/lib/research-os/work-quiz/sampler";
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
  test("a v9 database migrates to 10 and the coverage table stays local", () => {
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
    expect(SCHEMA_VERSION).toBe(10);
    expect(s.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(10);
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
});
