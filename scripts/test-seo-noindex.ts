import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const app = path.join(__dirname, "..", "src/app");

for (const file of ["device/layout.tsx", "kruse/layout.tsx", "sign-in/page.tsx"]) {
  test(`${file} keeps the page out of search`, () => {
    const src = fs.readFileSync(path.join(app, file), "utf8");
    assert.match(src, /robots:\s*\{\s*index:\s*false/);
  });
}
