import test from "node:test";
import assert from "node:assert/strict";
import basisFile from "../src/data/explore/reference-basis.json";
import golden from "../tests/fixtures/reference-projection.golden.json";
import { LOW_COVERAGE, parseReferenceBasis, projectText, tokenize, type ReferenceBasis } from "../src/lib/explore/reference";

const big = parseReferenceBasis(basisFile);

const tiny: ReferenceBasis = {
  schema: "bucket.reference-basis/1",
  sign_convention: "test",
  vocab: ["alpha", "beta", "gamma"],
  idf: [3, 4, 12],
  loadings: [
    [1, 0, 0.5],
    [0, 1, -0.5],
  ],
  offset: [0.1, -0.2],
  score_mean: [0.05, 0.1],
  score_std: [2, 4],
  components: [],
};

test("projection equals a hand-computed dot product", () => {
  const p = projectText(tiny, "Alpha beta");
  const norm = Math.hypot(3, 4);
  const e = [3 / norm, 4 / norm, 0];
  const s0 = (e[0] * 1 + e[1] * 0 + e[2] * 0.5 - 0.1 - 0.05) / 2;
  const s1 = (e[0] * 0 + e[1] * 1 + e[2] * -0.5 + 0.2 - 0.1) / 4;
  assert.ok(Math.abs(p.scores[0] - s0) < 1e-12);
  assert.ok(Math.abs(p.scores[1] - s1) < 1e-12);
});

test("repeated terms count once and unknown terms are ignored", () => {
  const a = projectText(tiny, "alpha alpha alpha unknown words");
  const b = projectText(tiny, "alpha");
  assert.deepEqual(a.scores, b.scores);
  assert.ok(Math.abs(a.coverage - 3 / 5) < 1e-12);
  assert.ok(a.coverage >= LOW_COVERAGE);
});

test("text with no known term has zero coverage and a finite score", () => {
  const p = projectText(tiny, "zzz qqq");
  assert.equal(p.coverage, 0);
  assert.ok(p.scores.every(Number.isFinite));
  assert.equal(projectText(tiny, "").coverage, 0);
});

test("the same text projects to identical polygons twice", () => {
  const t = "quantum photon electron energy field wave";
  assert.deepEqual(projectText(big, t), projectText(big, t));
});

test("the TypeScript projection matches the Python golden", () => {
  assert.equal(golden.texts.length, golden.scores.length);
  golden.texts.forEach((text, i) => {
    const got = projectText(big, text).scores;
    got.forEach((v, k) => assert.ok(Math.abs(v - golden.scores[i][k]) < 1e-3, `${i}:${k} ${v} vs ${golden.scores[i][k]}`));
  });
});

test("the shipped basis has 12 components signed by the convention", () => {
  assert.equal(big.components.length, 12);
  for (const row of big.loadings) {
    let at = 0;
    row.forEach((v, i) => {
      if (Math.abs(v) > Math.abs(row[at])) at = i;
    });
    assert.ok(row[at] > 0);
  }
  assert.ok(big.components.every((c, i) => c.index === i + 1 && c.top_terms.length > 0));
});

test("the tokenizer follows the scikit-learn pattern", () => {
  assert.deepEqual(tokenize("Quantum-field, 3D e2 _x a b9 naïve"), ["quantum", "field", "e2", "b9", "naïve"]);
});

test("the parser rejects a basis of the wrong schema or size", () => {
  assert.throws(() => parseReferenceBasis({ ...tiny, schema: "x" }));
  assert.throws(() => parseReferenceBasis({ ...tiny, idf: [1] }));
});
