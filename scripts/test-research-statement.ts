import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { DIRECTIONS, FIGURE, N, STATEMENT_VARIANTS } from "../src/lib/research-os/statement-variants";
import { PAPERS } from "../src/lib/papers";

test("three directions, each with a resolvable link", () => {
  assert.equal(DIRECTIONS.length, 3);
  const slugs = new Set(PAPERS.map((p) => p.slug));
  for (const d of DIRECTIONS) {
    const h = d.link.href;
    if (h.startsWith("/research/papers/")) assert.ok(slugs.has(h.split("/").pop()!), h);
    else assert.ok(existsSync(`src/app${h}/page.tsx`), h);
  }
});

test("the figure ships and the numbers carry their source", () => {
  assert.ok(existsSync(`public${FIGURE.src}`));
  assert.match(N.builtFrom, /public\/papers\/solvability-frontier\/data, built \d{4}-\d{2}-\d{2}/);
  assert.equal(N.counts.solved + N.counts.reachable + N.counts.beyond, N.problems);
  assert.equal(N.cutoffs[0].cutoff, 2005);
  assert.equal(N.cutoffs[0].settled.rateInside, 0.236);
  assert.equal(N.cutoffs[0].settled.rateOutside, 0.059);
  assert.equal(N.cutoffs[0].settled.pValue, 0.0024);
  assert.equal(N.cutoffs[0].undecided, 90);
  assert.equal(N.classes["close to known results"] + N.classes.borderline + N.classes["needs a new idea"], 2085);
});

test("variants are distinct", () => {
  assert.equal(new Set(STATEMENT_VARIANTS.map((v) => `${v.layout}${v.palette}${v.type}${v.figureFirst}`)).size, STATEMENT_VARIANTS.length);
});
