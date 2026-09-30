import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeState } from "../../../src/lib/academy/engine";
import { newDataKey } from "../src/crypto";
import { schedule } from "../src/grade";
import { MIGRATIONS, Store } from "../src/store";

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
    expect(s.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(3);
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
    expect(s.newItemIds(10)).toEqual(["02-physics/new/0"]);
    expect(s.dueItemIds(100 * DAY, 10).sort()).toEqual(["02-physics/k/0", "biophysics/mito/0"]);
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
