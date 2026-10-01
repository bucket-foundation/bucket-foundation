import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cosineRank, tokenRank, type CanonHit, type ClaimIndexEntry } from "../src/lib/canon-rank";

const VECTORS = path.join(__dirname, "..", "lean", "vectors", "ranking-order.txt");
const EXPECTED_CASES = 10000;
const SHUFFLED_MISMATCHES = 4677;
const TOKEN = "photon";

type Row = { id: number; score: number };
type Case = { input: Row[]; leanOrder: number[] };

function parseCases(): Case[] {
  return fs
    .readFileSync(VECTORS, "utf8")
    .split("\n")
    .slice(0, -1)
    .map((line) => {
      const [left, right] = line.split("|");
      const input = left ? left.split(" ").map((pair) => { const [id, score] = pair.split(":").map(Number); return { id, score }; }) : [];
      return { input, leanOrder: right ? right.split(" ").map(Number) : [] };
    });
}

function entry(row: Row, text: string): ClaimIndexEntry {
  return { rowid: row.id, branch: "b", concept: "c", slug: `s${row.id}`, title: "t", path: "p", text, vec: new Float32Array([row.score]) };
}

function cosineOrder(rows: Row[]): CanonHit[] {
  return cosineRank(rows.map((r) => entry(r, "")), new Float32Array([1]), rows.length);
}

function tokenOrder(rows: Row[]): CanonHit[] {
  return tokenRank(rows.map((r) => entry(r, Array(r.score).fill(TOKEN).join(" "))), TOKEN, rows.length);
}

function ids(hits: CanonHit[]): number[] {
  return hits.map((h) => h.entry.rowid);
}

function same(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function hasTie(rows: Row[]): boolean {
  return new Set(rows.map((r) => r.score)).size < rows.length;
}

const byId = (rows: Row[]) => [...rows].sort((a, b) => a.id - b.id);
const nonNegative = (rows: Row[]) => rows.every((r) => r.score >= 0);

const cases = parseCases();

test("the Lean vectors hold 10,000 cases with ties, zero scores and negative scores", () => {
  assert.equal(cases.length, EXPECTED_CASES);
  assert.ok(cases.filter((c) => hasTie(c.input)).length > 5000);
  assert.ok(cases.some((c) => c.input.some((r) => r.score === 0)));
  assert.ok(cases.some((c) => c.input.some((r) => r.score < 0)));
  assert.ok(cases.some((c) => c.input.length === 0));
});

test("cosineRank returns a permutation in descending score order on every case", () => {
  for (const c of cases) {
    const hits = cosineOrder(c.input);
    assert.deepEqual(ids(hits).sort((a, b) => a - b), byId(c.input).map((r) => r.id));
    assert.equal(hits.length, c.input.length);
    for (let i = 1; i < hits.length; i++) assert.ok(hits[i - 1].score >= hits[i].score);
    for (const h of hits) assert.equal(h.score, c.input.find((r) => r.id === h.entry.rowid)?.score);
  }
});

test("cosineRank matches the Lean order on every case whose index arrives in ascending id order", () => {
  const mismatches = cases.filter((c) => !same(ids(cosineOrder(byId(c.input))), c.leanOrder)).length;
  assert.equal(mismatches, 0);
});

test("cosineRank on shuffled input breaks ties by input position and differs from the Lean order", () => {
  const mismatched = cases.filter((c) => !same(ids(cosineOrder(c.input)), c.leanOrder));
  assert.ok(mismatched.every((c) => hasTie(c.input)));
  assert.equal(mismatched.length, SHUFFLED_MISMATCHES);
});

test("tokenRank agrees with cosineRank on every case with scores at or above zero", () => {
  const eligible = cases.filter((c) => nonNegative(c.input));
  assert.ok(eligible.length > 1000);
  for (const c of eligible) {
    assert.deepEqual(ids(tokenOrder(c.input)), ids(cosineOrder(c.input)));
    assert.deepEqual(ids(tokenOrder(byId(c.input))), c.leanOrder);
  }
});

test("a comparator with the id tie-break matches the Lean order on every shuffled case", () => {
  for (const c of cases) {
    const sorted = [...c.input].sort((a, b) => b.score - a.score || a.id - b.id);
    assert.deepEqual(sorted.map((r) => r.id), c.leanOrder);
  }
});
