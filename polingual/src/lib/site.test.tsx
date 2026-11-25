import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import Site from "../app/site";
import { FrequencyCredit } from "../app/(site)/research/frequency-credit";

test("the research page credits the frequency lists under CC BY-SA 4.0 with share-alike terms", () => {
  const html = renderToStaticMarkup(<FrequencyCredit />);
  assert.match(html, /wordfreq/);
  assert.match(html, /FrequencyWords/);
  assert.match(html, /creativecommons\.org\/licenses\/by-sa\/4\.0/);
  assert.match(html, /same licence/);
  assert.match(readFileSync(join(__dirname, "../app/(site)/research/page.tsx"), "utf8"), /<FrequencyCredit \/>/);
});
import LearnPage, { metadata as learnMeta } from "../app/(site)/learn/page";
import { GUIDES } from "./guides";
import { siteLocale } from "../app/(site)/word/views";
import { Tile, Tiles } from "../app/tile";
import { APP_STORE_URL, SITE } from "./facts";
import { FLAG_STRIPE } from "./flags";

const APP = join(__dirname, "../app");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

test("the shared shell renders the Po logo, the App Store CTA and the flag footer", () => {
  const html = renderToStaticMarkup(<Site><p>body</p></Site>);
  assert.match(html, /<img src="\/d8\/mark-pl\.svg"/);
  assert.match(html, />polingual</);
  assert.ok(html.includes(`href="${APP_STORE_URL}"`), "App Store CTA");
  assert.match(html, />Get the app</);
  assert.doesNotMatch(html, /testflight|Join the beta/i);
  assert.ok(html.includes("<footer"));
  assert.ok(html.includes(FLAG_STRIPE.slice(0, 40)), "flag stripe");
  assert.match(html, /href="\/play"[^>]*data-testid="nav-play"|data-testid="nav-play"[^>]*href="\/play"/);
  const footer = html.slice(html.indexOf("<footer"));
  for (const href of ["/play", "/word", "/learn", "/teachers", "/privacy", "/terms", "/support", APP_STORE_URL]) assert.ok(footer.includes(`href="${href}"`), href);
  assert.match(html, /Wiktionary/);
  assert.match(html, /<p>body<\/p>/);
});

test("the site header keeps the App Store link quiet so the page owns the one primary", () => {
  const html = renderToStaticMarkup(<Site><p>body</p></Site>);
  const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  const cta = header.match(/<a[^>]*data-testid="nav-app"[^>]*>/)?.[0] ?? "";
  assert.ok(cta, "header CTA");
  assert.doesNotMatch(cta, /primary/);
});

test("every landing page header carries no gold primary button", () => {
  const dir = join(process.cwd(), "public/d8");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".html"))) {
    const html = readFileSync(join(dir, f), "utf8");
    const at = html.indexOf('<header class="hd"');
    if (at < 0) continue;
    const header = html.slice(at, html.indexOf("</header>", at));
    assert.doesNotMatch(header, /btn-p/, f);
    assert.match(header, new RegExp(`<a class="l q" href="${APP_STORE_URL.replace(/[.?]/g, "\\$&")}" data-slot="appstore"`), f);
    assert.match(html, /\.hd a\.q\{[^}]*text-decoration:underline/, f);
  }
});

test("the header and footer navs carry distinct labels in the page language", () => {
  const en = renderToStaticMarkup(<Site><p>body</p></Site>);
  assert.match(en, /<nav[^>]*aria-label="Main"/);
  assert.match(en, /<nav[^>]*aria-label="Footer"/);
  const es = renderToStaticMarkup(<Site loc={siteLocale("es")}><p>body</p></Site>);
  assert.match(es, /<nav[^>]*aria-label="Principal"/);
  assert.match(es, /<nav[^>]*aria-label="Pie de página"/);
  assert.match(es, /href="\/es\/teachers"[^>]*>Docentes</);
});

test("the guides index lists every guide and has its own canonical", () => {
  const html = renderToStaticMarkup(<LearnPage />);
  assert.match(html, /<h1>Guides<\/h1>/);
  for (const g of GUIDES) {
    assert.ok(html.includes(`href="/learn/${g.slug}"`), g.slug);
    assert.ok(html.includes(g.title), g.title);
  }
  assert.equal(learnMeta.alternates?.canonical, `${SITE}/learn`);
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
