import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import Site from "../app/site";
import { Tile, Tiles } from "../app/tile";
import { TESTFLIGHT_URL } from "./beta";
import { FLAG_STRIPE } from "./flags";

const APP = join(__dirname, "../app");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

test("the shared shell renders the Po logo, the beta CTA and the flag footer", () => {
  const html = renderToStaticMarkup(<Site><p>body</p></Site>);
  assert.match(html, /<img src="\/d8\/mark-pl\.svg"/);
  assert.match(html, />polingual</);
  assert.ok(html.includes(`href="${TESTFLIGHT_URL}"`), "beta CTA");
  assert.match(html, />Join the beta</);
  assert.ok(html.includes("<footer"));
  assert.ok(html.includes(FLAG_STRIPE.slice(0, 40)), "flag stripe");
  for (const href of ["/privacy", "/terms", "/support", "/word"]) assert.ok(html.includes(`href="${href}"`), href);
  assert.match(html, /Wiktionary/);
  assert.match(html, /<p>body<\/p>/);
});

test("tiles carry the language code, the word and an ltr reading", () => {
  const html = renderToStaticMarkup(<Tiles><Tile lang="ar" code="ar" label="Arabic" word="ليل" reading="/layl/" rtl /></Tiles>);
  assert.match(html, /<ul/);
  assert.match(html, />ar</);
  assert.match(html, /lang="ar" dir="rtl"[^>]*>ليل</);
  assert.match(html, /dir="ltr"[^>]*>\/layl\//);
});

test("no page uses the old green serif theme", () => {
  const sources = files(APP).filter((f) => /\.(tsx?|css)$/.test(f) && !f.includes(join("(site)", "app")) && !f.includes(join("(site)", "brand")));
  for (const f of sources) {
    const src = readFileSync(f, "utf8");
    assert.ok(!src.includes("legal.module.css"), `${f} imports legal.module.css`);
    assert.ok(!/#3B5E2B/i.test(src), `${f} uses the old green`);
    assert.ok(!/Georgia|Cormorant|Garamond/.test(src), `${f} uses a serif face`);
  }
});

test("lists with a class have no bullets and the css uses logical sides", () => {
  const css = readFileSync(join(APP, "site.module.css"), "utf8");
  assert.match(css, /ul:not\(\[class\]\)[^{]*\{[^}]*list-style:disc/);
  assert.ok(!/\b(left|right):|padding-left|padding-right|margin-left|margin-right|text-align:(left|right)/.test(css), "physical sides in site.module.css");
  const word = readFileSync(join(APP, "(site)/word/word.module.css"), "utf8");
  assert.ok(!/[^-]serif/.test(word.replace(/sans-serif/g, "")), "serif fallback in word.module.css");
});

test("unmatched urls get the branded global 404", async () => {
  const { default: GlobalNotFound } = await import("../app/global-not-found");
  const html = renderToStaticMarkup(<GlobalNotFound />);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /Page not found/);
  assert.match(html, /mark-pl\.svg/);
  const config = readFileSync(join(__dirname, "../../next.config.js"), "utf8");
  assert.match(config, /globalNotFound: true/);
});
