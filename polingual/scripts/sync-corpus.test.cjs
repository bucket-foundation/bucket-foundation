const { test } = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { COPIES, syncCorpus } = require("./sync-corpus.cjs");
const config = require("../next.config.js");

function fixture() {
  const src = mkdtempSync(join(tmpdir(), "pl-src-"));
  for (const { from } of COPIES) {
    mkdirSync(join(src, from), { recursive: true });
    writeFileSync(join(src, from, "lang-a.json"), from);
  }
  writeFileSync(join(src, "corpus", "01-mathematics.json"), "science");
  return src;
}

test("lang corpus, top words and audio copy into the public folder; science decks stay out", () => {
  const src = fixture();
  const dest = mkdtempSync(join(tmpdir(), "pl-out-"));
  syncCorpus(src, dest);
  for (const { from, to } of COPIES) assert.equal(readFileSync(join(dest, to, "lang-a.json"), "utf8"), from);
  assert.ok(!existsSync(join(dest, "corpus", "01-mathematics.json")));
});

test("the corpus version changes when a corpus file changes", () => {
  const src = fixture();
  const a = syncCorpus(src, mkdtempSync(join(tmpdir(), "pl-out-")));
  assert.equal(syncCorpus(src, mkdtempSync(join(tmpdir(), "pl-out-"))), a);
  writeFileSync(join(src, "corpus", "lang-a.json"), "changed");
  assert.notEqual(syncCorpus(src, mkdtempSync(join(tmpdir(), "pl-out-"))), a);
});

test("the corpus version changes when the clip index changes", () => {
  const src = fixture();
  writeFileSync(join(src, "audio", "index.json"), "{}");
  const a = syncCorpus(src, mkdtempSync(join(tmpdir(), "pl-out-")));
  writeFileSync(join(src, "audio", "index.json"), '{"es":["hola"]}');
  assert.notEqual(syncCorpus(src, mkdtempSync(join(tmpdir(), "pl-out-"))), a);
  assert.ok(readFileSync(join(__dirname, "../../src/lib/academy/lang-client.ts"), "utf8").includes("CLIP_INDEX = `${AUDIO_BASE}/index.json${CORPUS_QUERY}`"));
});

test("a missing source fails the build", () => {
  assert.throws(() => syncCorpus(mkdtempSync(join(tmpdir(), "pl-empty-")), mkdtempSync(join(tmpdir(), "pl-out-"))), /missing/);
});

test("next config runs the copy, exposes the version and proxies no academy-app path", async () => {
  assert.match(config("phase-production-build").env.NEXT_PUBLIC_CORPUS_V, /^[0-9a-f]{12}$/);
  assert.equal(config("phase-test").env, undefined);
  const { beforeFiles, afterFiles } = await config.rewrites();
  for (const r of [...beforeFiles, ...afterFiles]) assert.ok(!r.source.startsWith("/academy-app"), r.source);
  const rules = await config.headers();
  for (const path of ["/academy-app/corpus/:path*", "/academy-app/polingual/:path*", "/academy-app/audio/:path*"]) {
    const rule = rules.find((r) => r.source === path);
    assert.ok(rule, path);
    assert.match(rule.headers[0].value, /s-maxage=\d{7,}/);
  }
});

test("every academy-app path the web client fetches is one the build copies", () => {
  const roots = ["../src/lib/academy/lang-client.ts", "../src/lib/academy/lang-audio.ts"];
  const used = new Set();
  for (const f of roots) for (const m of readFileSync(join(__dirname, "..", f), "utf8").matchAll(/\/academy-app\/([a-z0-9]+(?:\/(?:top1000|yesno))?)/g)) used.add(m[1]);
  const copied = new Set(COPIES.map((c) => c.to));
  assert.ok(used.size >= 3);
  for (const u of used) assert.ok(copied.has(u), u);
});
