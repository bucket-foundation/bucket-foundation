import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readTokens, tokensCss } from "./build_tokens.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

test("tokens.css matches tokens.json", () => {
  assert.equal(readFileSync(path.join(here, "../src/ui/tokens.css"), "utf8"), tokensCss(readTokens()));
});

test("every color token is a hex or rgba value", () => {
  for (const v of Object.values(readTokens().color)) assert.match(v, /^(#[0-9A-F]{6}|rgba\([\d.,]+\))$/);
});

test("every type style names a declared font", () => {
  const t = readTokens();
  for (const v of Object.values(t.type)) assert.ok(v.font in t.font);
});
