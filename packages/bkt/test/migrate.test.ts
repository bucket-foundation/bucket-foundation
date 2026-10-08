import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeState } from "../../../src/lib/academy/engine";
import { newDataKey } from "../src/crypto";
import { contentItemId, promptHash, schedule } from "../src/grade";
import { RosGraph, syncRosGraph } from "../src/ros";
import { LOCAL_ONLY_TABLES, MIGRATIONS, SCHEMA_VERSION, Store } from "../src/store";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-mig-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const DAY = 86_400_000;

function v2Fixture(path: string) {
  const db = new Database(path, { create: true, strict: true });
  for (const m of MIGRATIONS.slice(0, 2)) db.run(m as string);
  db.run("pragma user_version = 2");
  const item = db.query("insert into items (id, atom_id, branch, title, level, prompt, answer, pack_version) values (?, ?, ?, ?, ?, ?, ?, 'v1')");
  item.run("biophysics/mito/0", "mito", "biophysics", "Mito", "recall", "p0", "a0");
  item.run("biophysics/mito/1", "mito", "biophysics", "Mito", "apply", "p1", "a1");
  item.run("02-physics/k/0", "k", "02-physics", "K", "recall", "pk", "ak");
  item.run("02-physics/new/0", "new", "02-physics", "New", "recall", "pn", "an");
  const card = db.query("insert into cards (item_id, state, updated_at, due) values (?, ?, ?, ?)");
  const older = schedule(null, 3, 1 * DAY);
  const newer = schedule(null, 1, 5 * DAY);
  const k = schedule(null, 4, 2 * DAY);
  card.run("biophysics/mito/0", JSON.stringify(older), 1 * DAY, older.due ?? null);
  card.run("biophysics/mito/1", JSON.stringify(newer), 5 * DAY, newer.due ?? null);
  card.run("02-physics/k/0", JSON.stringify(k), 2 * DAY, k.due ?? null);
  const at = db.query("insert into attempts (id, item_id, mode, response_enc, correct, rating, elapsed_ms, at) values (?, ?, 'review', null, ?, ?, 100, ?)");
  at.run("a1", "biophysics/mito/0", 1, 3, 1 * DAY);
  at.run("a2", "biophysics/mito/1", 0, 1, 5 * DAY);
  at.run("a3", "02-physics/k/0", 1, 4, 2 * DAY);
  db.close();
  return { newer, k };
}

