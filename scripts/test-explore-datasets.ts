import test from "node:test";
import assert from "node:assert/strict";
import { BUNDLED_DATASETS, DEFAULT_DATASET, dataParam, isRemote, listDatasets, validDatasetId } from "../src/lib/explore/datasets";

test("the switcher always lists the bundled data sets first", () => {
  const list = listDatasets([]);
  assert.deepEqual(list.map((e) => e.id), BUNDLED_DATASETS.map((e) => e.id));
  assert.ok(list.some((e) => e.id === "canon") && list.some((e) => e.id === "sample"));
});

test("remote data sets join after the bundled ones without duplicates", () => {
  const list = listDatasets([{ id: "advisors", label: "advisors" }, { id: "war-gov" }, { id: "canon" }, { id: "advisors" }]);
  assert.deepEqual(list.map((e) => e.id), ["canon", "sample", "advisors", "war-gov"]);
  assert.equal(list.find((e) => e.id === "war-gov")?.label, "war-gov");
  assert.equal(isRemote("advisors", list), true);
  assert.equal(isRemote("canon", list), false);
  assert.equal(isRemote("missing", list), false);
});

test("ids with path characters or capitals are refused", () => {
  for (const bad of ["../etc/passwd", "a/b", "A", "", "-x", "x y", "x".repeat(65), "a%2fb"]) assert.equal(validDatasetId(bad), false, bad);
  for (const good of ["canon", "war-gov", "k12-literature", "a1"]) assert.equal(validDatasetId(good), true, good);
  assert.deepEqual(listDatasets([{ id: "../x" }, { id: "ok-one" }]).map((e) => e.id), ["canon", "sample", "ok-one"]);
});

test("the data param falls back to canon for unknown or invalid values", () => {
  const list = listDatasets([{ id: "advisors" }]);
  assert.equal(dataParam("advisors", list), "advisors");
  assert.equal(dataParam("sample", list), "sample");
  assert.equal(dataParam("nope", list), DEFAULT_DATASET);
  assert.equal(dataParam("../advisors", list), DEFAULT_DATASET);
  assert.equal(dataParam(null, list), DEFAULT_DATASET);
});
