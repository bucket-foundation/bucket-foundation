import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bandUrls, bundleUrl, isLoopback, MIN_UNIT_TOKENS, type InputBundle, type InputManifest } from "./types";

const dir = join(process.cwd(), "public", "input");
const manifest: InputManifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));

test("manifest lists hashed bundles for the five launch languages", () => {
  for (const lang of ["es", "fr", "it", "pt", "de"]) {
    const url = bundleUrl(manifest, lang);
    assert.match(url ?? "", new RegExp(`^/input/${lang}\\.[0-9a-f]{12}\\.json$`));
  }
  assert.equal(bundleUrl(manifest, "xx"), null);
});

for (const [lang, entry] of Object.entries(manifest.langs)) {
  test(`${lang} bundle units, tokens and sources`, () => {
    const b: InputBundle = JSON.parse(readFileSync(join(dir, entry.file), "utf8"));
    assert.equal(b.lang, lang);
    assert.equal(b.items.length, entry.items);
    const byId = new Map(b.items.map((i) => [i.id, i]));
    const member = b.units.flatMap((u) => u.itemIds);
    assert.equal(new Set(member).size, member.length);
    assert.equal(member.length, b.items.length);
    for (const u of b.units) {
      const its = u.itemIds.map((id) => byId.get(id));
      assert.ok(its.every(Boolean), u.id);
      const n = its.reduce((s, i) => s + (i?.tokens.length ?? 0), 0);
      assert.equal(n, u.tokenCount, u.id);
      assert.ok(n >= MIN_UNIT_TOKENS, u.id);
      if (u.kind === "sentence_set") {
        assert.ok(u.itemIds.length >= 4 && u.itemIds.length <= 6, u.id);
        assert.ok(its.every((i) => i?.lemmas.includes(u.targetLemmas[0])), u.id);
        for (const i of its) assert.ok(u.credit.includes(`tatoeba.org/en/sentences/show/${i?.source.sentenceIds?.[lang]}`), u.id);
      }
    }
    for (const i of b.items) {
      assert.ok(i.tokens.length > 0 && i.license.length > 0, i.id);
      assert.deepEqual(i.lemmas, [...new Set(i.tokens.map((t) => t.lemma))].sort(), i.id);
      if (i.source.name === "tatoeba") {
        assert.equal(i.license, "CC-BY 2.0 FR");
        assert.ok(i.source.sentenceIds?.en, i.id);
      }
      if (i.kind === "video_segment") assert.ok(i.media && i.media.end > i.media.start, i.id);
    }
    assert.ok(b.coverage.tokenShare >= 0.9, `${lang} lemma coverage ${b.coverage.tokenShare}`);
  });
}

test("bandUrls refuses a loopback base in production and joins a public one", () => {
  const remote = "https://cdn.example.org/storage/v1/object/public/polingual-input/";
  const local = "http://127.0.0.1:54321/storage/v1/object/public/polingual-input";
  const first = manifest.langs.es.graded!.files["500"][0].file;
  assert.deepEqual(bandUrls(manifest, "es", 500, local, true), []);
  assert.equal(bandUrls(manifest, "es", 500, local, false)[0], `${local}/${first}`);
  assert.equal(bandUrls(manifest, "es", 500, remote, true)[0], `${remote.slice(0, -1)}/${first}`);
  assert.deepEqual(bandUrls(manifest, "es", 500, "", false), []);
  assert.ok(isLoopback("http://localhost:3000/x"));
  assert.ok(!isLoopback("https://localhost.example.org/x"));
});