describe("migration 3", () => {
  test("converts v2 TUI cards to engine cards keyed by deck and atom, backfills prof, drops the old table", () => {
    const path = join(dir, "bkt.db");
    const { newer, k } = v2Fixture(path);
    const s = new Store(path, newDataKey());
    expect(s.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(MIGRATIONS.length);
    expect(s.db.query("select name from sqlite_master where name = 'cards'").get()).toBeNull();
    const bio = s.learnState("05-biophysics");
    expect(Object.keys(bio.cards)).toEqual(["mito"]);
    expect(bio.cards.mito).toEqual(newer);
    expect(bio.prof.mito.n).toBe(2);
    const phys = s.learnState("02-physics");
    expect(phys.cards.k).toEqual(k);
    expect(phys.prof.k.n).toBe(1);
    expect(phys.prof.k.theta).toBeGreaterThan(0);
    expect(s.learnState("biophysics").cards).toEqual({});
    expect(s.items().map((i) => i.branch)).toContain("biophysics");
    expect(s.newItemIds(10)).toEqual([contentItemId("02-physics", "new", "pn")]);
    expect(s.dueItemIds(100 * DAY, 10).sort()).toEqual([contentItemId("02-physics", "k", "pk"), contentItemId("05-biophysics", "mito", "p1")].sort());
    expect(s.attempts()).toHaveLength(3);
    s.close();
  });

  test("reopening a migrated database changes nothing", () => {
    const path = join(dir, "bkt.db");
    v2Fixture(path);
    const key = newDataKey();
    const a = new Store(path, key);
    const snap = JSON.stringify([a.learnState("05-biophysics"), a.learnState("02-physics")]);
    a.close();
    const b = new Store(path, key);
    expect(JSON.stringify([b.learnState("05-biophysics"), b.learnState("02-physics")])).toBe(snap);
    b.close();
  });

  test("a failing conversion rolls back to v2", () => {
    const path = join(dir, "bkt.db");
    v2Fixture(path);
    const db = new Database(path, { strict: true });
    db.run("update cards set state = 'not json' where item_id = '02-physics/k/0'");
    db.close();
    expect(() => new Store(path, newDataKey())).toThrow();
    const after = new Database(path, { strict: true });
    expect(after.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(2);
    expect(after.query("select name from sqlite_master where name = 'learn_cards'").get()).toBeNull();
    expect(after.query<{ n: number }, []>("select count(*) n from cards").get()!.n).toBe(3);
    after.close();
  });
});

describe("learn state", () => {
  test("round trips an engine state per deck", () => {
    const s = new Store(":memory:", newDataKey());
    const state = normalizeState({
      cards: { a: schedule(null, 3, DAY) },
      prof: { a: { theta: 0.4, n: 2 } },
      settings: { newPerDay: 7, requestRetention: 0.85 },
      stats: { xp: 12, streak: 3, lastStudyDay: "2026-9-1", history: { "2026-9-1": { new: 1, reviews: 2 } } },
    });
    s.putLearnState("01-mathematics", state, DAY);
    expect(s.learnState("01-mathematics")).toEqual(state);
    expect(s.learnDecks()).toEqual(["01-mathematics"]);
    expect(s.learnUpdatedAt("01-mathematics")).toBe(DAY);
    s.close();
  });
});

describe("migration 11", () => {
  test("keeps v10 learning, notes and quiz data through upgrade, Research OS writes and reopen", () => {
    const path = join(dir, "bkt.db");
    v2Fixture(path);
    const db = new Database(path, { strict: true });
    for (const m of MIGRATIONS.slice(2, 10)) typeof m === "string" ? db.run(m) : m(db);
    db.run("pragma user_version = 10");
    db.query("insert into notes (id, doc, pinned, created_at, updated_at) values ('n1', 'sealed', 0, 1, 1)").run();
    db.query("insert into work_quiz_cards (card_key, fact_id, form, state, due, updated_at, question) values (?, ?, ?, ?, ?, ?, ?)")
      .run("fact1:recall", "fact1", "recall", JSON.stringify(schedule(null, 3, DAY)), 2 * DAY, DAY, '{"prompt":"saved question"}');
    db.query("insert into work_quiz_coverage (cell, fact_id, picks, misses, last_day) values ('cell1', 'fact1', 4, 2, '2026-10-01')").run();
    db.query("insert into work_quiz_attempts (id, question_id, type, correct, rating, elapsed_ms, at) values ('work1', 'daily:2026-10-01:1', 'recall', 1, 3, 500, 1)").run();
    db.query("insert into daily_quiz (day, body, created_at) values (?, ?, ?)").run("2026-10-01", '{"questions":[]}', 1);
    const kept = ["learn_cards", "learn_prof", "attempts", "notes", "work_quiz_cards", "work_quiz_coverage", "work_quiz_attempts", "daily_quiz"];
    const snapshot = (database: Database) =>
      JSON.parse(JSON.stringify(kept.map((table) => database.query(`select * from ${table} order by rowid`).all())).replace(/"item_id":"[^"]*"/g, '"item_id":"-"'));
    const before = snapshot(db);
    db.close();
    const key = newDataKey();
    const s = new Store(path, key);
    expect(s.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(SCHEMA_VERSION);
    const tables = s.db.query<{ name: string }, []>("select name from sqlite_master where type = 'table' and name like 'ros_%' order by name").all().map((t) => t.name);
    expect(tables).toEqual(["ros_edges", "ros_items", "ros_nodes", "ros_profile", "ros_state"]);
    expect(snapshot(s.db)).toEqual(before);
    expect(LOCAL_ONLY_TABLES).toContain("ros_state");
    expect(() => s.db.query("insert into ros_profile (id, updated_at) values (2, 0)").run()).toThrow();
    syncRosGraph(s.db, "test", { physics: [{ id: "heat", title: "Heat", requires: [] }] });
    const graph = new RosGraph(s.db);
    graph.record("physics:heat", "awareness", { action: "open" }, DAY);
    graph.saveProfile("student", "18plus", DAY);
    const state = graph.state("physics:heat");
    const profile = graph.profileRow();
    s.close();
    const reopened = new Store(path, key);
    expect(syncRosGraph(reopened.db, "test", {})).toBe(false);
    expect(snapshot(reopened.db)).toEqual(before);
    expect(new RosGraph(reopened.db).state("physics:heat")).toEqual(state);
    expect(new RosGraph(reopened.db).profileRow()).toEqual(profile);
    expect(new RosGraph(reopened.db).byId("physics:heat")?.title).toBe("Heat");
    reopened.close();
  });
});

describe("migration 13", () => {
  const quiz = (deck: string, atom: string, prompt: string) => ({ id: contentItemId(deck, atom, prompt), atomId: atom, branch: deck, title: atom, level: "recall", prompt, answer: `a:${prompt}` });

  function v12Fixture(path: string) {
    const db = new Database(path, { create: true, strict: true });
    MIGRATIONS.slice(0, 12).forEach((m) => (typeof m === "string" ? db.run(m) : m(db)));
    db.run("pragma user_version = 12");
    const item = db.query("insert into items (id, atom_id, branch, deck, title, level, prompt, answer, pack_version) values (?, ?, ?, ?, ?, 'recall', ?, ?, 'v1')");
    item.run("01-math/nernst/0", "nernst", "01-math", "01-math", "N", "first?", "a1");
    item.run("01-math/nernst/1", "nernst", "01-math", "01-math", "N", "second?", "a2");
    item.run("02-physics/nernst/0", "nernst", "02-physics", "02-physics", "N", "other deck?", "a3");
    item.run("biophysics/mito/0", "mito", "biophysics", "05-biophysics", "M", "legacy?", "a4");
    const at = db.query("insert into attempts (id, item_id, mode, response_enc, correct, rating, elapsed_ms, at) values (?, ?, 'quiz', null, 1, 3, 100, ?)");
    at.run("t1", "01-math/nernst/0", 1);
    at.run("t2", "01-math/nernst/1", 2);
    at.run("t3", "02-physics/nernst/0", 3);
    at.run("t4", "biophysics/mito/0", 4);
    db.close();
  }

  test("rewrites stored attempts to content ids and keeps each on its prompt", () => {
    const path = join(dir, "bkt.db");
    v12Fixture(path);
    const s = new Store(path, newDataKey());
    expect(s.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(13);
    const rows = s.db.query<{ id: string; prompt: string }, []>("select i.id, i.prompt from attempts a join items i on i.id = a.item_id order by a.at").all();
    expect(rows.map((r) => r.prompt)).toEqual(["first?", "second?", "other deck?", "legacy?"]);
    expect(rows.map((r) => r.id)).toEqual([
      contentItemId("01-math", "nernst", "first?"),
      contentItemId("01-math", "nernst", "second?"),
      contentItemId("02-physics", "nernst", "other deck?"),
      "05-biophysics/mito/" + promptHash("legacy?"),
    ]);
    expect(s.db.query("select 1 from items where id like '%/0' or id like '%/1'").get()).toBeNull();
    expect(s.db.query<{ n: number }, []>("select count(*) n from attempts").get()!.n).toBe(4);
    s.close();
  });

  test("same atom id in two decks gets distinct ids", () => {
    expect(contentItemId("01-math", "nernst", "q?")).not.toBe(contentItemId("02-physics", "nernst", "q?"));
  });

  test("a pack import after the migration reuses the migrated rows and retires what the pack dropped", () => {
    const path = join(dir, "bkt.db");
    v12Fixture(path);
    const s = new Store(path, newDataKey());
    s.importPack("v2", [quiz("01-math", "nernst", "second?"), quiz("01-math", "nernst", "inserted?")]);
    const live = s.items().map((i) => i.prompt).sort();
    expect(live).toEqual(["inserted?", "second?"]);
    expect(s.db.query<{ retired: number }, [string]>("select retired from items where id = ?").get(contentItemId("01-math", "nernst", "first?"))!.retired).toBe(1);
    expect(s.db.query<{ n: number }, []>("select count(*) n from attempts").get()!.n).toBe(4);
    s.close();
  });
});
