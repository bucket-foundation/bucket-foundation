import assert from "node:assert/strict";
import { test } from "node:test";
import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, OG_DESCRIPTION_MAX, OG_TITLE_MAX, THEME_COLOR, clip, pageMeta } from "./meta";
import { bakedSearch } from "./baked";
import { GUIDES } from "./guides";
import { WORDS } from "./words";
import { SHARE_KINDS } from "./share";
import { SAMPLE_SHARES } from "./share-samples";
import * as root from "../app/layout";
import * as privacy from "../app/privacy/page";
import * as support from "../app/support/page";
import * as terms from "../app/terms/page";
import * as research from "../app/research/page";
import * as archive from "../app/archive/page";
import * as brand from "../app/brand/page";
import * as compare from "../app/compare/duolingo-three-languages/page";
import * as wordIndex from "../app/word/page";
import * as wordPage from "../app/word/[slug]/page";
import * as learnPage from "../app/learn/[slug]/page";
import * as photonPage from "../app/photon/[id]/page";
import * as sharePage from "../app/s/[[...kind]]/page";
import * as notFound from "../app/not-found";

const SITE = "https://www.polingual.com";

type Og = { url?: string; siteName?: string; locale?: string; title?: string; description?: string; images?: { url: string; width?: number; height?: number; type?: string; alt?: string }[] };
type Tw = { card?: string; title?: string; description?: string; images?: { url: string; alt?: string }[] };

function checkPage(m: Metadata, url: string) {
  const og = m.openGraph as Og;
  const tw = m.twitter as Tw;
  assert.equal(m.alternates?.canonical, url);
  assert.equal(og.url, url);
  assert.equal(og.siteName, "Polingual");
  assert.match(og.locale ?? "", /^[a-z]{2}_[A-Z]{2}$/);
  assert.ok(og.title && og.title.length <= OG_TITLE_MAX, `og:title ${og.title}`);
  assert.ok(og.description && og.description.length <= OG_DESCRIPTION_MAX, `og:description ${og.description}`);
  const [img] = og.images ?? [];
  assert.ok(img, "og:image");
  assert.match(img.url, /^https:\/\/www\.polingual\.com\//);
  assert.equal(img.width, 1200);
  assert.equal(img.height, 630);
  assert.equal(img.type, "image/png");
  assert.ok(img.alt && img.alt.length > 0);
  assert.equal(tw.card, "summary_large_image");
  assert.equal(tw.title, og.title);
  assert.equal(tw.images?.[0]?.url, img.url);
}

test("clip keeps text under the limit and ends on a word", () => {
  const out = clip("one two three four five six seven eight nine ten eleven twelve thirteen", 30);
  assert.ok(out.length <= 30);
  assert.ok(out.endsWith("…"));
  assert.equal(clip("short", 30), "short");
});

test("pageMeta builds an absolute url and the default image", () => {
  const m = pageMeta({ path: "/x", title: "T", description: "D" });
  checkPage(m, `${SITE}/x`);
  assert.equal((m.openGraph as Og).images?.[0]?.url, DEFAULT_OG_IMAGE.url);
});

test("root layout sets site defaults without a page url", () => {
  const m = root.metadata as Metadata;
  const og = m.openGraph as Og;
  assert.equal(og.url, undefined);
  assert.equal(og.siteName, "Polingual");
  assert.equal(og.locale, "en_US");
  assert.deepEqual(m.icons, { apple: [{ url: "/d8/icon-180.png", sizes: "180x180" }] });
  assert.equal(root.viewport.themeColor, THEME_COLOR);
  assert.equal((m.twitter as Tw).card, "summary_large_image");
});

const STATIC: [string, { metadata: unknown }][] = [
  ["/privacy", privacy],
  ["/support", support],
  ["/terms", terms],
  ["/research", research],
  ["/archive", archive],
  ["/brand", brand],
  ["/compare/duolingo-three-languages", compare],
  ["/word", wordIndex],
];

for (const [path, mod] of STATIC) {
  test(`${path} has its own url and full card tags`, () => checkPage(mod.metadata as Metadata, `${SITE}${path}`));
}

test("every learn guide has its own url and full card tags", async () => {
  for (const g of GUIDES) {
    const m = await learnPage.generateMetadata({ params: Promise.resolve({ slug: g.slug }) });
    checkPage(m, `${SITE}/learn/${g.slug}`);
    assert.equal((m.openGraph as Og).locale, g.lang === "es" ? "es_US" : "en_US");
  }
});

test("every word page names the word in its image", async () => {
  for (const w of WORDS) {
    const m = await wordPage.generateMetadata({ params: Promise.resolve({ slug: w.slug }) });
    checkPage(m, `${SITE}/word/${w.slug}`);
    const img = (m.openGraph as Og).images![0];
    assert.equal(img.url, `${SITE}/word/${w.slug}/og.png`);
    assert.ok(img.alt!.toLowerCase().includes(w.en.toLowerCase()), img.alt);
  }
});

test("photon pages have their own url", async () => {
  const hit = bakedSearch("water", { topK: 1 }).results[0];
  const m = await photonPage.generateMetadata({ params: Promise.resolve({ id: encodeURIComponent(hit.id) }) });
  checkPage(m, `${SITE}/photon/${encodeURIComponent(hit.id)}`);
});

test("share pages point at their own url and image", async () => {
  for (const kind of SHARE_KINDS) {
    const query = SAMPLE_SHARES[kind];
    const m = await sharePage.generateMetadata({ params: Promise.resolve({ kind: kind ? [kind] : undefined }), searchParams: Promise.resolve(query) });
    const og = m.openGraph as Og;
    assert.ok(og.url!.startsWith(`${SITE}/s${kind ? `/${kind}` : ""}`), og.url);
    checkPage(m, og.url!);
    assert.ok(og.images![0].url.startsWith(`${SITE}/api/share/og?kind=${kind}`));
    assert.deepEqual(m.robots, { index: false, follow: true });
  }
});

test("the 404 page carries no page url", () => {
  const m = notFound.metadata as Metadata;
  assert.equal(m.openGraph, undefined);
  assert.equal(m.alternates, undefined);
});
