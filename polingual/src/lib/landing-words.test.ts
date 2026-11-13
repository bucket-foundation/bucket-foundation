import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Anchor = { attrs: Record<string, string>; text: string };

const root = join(__dirname, "../..");
const d8 = join(root, "public/d8");
const words = JSON.parse(readFileSync(join(root, "src/data/words.json"), "utf8")) as { slug: string; forms: { lang: string }[] }[];
const languages = new Set(words.flatMap((w) => w.forms.map((f) => f.lang)));
const langs = JSON.parse(readFileSync(join(__dirname, "site-langs.json"), "utf8")) as string[];
const rtl = new Set(["ar", "fa", "he"]);
const pages = [{ code: "en", file: "index.html", base: "" }, ...langs.map((code) => ({ code, file: `${code}.html`, base: `/${code}` }))];

const attrsOf = (tag: string) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const anchors = (html: string): Anchor[] => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ attrs: attrsOf(m[1]), text: m[2] }));
const blocks = (html: string, open: RegExp, tag: string) => [...html.matchAll(new RegExp(`${open.source}([\\s\\S]*?)</${tag}>`, "g"))].map((m) => ({ attrs: attrsOf(m[0].slice(0, m[0].indexOf(">"))), body: m[1] }));

const parsed = new Map(
  pages.map(({ file }) => {
    const html = readFileSync(join(d8, file), "utf8");
    return [file, {
      html,
      header: anchors(blocks(html, /<header class="hd">/, "header")[0]?.body ?? ""),
      footers: [...blocks(html, /<footer class="ft">/, "footer"), ...blocks(html, /<nav class="fl2">/, "nav")].map((b) => anchors(b.body)),
      appTop: anchors(blocks(html, /<div id="app">/, "h1")[0]?.body ?? "").find((a) => a.attrs.class === "wtop"),
      browse: blocks(html, /<p class="hw"[^>]*>/, "p").map((b) => ({ dir: b.attrs.dir, links: anchors(b.body) })),
    }];
  }),
);
const en = parsed.get("index.html")!;

test("the landing ships in 25 languages", () => {
  assert.equal(pages.length, 25);
});

for (const { code, file, base } of pages) {
  const p = parsed.get(file)!;

  test(`${file} headers link Words to ${base}/word and footers do not`, () => {
    const wl = p.header.find((a) => a.attrs["data-slot"] === "words");
    assert.equal(wl?.attrs.href, `${base}/word`);
    assert.equal(p.appTop?.attrs.href, `${base}/word`);
    assert.equal(p.footers.length, 4);
    for (const links of p.footers) assert.ok(!links.some((a) => a.attrs.href === `${base}/word` || a.text === wl?.text), `${file} footer links Words`);
    assert.equal(p.appTop?.text, wl?.text);
    if (code !== "en") assert.notEqual(wl?.text, "Words", `${file} label untranslated`);
  });

  test(`${file} has one browse link under each tile grid to ${base}/word`, () => {
    assert.equal(p.browse.length, 2);
    for (const { dir, links } of p.browse) {
      assert.equal(dir === "rtl", rtl.has(code));
      assert.equal(links.length, 1);
      assert.equal(links[0].attrs.href, `${base}/word`);
      assert.ok(links[0].text.includes(String(words.length)), `${file}: ${links[0].text}`);
      assert.ok(links[0].text.includes(String(languages.size)), `${file}: ${links[0].text}`);
      if (code !== "en") assert.notEqual(links[0].text, en.browse[0].links[0].text);
    }
  });

  test(`${file} carries no word chip strip`, () => {
    assert.ok(!p.html.includes('class="ws"'));
    assert.ok(!/href="[^"]*\/word\/[a-z-]+"/.test(p.html));
  });
}
