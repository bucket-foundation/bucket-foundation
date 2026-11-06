import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Anchor = { attrs: Record<string, string>; text: string };

const root = join(__dirname, "../..");
const d8 = join(root, "public/d8");
const words = JSON.parse(readFileSync(join(root, "src/data/words.json"), "utf8")) as { slug: string }[];
const slugs = new Set(words.map((w) => w.slug));
const langs = JSON.parse(readFileSync(join(__dirname, "site-langs.json"), "utf8")) as string[];
const rtl = new Set(["ar", "fa", "he"]);
const pages = [{ code: "en", file: "index.html", base: "" }, ...langs.map((code) => ({ code, file: `${code}.html`, base: `/${code}` }))];

const attrsOf = (tag: string) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const anchors = (html: string): Anchor[] => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ attrs: attrsOf(m[1]), text: m[2] }));
const blocks = (html: string, open: RegExp, tag: string) => [...html.matchAll(new RegExp(`${open.source}([\\s\\S]*?)</${tag}>`, "g"))].map((m) => ({ attrs: attrsOf(m[0].slice(0, m[0].indexOf(">"))), body: m[1] }));
const wordSlug = (href: string, base: string) => href.match(new RegExp(`^${base}/word/([a-z-]+)$`))?.[1];

const parsed = new Map(
  pages.map(({ file }) => {
    const html = readFileSync(join(d8, file), "utf8");
    return [file, {
      header: anchors(blocks(html, /<header class="hd">/, "header")[0]?.body ?? ""),
      dkFooter: anchors(blocks(html, /<nav class="fl2">/, "nav")[0]?.body ?? ""),
      appTop: anchors(blocks(html, /<div id="app">/, "h1")[0]?.body ?? "").find((a) => a.attrs.class === "wtop"),
      strips: blocks(html, /<nav class="ws"[^>]*>/, "nav").map((b) => ({ attrs: b.attrs, chips: anchors(b.body.match(/<div class="wsc">([\s\S]*?)<\/div>/)?.[1] ?? ""), all: anchors(b.body).find((a) => a.attrs.class === "wsa"), label: b.body.match(/<span class="wsl">([^<]*)<\/span>/)?.[1] })),
      heroes: blocks(html, /<p class="hw"[^>]*>/, "p").map((b) => ({ dir: b.attrs.dir, links: anchors(b.body) })),
    }];
  }),
);
const en = parsed.get("index.html")!;

test("the landing ships in 25 languages", () => {
  assert.equal(pages.length, 25);
});

for (const { code, file, base } of pages) {
  const p = parsed.get(file)!;

  test(`${file} headers and footer link Words to ${base}/word`, () => {
    const wl = p.header.find((a) => a.attrs["data-slot"] === "words");
    assert.equal(wl?.attrs.href, `${base}/word`);
    assert.equal(p.dkFooter[0]?.attrs.href, `${base}/word`);
    assert.equal(p.appTop?.attrs.href, `${base}/word`);
    assert.equal(p.appTop?.text, wl?.text);
    assert.equal(p.dkFooter[0]?.text, wl?.text);
    if (code !== "en") assert.notEqual(wl?.text, "Words", `${file} label untranslated`);
  });

  test(`${file} word chips point to existing ${code} word pages`, () => {
    assert.equal(p.strips.length, 2);
    for (const s of p.strips) {
      assert.equal(s.attrs.dir === "rtl", rtl.has(code));
      assert.ok(s.chips.length >= 8 && s.chips.length <= 12, `${s.chips.length} chips`);
      for (const c of s.chips) assert.ok(slugs.has(wordSlug(c.attrs.href, base) ?? ""), `${file}: ${c.attrs.href}`);
      assert.equal(s.all?.attrs.href, `${base}/word`);
      assert.ok(s.all?.text.includes(String(words.length)), `${file}: ${s.all?.text}`);
      if (code !== "en") {
        assert.notEqual(s.label, en.strips[0].label);
        assert.notEqual(s.all?.text, en.strips[0].all?.text);
        assert.notDeepEqual(s.chips.map((c) => c.text), en.strips[0].chips.map((c) => c.text));
      }
    }
  });

  test(`${file} hero links once under each tile grid to an existing ${code} word page`, () => {
    assert.equal(p.heroes.length, 2);
    for (const { dir, links } of p.heroes) {
      assert.equal(dir === "rtl", rtl.has(code));
      assert.equal(links.length, 1);
      assert.ok(slugs.has(wordSlug(links[0].attrs.href, base) ?? ""), `${file}: ${links[0].attrs.href}`);
      if (code !== "en") assert.notEqual(links[0].text, en.heroes[0].links[0].text);
    }
  });
}

