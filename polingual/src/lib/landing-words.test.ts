import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../..");
const d8 = join(root, "public/d8");
const words = JSON.parse(readFileSync(join(root, "src/data/words.json"), "utf8")) as { slug: string }[];
const slugs = new Set(words.map((w) => w.slug));
const langs = JSON.parse(readFileSync(join(__dirname, "site-langs.json"), "utf8")) as string[];
const rtl = new Set(["ar", "fa", "he"]);
const pages = [{ code: "en", file: "index.html", base: "" }, ...langs.map((code) => ({ code, file: `${code}.html`, base: `/${code}` }))];

test("the landing ships in 25 languages", () => {
  assert.equal(pages.length, 25);
});

test("hero tiles link to a word page that exists", () => {
  const js = readFileSync(join(d8, "tiles.js"), "utf8");
  const slug = js.match(/const WORD_SLUG="([^"]+)"/)?.[1];
  assert.ok(slug && slugs.has(slug), `WORD_SLUG ${slug}`);
  assert.match(js, /<a class="wl" href="\$\{wordHref\(\)\}">/);
});

for (const { code, file, base } of pages) {
  const html = readFileSync(join(d8, file), "utf8");

  test(`${file} header links Words to ${base}/word`, () => {
    const header = html.match(/<header class="hd">[\s\S]*?<\/header>/)?.[0] ?? "";
    assert.match(header, new RegExp(`<a class="l" href="${base}/word" data-slot="words">[^<]+</a>`));
  });

  test(`${file} footers link Words to ${base}/word`, () => {
    for (const re of [/<nav class="fl2">([\s\S]*?)<\/nav>/, /<footer class="ft">(<a[\s\S]*?)<select/]) {
      const links = html.match(re)?.[1] ?? "";
      assert.ok(links.startsWith(`<a href="${base}/word">`), `${file}: ${links.slice(0, 80)}`);
    }
  });

  test(`${file} word chips point to existing ${code} word pages`, () => {
    const strips = [...html.matchAll(/<nav class="ws"([^>]*)>([\s\S]*?)<\/nav>/g)];
    assert.equal(strips.length, 2);
    for (const [, attrs, body] of strips) {
      assert.equal(attrs.includes('dir="rtl"'), rtl.has(code));
      const chips = [...(body.match(/<div class="wsc">([\s\S]*?)<\/div>/)?.[1] ?? "").matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      assert.ok(chips.length >= 8 && chips.length <= 12, `${chips.length} chips`);
      for (const href of chips) {
        const slug = href.match(new RegExp(`^${base}/word/([a-z-]+)$`))?.[1];
        assert.ok(slug && slugs.has(slug), `${file}: ${href}`);
      }
      const all = body.match(/<a class="wsa" href="([^"]+)">([^<]+)<\/a>/);
      assert.equal(all?.[1], `${base}/word`);
      assert.ok(all?.[2].includes(String(words.length)), `${file}: ${all?.[2]}`);
    }
  });
}
