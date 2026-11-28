import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OUT, readKit, tokensCss } from "./build-tokens.mjs";

test("brand-tokens.css matches brand/bucket/kit.json", () => {
  assert.equal(readFileSync(OUT, "utf8"), tokensCss(readKit()));
});

test("every dark role exists in light", () => {
  const kit = readKit();
  for (const k of Object.keys(kit.dark)) assert.ok(k in kit.light, k);
});
