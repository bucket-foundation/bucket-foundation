import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkLimits, LIMITS, countTokens } from "../../../src/lib/research-os/work-quiz/limits";
import { newDataKey } from "../src/crypto";
import { pickSession, quizQuestions } from "../src/deck";
import type { Item } from "../src/grade";
import { itemsFromCorpus } from "../src/pack/export";
import { buildShortQuestion, hasShort, normShort, SHORT_FIELDS, withShort } from "../src/short-fields";
import { Store } from "../src/store";

const corpusDir = resolve(import.meta.dir, "../../../learning/app/corpus");
const items: Item[] = readdirSync(corpusDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .flatMap((f) => {
    const c = JSON.parse(readFileSync(join(corpusDir, f), "utf8"));
    return Array.isArray(c.atoms) ? itemsFromCorpus(f.replace(/\.json$/, ""), c) : [];
  });
const pool = items.map((i) => withShort(i)).filter(hasShort);

describe("quiz short fields", () => {
  test("every short field belongs to a corpus item", () => {
    const ids = new Set(items.map((i) => i.id));
    expect(Object.keys(SHORT_FIELDS.items).filter((id) => !ids.has(id))).toEqual([]);
    expect(pool.length).toBeGreaterThan(100);
  });

  test("short answers appear verbatim in the full answer and are unique within a branch", () => {
    const seen = new Set<string>();
    for (const i of pool) {
      expect(i.answer.includes(i.shortAnswer)).toBe(true);
      expect(countTokens(i.shortAnswer)).toBeLessThanOrEqual(LIMITS.option);
      expect(countTokens(i.shortPrompt)).toBeLessThanOrEqual(LIMITS.stem);
      const key = `${i.branch}|${normShort(i.shortAnswer)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  test("every question built from the corpus passes checkLimits", () => {
    for (const seed of ["s1", "s2", "s3"]) {
      for (const i of pool) {
        const q = buildShortQuestion(i, pool, seed);
        expect(q).not.toBeNull();
        expect(checkLimits(q!)).toEqual([]);
        expect(q!.choices[q!.answerIndex]).toBe(i.shortAnswer);
      }
    }
  });

  test("the learning quiz draws short items first and they pass checkLimits", () => {
    const s = new Store(":memory:", newDataKey());
    s.importPack("v1", items);
    const session = pickSession(s, 10_000_000, 50, "seed");
    expect(session.length).toBe(50);
    expect(session.every((i) => SHORT_FIELDS.items[i.id])).toBe(true);
    const qs = quizQuestions(s, session, "seed");
    expect(qs.length).toBe(50);
    for (const q of qs) expect(checkLimits(q)).toEqual([]);
    s.close();
  });
});

describe("long fallback", () => {
  test("a deck with 5 short and 10 long items yields the 5 short first, then long ones flagged", () => {
    const deck: Item[] = Array.from({ length: 15 }, (_, n) => ({
      id: `d/a${String(n).padStart(2, "0")}/0`,
      atomId: `a${String(n).padStart(2, "0")}`,
      branch: "d",
      title: `T${n}`,
      level: "recall",
      prompt: `Which value is listed as number ${n} in the long reference table for this deck today?`,
      answer: `The value listed as number ${n} is the long answer text ${n}`,
    }));
    const shortIds = [2, 5, 8, 11, 14].map((n) => deck[n].id);
    const file = { version: "t", items: Object.fromEntries(shortIds.map((id, k) => [id, { short_stem: `What is item ${k}?`, short_answer: `value ${k}`, source: "rule" as const }])) };
    const s = new Store(":memory:", newDataKey());
    s.importPack("v1", deck);
    const session = pickSession(s, 10_000_000, 15, "seed", file);
    expect(session.slice(0, 5).map((i) => i.id).sort()).toEqual(shortIds.sort());
    const qs = quizQuestions(s, session, "seed", file);
    expect(qs).toHaveLength(15);
    expect(qs.slice(0, 5).every((q) => !q.long && checkLimits(q).length === 0)).toBe(true);
    expect(qs.slice(5).every((q) => q.long === true)).toBe(true);
    s.close();
  });
});

describe("quiz short-fields extractor", () => {
  test("a run without the model reproduces the committed file", () => {
    const out = resolve(import.meta.dir, "../../../learning/app/short-fields.json");
    const before = readFileSync(out, "utf8");
    const run = Bun.spawnSync(["bun", "run", resolve(import.meta.dir, "../scripts/quiz-short-fields.ts")], { env: { ...process.env, BKT_LLM_URL: "http://127.0.0.1:9" } });
    expect(run.exitCode).toBe(0);
    expect(readFileSync(out, "utf8")).toBe(before);
  }, 120_000);
});
