import assert from "node:assert/strict";
import { test } from "node:test";
import { OG_DESCRIPTION_MAX, OG_IMAGE_MAX_BYTES, OG_TITLE_MAX } from "./meta";
import { PARAM_LIMITS, SHARE_KINDS, appSiteAssociation, clampParams, ogParams, ogPath, parseForms, sharePath, shareView } from "./share";
import { SAMPLE_SHARES } from "./share-samples";
import { scriptFamilies } from "./og-fonts";
import { WORDS } from "./words";
import { wordOgAlt } from "./word-og";
import { shapeArabic, visualOrder } from "./rtl-shape";
import { OG_CACHE_FAIL, OG_CACHE_OK, renderOg } from "./og-render";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GET as shareOg } from "../app/api/share/og/route";
import { GET as wordOg } from "../app/word/[slug]/og/route";
import { GET as aasa } from "../app/.well-known/apple-app-site-association/route";

const PNG = [0x89, 0x50, 0x4e, 0x47];

async function checkPng(res: Response) {
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/png");
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 4)], PNG);
  assert.ok(bytes.length < OG_IMAGE_MAX_BYTES, `${bytes.length} bytes`);
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(16), 1200);
  assert.equal(view.getUint32(20), 630);
}

test("parseForms reads lang:form pairs and caps at six", () => {
  assert.deepEqual(parseForms("fr:eau|es:agua|bad|:x"), [{ lang: "fr", form: "eau" }, { lang: "es", form: "agua" }]);
  assert.equal(parseForms(Array.from({ length: 9 }, (_, i) => `l${i}:w`).join("|")).length, 6);
});

test("every share kind has a title and description inside messenger limits", () => {
  for (const kind of SHARE_KINDS) {
    const v = shareView(kind, SAMPLE_SHARES[kind]);
    assert.ok(v.title.length > 0 && v.title.length <= OG_TITLE_MAX, `${kind}: ${v.title}`);
    assert.ok(v.description.length > 0 && v.description.length <= OG_DESCRIPTION_MAX, `${kind}: ${v.description}`);
    if (kind) assert.notEqual(v.title, shareView("", {}).title, kind);
  }
});

test("word share names the gloss and keeps each form", () => {
  const v = shareView("w", SAMPLE_SHARES.w);
  assert.equal(v.title, "Water");
  assert.equal(v.eyebrow, "One word in 6 languages");
  assert.equal(v.forms.length, 6);
});

test("language share names the languages and the root", () => {
  const v = shareView("l", SAMPLE_SHARES.l);
  assert.equal(v.title, "Learning French, Italian and Japanese together");
  assert.match(v.description, /from Spanish/);
  assert.equal(v.eyebrow, "5 day streak");
});

test("invalid params fall back to the Polingual card", () => {
  assert.equal(shareView("w", { g: "water" }).title, shareView("", {}).title);
  assert.equal(shareView("g", { c: "bad", n: "x" }).title, shareView("", {}).title);
  assert.equal(shareView("x", { t: "Drill", p: "3", m: "0" }).title, shareView("", {}).title);
});

test("share and og paths round trip the query", () => {
  const path = ogPath("g", SAMPLE_SHARES.g);
  const { kind, params } = ogParams(new URL(path, "https://www.polingual.com").searchParams);
  assert.equal(kind, "g");
  assert.equal(params.k, "family");
  assert.equal(sharePath("w", { g: "water", junk: "x" }), "/s/w?g=water");
});

test("script families cover the scripts shared from the app", () => {
  assert.deepEqual(scriptFamilies("水 ماء पानी น้ำ தண்ணீர் 물 מים"), ["Noto Sans JP", "Noto Sans KR", "Noto Sans Thai", "Vazirmatn", "Noto Sans Hebrew", "Noto Sans Devanagari", "Noto Sans Tamil"]);
  assert.deepEqual(scriptFamilies("water"), []);
});

for (const kind of SHARE_KINDS) {
  test(`share og image for kind "${kind}" is a 1200x630 png under 300 KB`, async () => {
    await checkPng(await shareOg(new Request(`https://www.polingual.com${ogPath(kind, SAMPLE_SHARES[kind])}`)));
  });
}

test("word og images are 1200x630 pngs under 300 KB and name the word", async () => {
  for (const w of WORDS.slice(0, 3)) {
    await checkPng(await wordOg(new Request(`https://www.polingual.com/word/${w.slug}/og`), { params: Promise.resolve({ slug: w.slug }) }));
    assert.match(wordOgAlt(w), new RegExp(w.en, "i"));
  }
});

