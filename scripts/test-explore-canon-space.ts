import test from "node:test";
import assert from "node:assert/strict";
import canonSpace from "../src/data/explore/canon.space.json";
import basis from "../src/data/explore/reference-basis.json";
import { LOW_COVERAGE } from "../src/lib/explore/reference";
import { makeSlices } from "../src/lib/explore/slices";
import { SPACE_SOURCES, sourceFromParam } from "../src/lib/explore/sources";
import { parseDataset } from "../src/lib/explore/space";

const ds = parseDataset(canonSpace);

test("the canon space parses as a reference-basis dataset", () => {
  assert.equal(ds.components.length, basis.components.length);
  assert.equal(ds.basis, "reference");
  assert.equal(ds.scale, "standardized");
  assert.ok(ds.obs.length > 200);
  assert.ok(ds.obs.every((o) => o.scores.length === 12 && o.scores.every(Number.isFinite)));
  assert.ok(ds.obs.every((o) => typeof o.coverage === "number" && o.coverage >= 0 && o.coverage <= 1));
  assert.equal(new Set(ds.obs.map((o) => o.id)).size, ds.obs.length);
});

test("canon coverage is reported and low-coverage items are countable", () => {
  const low = ds.obs.filter((o) => (o.coverage as number) < LOW_COVERAGE);
  assert.ok(low.length > 0 && low.length < ds.obs.length);
  const mean = ds.obs.reduce((s, o) => s + (o.coverage as number), 0) / ds.obs.length;
  assert.ok(mean > 0.2 && mean < 1);
});

test("the canon space slices by era into several slices", () => {
  const slices = makeSlices(ds);
  assert.ok(slices.length >= 3);
  assert.ok(slices.every((s) => s.obsIds.length > 0));
});

test("canon observations carry no email", () => {
  assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(JSON.stringify(canonSpace)));
});

test("the source param falls back to canon", () => {
  assert.deepEqual([...SPACE_SOURCES], ["canon", "advisors"]);
  assert.equal(sourceFromParam("advisors"), "advisors");
  assert.equal(sourceFromParam("other"), "canon");
  assert.equal(sourceFromParam(null), "canon");
});
