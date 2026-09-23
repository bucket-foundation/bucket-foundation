import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import data from "../src/lib/research-os/patents-design-data.json";

test("the JSON matches the memo it is built from", () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, "research-os", "patents-design.mjs"), "--check"], { encoding: "utf8" });
  assert.match(out, /matches the memo/);
});

test("sources, the first corpus, decisions and slices are all present", () => {
  assert.ok(data.sources.length >= 5);
  assert.ok(data.sources.every((s) => s.source.length > 0 && s.researchOs.length > 0 && s.gateway.length > 0));
  assert.deepEqual(
    data.corpus.map((c) => c.branch.map((s) => s.v).join("")),
    ["05-biophysics", "04-information", "03-chemistry", "02-physics"],
  );
  assert.ok(data.settled.length > 0);
  const numbers = data.slices.map((s) => s.n);
  assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
  assert.equal(new Set(numbers).size, numbers.length);
  assert.ok(data.slices.some((s) => s.shipped) && data.slices.some((s) => !s.shipped));
});
