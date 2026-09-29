import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDataKey, open, seal } from "../src/crypto";
import { answerQuiz, answerReview, pickSession, quizQuestions } from "../src/deck";
import type { Item } from "../src/grade";
import { buildPack, itemsFromCorpus } from "../src/pack/export";
import { Store } from "../src/store";

const items: Item[] = ["a", "b", "c", "d", "e"].map((id) => ({
  id: `phys/${id}/0`,
  atomId: id,
  branch: "phys",
  title: id,
  level: "recall",
  prompt: `what is ${id}`,
  answer: `answer ${id}`,
}));

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
  test("runs in WAL mode and migrates once", () => {
    const key = newDataKey();
    const path = join(dir, "bkt.db");
    const s = new Store(path, key);
    expect(s.journalMode()).toBe("wal");
    s.close();
    const again = new Store(path, key);
    expect(again.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(1);
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
    const session = pickSession(s, now, 3, "seed");
    expect(session).toHaveLength(3);
    const [q] = quizQuestions(s, session, "seed");
    const r = answerQuiz(s, q, q.answerIndex, 1000, now);
    expect(r.correct).toBe(true);
    expect(s.card(q.itemId)!.due!).toBeGreaterThan(now);
    const wrong = quizQuestions(s, session, "seed")[1];
    answerQuiz(s, wrong, (wrong.answerIndex + 1) % wrong.choices.length, 1000, now);
    expect(s.dueItemIds(now + 86_400_000, 10)).toContain(wrong.itemId);
    expect(s.attempts()).toHaveLength(2);
    s.close();
  });

  test("pickSession puts due cards before new ones", () => {
    const s = new Store(":memory:", newDataKey());
    s.importPack("v1", items);
    answerReview(s, items[4].id, 1, 500, 0);
    const picked = pickSession(s, 86_400_000, 2, "x");
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
      ["02-physics/k/0", "recall"],
      ["02-physics/k/2", "apply"],
    ]);
  });

  test("builds from the repo corpus with a content-hash version", () => {
    const pack = buildPack(join(import.meta.dir, "../../../learning/app/corpus"));
    expect(pack.items.length).toBeGreaterThan(500);
    expect(pack.version).toMatch(/^[0-9a-f]{12}$/);
    expect(new Set(pack.items.map((i) => i.id)).size).toBe(pack.items.length);
  });
});
