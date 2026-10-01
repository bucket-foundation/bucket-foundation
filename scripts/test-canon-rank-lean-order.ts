import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cosineRank, tokenRank, type CanonHit, type ClaimIndexEntry } from "../src/lib/canon-rank";

const VECTORS = path.join(__dirname, "..", "lean", "vectors", "ranking-order.txt");
const EXPECTED_CASES = 10000;
const TOKEN_SCORE_MAX = 50;
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

function hasTie(rows: Row[]): boolean {
  return new Set(rows.map((r) => r.score)).size < rows.length;
}

const byId = (rows: Row[]) => [...rows].sort((a, b) => a.id - b.id);
const tokenScores = (rows: Row[]) => rows.every((r) => r.score >= 0 && r.score <= TOKEN_SCORE_MAX);

const cases = parseCases();

test("the Lean vectors hold 10,000 cases with ties, edge scores, sparse and large ids, and lists over 50", () => {
  assert.equal(cases.length, EXPECTED_CASES);
  assert.ok(cases.filter((c) => hasTie(c.input)).length > 5000);
  assert.ok(cases.some((c) => c.input.some((r) => r.score === 0)));
  assert.ok(cases.some((c) => c.input.some((r) => r.score < 0)));
  assert.ok(cases.some((c) => c.input.some((r) => r.score === 2 ** 24)));
  assert.ok(cases.some((c) => c.input.some((r) => r.score === -(2 ** 24))));
  assert.ok(cases.some((c) => c.input.length === 0));
  assert.ok(cases.filter((c) => c.input.length > 50).length > 300);
  assert.ok(cases.some((c) => c.input.some((r) => r.id === Number.MAX_SAFE_INTEGER)));
  assert.ok(cases.some((c) => c.input.some((r) => r.id > 2 ** 20 && r.id < 2 ** 32)));
  for (const c of cases) for (const r of c.input) assert.ok(Number.isSafeInteger(r.id) && Math.fround(r.score) === r.score);
});

test("cosineRank returns a permutation in descending score order on every case", () => {
  for (const c of cases) {
    const hits = cosineOrder(c.input);
    assert.deepEqual(ids(hits).sort((a, b) => a - b), byId(c.input).map((r) => r.id));
    const scoreOf = new Map(c.input.map((r) => [r.id, r.score]));
    for (let i = 1; i < hits.length; i++) assert.ok(hits[i - 1].score >= hits[i].score);
    for (const h of hits) assert.equal(h.score, scoreOf.get(h.entry.rowid));
  }
});

test("cosineRank matches the Lean order on every case in shuffled, ascending and descending id order", () => {
  for (const c of cases) {
    assert.deepEqual(ids(cosineOrder(c.input)), c.leanOrder);
    assert.deepEqual(ids(cosineOrder(byId(c.input))), c.leanOrder);
    assert.deepEqual(ids(cosineOrder(byId(c.input).reverse())), c.leanOrder);
  }
});

test("tokenRank matches the Lean order on every shuffled case with scores from 0 to 50", () => {
  const eligible = cases.filter((c) => tokenScores(c.input));
  assert.ok(eligible.length > 1000);
  assert.ok(eligible.some((c) => hasTie(c.input)));
  for (const c of eligible) assert.deepEqual(ids(tokenOrder(c.input)), c.leanOrder);
});
