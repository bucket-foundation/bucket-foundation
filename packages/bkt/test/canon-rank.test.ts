import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { rankCanon, tokenRank, type ClaimIndexEntry } from "../../../src/lib/canon-rank";

const ENTRY = resolve(import.meta.dir, "../../../src/lib/canon-rank.ts");
const IMPORT = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;

function importChain(entry: string): { files: string[]; specifiers: string[] } {
  const files: string[] = [];
  const specifiers: string[] = [];
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop() as string;
    if (files.includes(file)) continue;
    files.push(file);
    for (const m of readFileSync(file, "utf8").matchAll(IMPORT)) {
      specifiers.push(m[1]);
      if (m[1].startsWith(".")) queue.push(`${join(dirname(file), m[1])}.ts`);
    }
  }
  return { files, specifiers };
}

function entry(rowid: number, branch: string, text: string): ClaimIndexEntry {
  return { rowid, branch, concept: "c", slug: `s${rowid}`, title: "", path: "", text, vec: new Float32Array([rowid, 1]) };
}

const INDEX = [
  entry(0, "02-physics", "Entropy rises. Entropy never falls."),
  entry(1, "05-biophysics", "Light and water."),
  entry(2, "02-physics", "Light carries entropy away."),
];

test("the ranking module has no alias, fs or Next import anywhere in its chain", () => {
  const { specifiers } = importChain(ENTRY);
  expect(specifiers.filter((s) => s.startsWith("@/") || /^(node:)?(fs|path|os)$/.test(s) || s.startsWith("next"))).toEqual([]);
  expect(readFileSync(ENTRY, "utf8")).not.toMatch(/process\.|Buffer|require\(/);
});

test("it ranks an injected index under bun with no loader", () => {
  expect(tokenRank(INDEX, "entropy", 2).map((h) => [h.entry.rowid, h.score])).toEqual([[0, 2], [2, 1]]);
  const found = rankCanon({ loadIndex: () => INDEX, decodeQVec: () => null }, { q: "light", qvec: null, topK: 5, tier: "all", branch: "02-physics", mode: "hybrid" });
  expect(found.ok && found.mode).toBe("lexical");
  expect(found.ok && found.results.map((h) => [h.entry.rowid, h.score])).toEqual([[2, 1], [0, 0]]);
});

test("an injected decoder switches it to cosine ranking", () => {
  const found = rankCanon({ loadIndex: () => INDEX, decodeQVec: () => new Float32Array([1, 0]) }, { q: "", qvec: "x", topK: 2, tier: "all", branch: "", mode: "hybrid" });
  expect(found.ok && found.mode).toBe("semantic");
  expect(found.ok && found.results.map((h) => [h.entry.rowid, h.score])).toEqual([[2, 2], [1, 1]]);
});

test("an empty injected index and a missing query are refused", () => {
  const p = { q: "light", qvec: null, topK: 5, tier: "all", branch: "", mode: "hybrid" };
  expect(rankCanon({ loadIndex: () => [], decodeQVec: () => null }, p)).toMatchObject({ ok: false, status: 503 });
  expect(rankCanon({ loadIndex: () => INDEX, decodeQVec: () => null }, { ...p, q: "" })).toMatchObject({ ok: false, status: 400 });
});
