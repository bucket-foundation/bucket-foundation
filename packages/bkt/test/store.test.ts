import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey, open, seal } from "../src/crypto";
import { answerQuiz, answerReview, pickSession, quizQuestions } from "../src/deck";
import { contentItemId, type Item } from "../src/grade";
import type { ShortFile } from "../src/short-fields";
import { buildPack, itemsFromCorpus } from "../src/pack/export";
import { CACHE_KIB, SCHEMA_VERSION, Store, WAL_CHECKPOINT_PAGES, WAL_LIMIT_BYTES } from "../src/store";

const items: Item[] = ["a", "b", "c", "d", "e"].map((id) => ({
  id: `phys/${id}/0`,
  atomId: id,
  branch: "phys",
  title: id,
  level: "recall",
  prompt: `what is ${id}`,
  answer: `answer ${id}`,
}));

const shorts: ShortFile = { version: "t", items: Object.fromEntries(items.map((i) => [i.id, { short_stem: i.prompt, short_answer: i.answer, source: "rule" as const }])) };

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-store-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("crypto", () => {
  test("seal round trips and binds aad", () => {
    const key = newDataKey();
    const s = seal(key, "hello", "ctx");
    expect(open(key, s, "ctx")).toBe("hello");
    expect(() => open(key, s, "other")).toThrow();
    expect(() => open(newDataKey(), s, "ctx")).toThrow();
    expect(() => open(key, "v0:abc")).toThrow("unknown ciphertext version");
  });
});

describe("Store", () => {
  test("bounds the page cache and the checkpoint interval", () => {
    const s = new Store(join(dir, "bkt.db"), newDataKey());
    const one = (q: string) => Object.values(s.db.query<Record<string, number>, []>(q).get()!)[0];
    expect(one("pragma wal_autocheckpoint")).toBe(WAL_CHECKPOINT_PAGES);
    expect(one("pragma journal_size_limit")).toBe(WAL_LIMIT_BYTES);
    expect(one("pragma cache_size")).toBe(-CACHE_KIB);
    expect(WAL_LIMIT_BYTES).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(CACHE_KIB).toBeLessThanOrEqual(16 * 1024);
    s.close();
  });

  test("the WAL shrinks back under its limit after a large write", () => {
    const path = join(dir, "bkt.db");
    const s = new Store(path, newDataKey());
    s.db.run("create table wal_probe (id integer primary key, body text)");
    const insert = s.db.query("insert into wal_probe (body) values (?)");
    s.db.transaction(() => {
      for (let i = 0; i < 5000; i++) insert.run("x".repeat(4000));
    })();
    expect(statSync(`${path}-wal`).size).toBeGreaterThan(4 * WAL_LIMIT_BYTES);
    for (let i = 0; i < 3; i++) insert.run("y");
    expect(statSync(`${path}-wal`).size).toBeLessThanOrEqual(WAL_LIMIT_BYTES);
    s.close();
  });

  test("runs in WAL mode and migrates once", () => {
    const key = newDataKey();
    const path = join(dir, "bkt.db");
    const s = new Store(path, key);
    expect(s.journalMode()).toBe("wal");
    s.close();
    const again = new Store(path, key);
    expect(again.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(SCHEMA_VERSION);
    again.close();
  });

  test("a second connection reads while the first holds the db", () => {
    const key = newDataKey();
    const path = join(dir, "bkt.db");
    const a = new Store(path, key);
    a.importPack("v1", items);
    const b = new Store(path, key);
    expect(b.items()).toHaveLength(5);
    a.close();
    b.close();
  });

  test("rejects a different data key", () => {
    const path = join(dir, "bkt.db");
    new Store(path, newDataKey()).close();
    expect(() => new Store(path, newDataKey())).toThrow("data key does not match");
  });

  test("importPack skips an unchanged version and upserts a new one", () => {
    const s = new Store(":memory:", newDataKey());
    expect(s.importPack("v1", items)).toBe(5);
    expect(s.importPack("v1", items)).toBe(0);
    expect(s.importPack("v2", [{ ...items[0], answer: "changed" }])).toBe(1);
    expect(s.items().find((i) => i.id === items[0].id)!.answer).toBe("changed");
    s.close();
  });

  test("responses are encrypted at rest and readable with the key", () => {
    const key = newDataKey();
    const path = join(dir, "bkt.db");
    const s = new Store(path, key);
    s.importPack("v1", items);
    s.recordAttempt({ itemId: items[0].id, mode: "quiz", response: "PLAINTEXT-MARKER", correct: true, rating: 3, elapsedMs: 1200, at: 1 });
    expect(s.attempts()[0].response).toBe("PLAINTEXT-MARKER");
    expect(s.outboxCount()).toBe(1);
    s.db.run("pragma wal_checkpoint(truncate)");
    s.close();
    for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f)).includes("PLAINTEXT-MARKER")).toBe(false);
  });

  test("quiz answers write an attempt and schedule a card", () => {
    const s = new Store(":memory:", newDataKey());
    s.importPack("v1", items);
    const now = 10_000_000;
    const session = pickSession(s, now, 3, "seed", shorts);
    expect(session).toHaveLength(3);
    const [q] = quizQuestions(s, session, "seed", shorts);
    const r = answerQuiz(s, q, q.answerIndex, 1000, now);
    expect(r.correct).toBe(true);
    expect(s.card(q.itemId)!.due!).toBeGreaterThan(now);
    const wrong = quizQuestions(s, session, "seed", shorts)[1];
    answerQuiz(s, wrong, (wrong.answerIndex + 1) % wrong.choices.length, 1000, now);
    expect(s.dueItemIds(now + 86_400_000, 10)).toContain(wrong.itemId);
    expect(s.attempts()).toHaveLength(2);
    s.close();
  });

  test("pickSession puts due cards before new ones", () => {
    const s = new Store(":memory:", newDataKey());
    s.importPack("v1", items);
    answerReview(s, items[4].id, 1, 500, 0);
    const picked = pickSession(s, 86_400_000, 2, "x", shorts);
    expect(picked[0].id).toBe(items[4].id);
    expect(s.stats(86_400_000)).toEqual({ items: 5, seen: 1, due: 1, attempts: 1 });
    s.close();
  });
});

