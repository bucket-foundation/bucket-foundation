import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { COPIES, syncCorpus } from "./sync_corpus.mjs";
import { createRequire } from "node:module";
const config = createRequire(import.meta.url)("../next.config.js");

test("corpus, top words and audio copy into the polingual public folder", () => {
  const src = mkdtempSync(join(tmpdir(), "pl-src-"));
  const dest = mkdtempSync(join(tmpdir(), "pl-out-"));
  for (const [from] of COPIES) {
    mkdirSync(join(src, from), { recursive: true });
    writeFileSync(join(src, from, "a.json"), from);
  }
  syncCorpus(src, dest);
  for (const [from, to] of COPIES) assert.equal(readFileSync(join(dest, to, "a.json"), "utf8"), from);
});

test("the copied paths carry CDN cache headers", async () => {
  const rules = await config.headers();
  for (const path of ["/academy-app/corpus/:path*", "/academy-app/polingual/:path*", "/academy-app/audio/:path*"]) {
    const rule = rules.find((r) => r.source === path);
    assert.ok(rule, path);
    assert.match(rule.headers[0].value, /s-maxage=\d{5,}/);
  }
});

test("the learning corpus exists for the build", () => {
  for (const [from] of COPIES) assert.ok(existsSync(join(process.cwd(), "../learning/app", from)), from);
});
