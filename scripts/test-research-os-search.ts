/** Pure tests for search.ts ranking. */
import test from "node:test";
import assert from "node:assert/strict";
import { rankNodes, tokenize } from "../src/lib/research-os/search";

const nodes = [
  { id: "1", slug: "rayleigh-scattering-law", title: "Rayleigh scattering law", kind: "law", tier: 3, branch: "02-physics", summary: "Scattering strength goes as the inverse fourth power of wavelength." },
  { id: "2", slug: "why-the-sky-is-blue", title: "Why the sky is blue", kind: "concept", tier: 4, branch: "02-physics", summary: "Blue light scattering exceeds red in air." },
  { id: "3", slug: "academy-01-mathematics-set-function", title: "Sets and functions", kind: "concept", tier: 0, branch: "01-mathematics", summary: "A set is a collection; a function assigns outputs." },
];

test("tokenize drops punctuation and one-letter tokens", () => {
  assert.deepEqual(tokenize("Why is the sky blue?"), ["why", "is", "the", "sky", "blue"]);
  assert.deepEqual(tokenize("a"), []);
});

test("rankNodes puts a whole-title match first and summary matches after", () => {
  const r = rankNodes(nodes, "why the sky is blue");
  assert.equal(r[0].slug, "why-the-sky-is-blue");
  const s = rankNodes(nodes, "scattering");
  assert.equal(s[0].slug, "rayleigh-scattering-law");
  assert.ok(s.some((x) => x.slug === "why-the-sky-is-blue"));
  assert.deepEqual(rankNodes(nodes, "functions").map((x) => x.slug), ["academy-01-mathematics-set-function"]);
  assert.deepEqual(rankNodes(nodes, ""), []);
});
