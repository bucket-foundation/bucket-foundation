import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { MODULES, VARIANTS, generateVariants } from "../src/lib/research-os/home-variants";

const NAV_LABELS = Array.from(readFileSync("packages/bkt-ui/src/nav.tsx", "utf8").matchAll(/label: "([^"]+)"/g), (m) => m[1]);

test("every desktop module appears once", () => {
  const labels = MODULES.map((m) => m.label);
  for (const l of NAV_LABELS.filter((l) => l !== "Add your own")) assert.ok(labels.includes(l), l);
  assert.equal(new Set(labels).size, labels.length);
});

test("every module route resolves to a page", () => {
  for (const m of MODULES) {
    const [path] = m.route.split("?");
    const dir = path.startsWith("/research-os/") ? `src/app/research-os/(app)/${path.slice("/research-os/".length)}` : `src/app${path}`;
    assert.ok(existsSync(`${dir}/page.tsx`), m.route);
  }
});

test("variants are distinct and deterministic", () => {
  assert.equal(new Set(VARIANTS.map((v) => JSON.stringify({ ...v, id: "" }))).size, VARIANTS.length);
  assert.deepEqual(generateVariants(), VARIANTS);
  assert.equal(VARIANTS.length, 16);
});
