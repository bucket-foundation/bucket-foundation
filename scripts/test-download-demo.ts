import assert from "node:assert/strict";
import { binaryEntropy, parseProbabilities, searchDemoSources, SAMPLE_CSV } from "../src/lib/download/demo";

assert.equal(binaryEntropy(0), 0);
assert.equal(binaryEntropy(1), 0);
assert.equal(binaryEntropy(.5), 1);
for (let i = 0; i <= 100; i++) {
  const p = i / 100;
  assert.ok(Math.abs(binaryEntropy(p) - binaryEntropy(1 - p)) < 1e-12);
  assert.ok(binaryEntropy(p) >= 0 && binaryEntropy(p) <= 1);
}
for (const p of [-1, 2, NaN, Infinity]) assert.throws(() => binaryEntropy(p), RangeError);
assert.deepEqual(parseProbabilities("probability\r\n0\r\n.5\r\n1"), [0, .5, 1]);
assert.equal(parseProbabilities(SAMPLE_CSV).length, 7);
for (const text of ["", "probability", "-1", "1.1", "NaN", "1,2", "0\n\n1", "=1+1", "x".repeat(20001), Array(1001).fill("0").join("\n")]) assert.throws(() => parseProbabilities(text));
assert.equal(parseProbabilities(Array(1000).fill(".5").join("\n")).length, 1000);
assert.equal(searchDemoSources("SHANNON entropy")[0].id, "shannon");
assert.equal(searchDemoSources("unrelated").length, 0);
assert.equal(searchDemoSources("").length, 4);
process.stdout.write("Download demo math and input boundaries passed\n");