test("apple-app-site-association lists the Polingual app for share and word links", async () => {
  const res = aasa();
  assert.equal(res.headers.get("content-type"), "application/json");
  assert.deepEqual(await res.json(), appSiteAssociation());
  const [detail] = appSiteAssociation().applinks.details;
  assert.deepEqual(detail.appIDs, ["QQ6D6A2LLS.com.polingual.app"]);
  assert.deepEqual(detail.components.map((c) => c["/"]), ["/s", "/s/*", "/word/*"]);
});

test("rtl forms are shaped and put in visual order for the og image", () => {
  assert.equal(visualOrder("water"), "water");
  assert.equal(visualOrder("שלום"), "םולש");
  assert.equal(visualOrder("ماء"), "ءﺎﻣ");
  assert.equal(shapeArabic("بيت"), "ﺑﻴﺖ");
  assert.equal(shapeArabic("دار"), "ﺩﺍﺭ");
});

test("lam alef becomes one ligature in isolated and final position", () => {
  assert.equal(shapeArabic("لا"), "ﻻ");
  assert.equal(shapeArabic("سلام"), "ﺳﻼﻡ");
  assert.equal(shapeArabic("لآ"), "ﻵ");
});

test("urdu letters take their contextual forms", () => {
  assert.equal(shapeArabic("پانی"), "ﭘﺎﻧﯽ");
  assert.equal(shapeArabic("ٹھیک"), "ﭨﮭﯿﮏ");
  assert.equal(shapeArabic("گھر"), "ﮔﮭﺮ");
  assert.equal(shapeArabic("ہے"), "ﮨﮯ");
});

test("marks stay on their letter and do not break joining", () => {
  assert.equal(shapeArabic("بَي"), "ﺑَﻲ");
  assert.equal(visualOrder("بَي"), "ﻲﺑَ");
});

test("embedded ltr runs keep their order inside rtl text", () => {
  assert.equal(visualOrder("א ABC 12 ב"), "ב ABC 12 א");
  assert.equal(visualOrder("א 2026"), "2026 א");
});

test("share params match the routes ShareObject.swift builds", () => {
  const swift = readFileSync(join(__dirname, "../../../apple/BucketKit/Sources/BucketKit/ShareObject.swift"), "utf8");
  const kinds = [...swift.matchAll(/path: "\/(\w)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(kinds)].sort(), ["a", "c", "d", "l", "w", "x"]);
  for (const k of kinds) assert.ok(SHARE_KINDS.includes(k as never), k);
  const names = [...new Set([...swift.matchAll(/URLQueryItem\(name: "(\w+)"/g)].map((m) => m[1]))];
  for (const n of names) assert.ok(n in PARAM_LIMITS, `missing param ${n}`);
  for (const m of swift.matchAll(/URLQueryItem\(name: "(\w+)", value: clip\([^,]+, (\d+)\)\)/g)) assert.ok(PARAM_LIMITS[m[1]] >= Number(m[2]), `${m[1]} limit ${PARAM_LIMITS[m[1]]} < ${m[2]}`);
  assert.ok(/clip\(\$0\.form[^)]*\), 40\)/.test(swift));
  assert.ok(/prefix\(6\)/.test(swift));
});

test("params are clamped to the app limits by grapheme", () => {
  const long = "नमस्ते".repeat(30);
  const p = clampParams({ t: long, g: "x".repeat(500), junk: "y", at: "99999999999" });
  assert.equal([...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(p.t)].length, 80);
  assert.equal(p.g.length, 60);
  assert.equal(p.at.length, 7);
  assert.equal("junk" in p, false);
  const forms = parseForms(`hi:${long}`);
  assert.equal([...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(forms[0].form)].length, 40);
});

test("og renders cache for a day when fonts load and send no-store otherwise", async () => {
  const ok = await renderOg(<div style={{ display: "flex" }}>ok</div>, { fonts: [], complete: true });
  assert.equal(ok.headers.get("cache-control"), OG_CACHE_OK);
  assert.match(OG_CACHE_OK, /s-maxage=86400/);
  assert.match(OG_CACHE_OK, /stale-while-revalidate=/);
  const partial = await renderOg(<div style={{ display: "flex" }}>ok</div>, { fonts: [], complete: false });
  assert.equal(partial.headers.get("cache-control"), OG_CACHE_FAIL);
  await checkPng(partial);
  const broken = await renderOg(<div><span>a</span><span>b</span></div>, { fonts: [], complete: true });
  assert.equal(broken.headers.get("cache-control"), OG_CACHE_FAIL);
  await checkPng(broken);
});

test("the share og route sends no-store when fonts fail to load", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  try {
    const res = await shareOg(new Request(`https://www.polingual.com${ogPath("w", SAMPLE_SHARES.w)}`));
    assert.equal(res.headers.get("cache-control"), OG_CACHE_FAIL);
    await checkPng(res);
  } finally {
    globalThis.fetch = real;
  }
});
