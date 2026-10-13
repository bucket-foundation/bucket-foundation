import assert from "node:assert/strict";
import { isFoundationTier } from "./qualify-v2";

const sig = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);

assert.equal(isFoundationTier({ score: 8, patternSignals: sig(3) }), true);
assert.equal(isFoundationTier({ score: 9, patternSignals: sig(4) }), true);
assert.equal(isFoundationTier({ score: 7, patternSignals: sig(3) }), false);
assert.equal(isFoundationTier({ score: 9, patternSignals: sig(2) }), false);
assert.equal(isFoundationTier({ score: 0, patternSignals: [] }), false);
console.log("qualify-v2 ok");
