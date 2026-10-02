import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey } from "../src/crypto";
import { LOCAL_ONLY_TABLES, MIGRATIONS, SCHEMA_VERSION, Store } from "../src/store";
import { cardKey } from "../../../src/lib/research-os/work-quiz/fact";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-cards-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const v8 = (path: string) => {
  const db = new Database(path, { create: true, strict: true });
  for (const m of MIGRATIONS.slice(0, 8)) {
    if (typeof m === "string") db.run(m);
    else m(db);
  }
  db.run("pragma user_version = 8");
  db.run("insert into work_quiz_attempts (id, question_id, type, correct, rating, elapsed_ms, at) values ('a1', 'recall-pr-341', 'recall', 1, 3, 2000, 100)");
  db.close();
};

describe("schema 9 work quiz cards", () => {
  test("a v8 database migrates to 9, keeps attempts, and the card table stays local", () => {
    const path = join(dir, "bkt.db");
    v8(path);
    const s = new Store(path, newDataKey());
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(9);
    expect(s.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(SCHEMA_VERSION);
    expect(s.db.query("select id, correct from work_quiz_attempts").all()).toEqual([{ id: "a1", correct: 1 }]);
    expect(LOCAL_ONLY_TABLES).toContain("work_quiz_cards");
    s.close();
  });

  test("cards key on fact.id|form and a second write for the same key updates one row", () => {
    const s = new Store(join(dir, "bkt.db"), newDataKey());
    const k = s.putWorkQuizCard("pr:504", "order", "{}", 10, 1);
    expect(k).toBe(cardKey("pr:504", "order"));
    s.putWorkQuizCard("pr:504", "order", '{"reps":1}', 20, 2);
    s.putWorkQuizCard("pr:504", "compare", "{}", 30, 3);
    expect(s.db.query("select card_key, state, due from work_quiz_cards order by card_key").all()).toEqual([
      { card_key: "pr:504|compare", state: "{}", due: 30 },
      { card_key: "pr:504|order", state: '{"reps":1}', due: 20 },
    ]);
    s.close();
  });

  test("the local key and the Supabase key function agree for the same fact and form", () => {
    const root = join(import.meta.dir, "../../../supabase/migrations");
    const file = readdirSync(root).find((f) => f.endsWith("_research_os_work_quiz_card_key.sql"))!;
    const sql = readFileSync(join(root, file), "utf8");
    const body = sql.match(/select (p_fact_id \|\| '\|' \|\| p_form)/)![1];
    const db = new Database(":memory:");
    for (const [fact, form] of [["pr:504", "order"], ["bead:bkt-33cg", "true_false"], ["note:a.md#b c", "compare"], ["count:prs-month-2026-09", "estimate"]] as const) {
      const row = db.query<{ k: string }, [string, string]>(`select ${body.replace("p_fact_id", "?1").replace("p_form", "?2")} as k`).get(fact, form)!;
      expect(row.k).toBe(cardKey(fact, form));
    }
    db.close();
  });
});
