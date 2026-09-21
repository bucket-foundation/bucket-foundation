/**
 * The Software page's data and filters (ros-frontend 1). The JSON must match
 * the atlas memo it is built from, and the filters must narrow the way the
 * page promises. node:test, no network.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import atlas from "../src/lib/research-os/software-atlas-data.json";
import { filterTools, firstPathCounts, NO_FILTER, PATHS, type SoftwareAtlasData } from "../src/lib/research-os/software-atlas";

const data = atlas as SoftwareAtlasData;

test("the JSON matches the memo it is built from", () => {
  const script = path.join(__dirname, "research-os", "software-atlas.mjs");
  const out = execFileSync(process.execPath, [script, "--check"], { encoding: "utf8" });
  assert.match(out, /matches the memo/);
});

test("every tool has a known first path and resolved sources", () => {
  assert.equal(data.tools.length, 64);
  for (const t of data.tools) {
    assert.ok((PATHS as readonly string[]).includes(t.first), t.name);
    assert.ok(t.fallback === null || (PATHS as readonly string[]).includes(t.fallback), t.name);
    assert.ok(t.sources.length > 0, `${t.name} has no source`);
    for (const s of t.sources) assert.ok(s.url && /^https?:\/\//.test(s.url), `${t.name} source ${s.n}`);
  }
});

test("first-path counts add up to every tool", () => {
  const c = firstPathCounts(data.tools);
  assert.equal(c.browser + c.runner + c.import + c.link, data.tools.length);
});

test("filters narrow by field, license, path and text", () => {
  assert.equal(filterTools(data.tools, NO_FILTER).length, data.tools.length);

  const proof = filterTools(data.tools, { ...NO_FILTER, field: "Proof" });
  assert.ok(proof.length > 0 && proof.every((t) => t.field === "Proof"));
  assert.ok(proof.some((t) => t.name.startsWith("Lean")));

  const closed = filterTools(data.tools, { ...NO_FILTER, license: "closed" });
  const open = filterTools(data.tools, { ...NO_FILTER, license: "open" });
  assert.equal(closed.length + open.length, data.tools.length);
  assert.ok(closed.some((t) => t.name === "MATLAB"));

  const browser = filterTools(data.tools, { ...NO_FILTER, path: "browser" });
  assert.ok(browser.every((t) => t.first === "browser" || t.fallback === "browser"));
  assert.ok(browser.length >= firstPathCounts(data.tools).browser);

  const stata = filterTools(data.tools, { ...NO_FILTER, q: ".DTA" });
  assert.ok(stata.some((t) => t.name === "Stata"), "text search reads formats, case-insensitive");

  assert.equal(filterTools(data.tools, { ...NO_FILTER, q: "no-such-tool-xyz" }).length, 0);
});

test("the suite list keeps the atlas's browser count", () => {
  assert.equal(data.suite.length, 40);
  assert.equal(data.suite.filter((s) => s.inBrowser).length, 25);
});