describe("content pack", () => {
  test("skips empty quiz rows and assigns stable ids", () => {
    const out = itemsFromCorpus("02-physics", {
      atoms: [{ id: "k", title: "K", quiz: [{ prompt: "p", answer: "a" }, { prompt: " ", answer: "x" }, { level: "apply", prompt: "p2", answer: "a2" }] }],
    });
    expect(out.map((i) => [i.id, i.level])).toEqual([
      [contentItemId("02-physics", "k", "p"), "recall"],
      [contentItemId("02-physics", "k", "p2"), "apply"],
    ]);
  });

  test("builds from the repo corpus with a content-hash version", () => {
    const pack = buildPack(join(import.meta.dir, "../../../learning/app/corpus"));
    expect(pack.items.length).toBeGreaterThan(500);
    expect(pack.version).toMatch(/^[0-9a-f]{12}$/);
    expect(new Set(pack.items.map((i) => i.id)).size).toBe(pack.items.length);
    expect(pack.decks!.map((d) => d.id)).toContain("05-biophysics");
    expect(pack.decks!.find((d) => d.id === "05-biophysics")!.source).toBe("biophysics");
    expect(pack.decks!.every((d) => pack.atoms![d.id].length === d.atoms)).toBe(true);
    expect(Object.keys(pack.atoms!)).not.toContain("lang-core");
  });
});

describe("content item ids", () => {
  const mk = (prompts: string[], deck = "01-math", atom = "a") =>
    prompts.map((p) => ({ id: contentItemId(deck, atom, p), atomId: atom, branch: deck, title: atom, level: "recall", prompt: p, answer: `ans ${p}` }));
  const promptOf = (s: Store, itemId: string) => s.db.query<{ prompt: string }, [string]>("select prompt from items where id = ?").get(itemId)!.prompt;

  function attempted(s: Store, items: ReturnType<typeof mk>) {
    items.forEach((i, n) => s.recordAttempt({ itemId: i.id, mode: "quiz", response: null, correct: true, rating: 3, elapsedMs: 1, at: n + 1 }));
  }

  test("reorder keeps every attempt on its prompt", () => {
    const s = new Store(":memory:", newDataKey());
    const items = mk(["p1", "p2", "p3"]);
    s.importPack("v1", items);
    attempted(s, items);
    s.importPack("v2", [...items].reverse());
    expect(s.attempts().map((a) => promptOf(s, a.itemId))).toEqual(["p1", "p2", "p3"]);
    s.close();
  });

  test("insert and delete keep every attempt on its prompt", () => {
    const s = new Store(":memory:", newDataKey());
    const items = mk(["p1", "p2", "p3"]);
    s.importPack("v1", items);
    attempted(s, items);
    s.importPack("v2", [...mk(["new"]), items[0], items[2]]);
    expect(s.attempts().map((a) => promptOf(s, a.itemId))).toEqual(["p1", "p2", "p3"]);
    expect(s.items().map((i) => i.prompt).sort()).toEqual(["new", "p1", "p3"]);
    s.close();
  });

  test("an absent item with no attempts is deleted", () => {
    const s = new Store(":memory:", newDataKey());
    const items = mk(["p1", "p2"]);
    s.importPack("v1", items);
    s.importPack("v2", [items[0]]);
    expect(s.db.query<{ n: number }, []>("select count(*) n from items").get()!.n).toBe(1);
    s.close();
  });

  test("a repeated atom id across decks yields distinct ids", () => {
    const s = new Store(":memory:", newDataKey());
    const both = [...mk(["same?"], "01-math", "nernst"), ...mk(["same?"], "02-physics", "nernst")];
    expect(new Set(both.map((i) => i.id)).size).toBe(2);
    s.importPack("v1", both);
    expect(s.items()).toHaveLength(2);
    s.close();
  });

  test("same-prompt items get ids that do not depend on order", () => {
    const quiz = [{ prompt: "same?", answer: "one" }, { prompt: "same?", answer: "two" }];
    const a = itemsFromCorpus("01-math", { atoms: [{ id: "x", title: "X", quiz }] } as never);
    const b = itemsFromCorpus("01-math", { atoms: [{ id: "x", title: "X", quiz: [...quiz].reverse() }] } as never);
    expect(new Set(a.map((i) => i.id)).size).toBe(2);
    expect(Object.fromEntries(a.map((i) => [i.answer, i.id]))).toEqual(Object.fromEntries(b.map((i) => [i.answer, i.id])));
  });
});
