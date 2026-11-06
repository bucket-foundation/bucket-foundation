import assert from "node:assert/strict";
import { test } from "node:test";
import { OG_DESCRIPTION_MAX, OG_IMAGE_MAX_BYTES, OG_TITLE_MAX } from "./meta";
import { SHARE_KINDS, appSiteAssociation, ogParams, ogPath, parseForms, sharePath, shareView } from "./share";
import { SAMPLE_SHARES } from "./share-samples";
import { scriptFamilies } from "./og-fonts";
import { WORDS } from "./words";
import { wordOgAlt } from "./word-og";
import { shapeArabic, visualOrder } from "./rtl-shape";
import { GET as shareOg } from "../app/api/share/og/route";
import { GET as wordOg } from "../app/word/[slug]/og.png/route";
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
  assert.deepEqual(scriptFamilies("水 ماء पानी น้ำ தண்ணீர் 물 מים"), ["Noto Sans JP", "Noto Sans KR", "Noto Sans Thai", "Noto Sans Arabic", "Noto Sans Hebrew", "Noto Sans Devanagari", "Noto Sans Tamil"]);
  assert.deepEqual(scriptFamilies("water"), []);
});

for (const kind of SHARE_KINDS) {
  test(`share og image for kind "${kind}" is a 1200x630 png under 300 KB`, async () => {
    await checkPng(await shareOg(new Request(`https://www.polingual.com${ogPath(kind, SAMPLE_SHARES[kind])}`)));
  });
}

test("word og images are 1200x630 pngs under 300 KB and name the word", async () => {
  for (const w of WORDS.slice(0, 3)) {
    await checkPng(await wordOg(new Request(`https://www.polingual.com/word/${w.slug}/og.png`), { params: Promise.resolve({ slug: w.slug }) }));
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
  assert.equal(visualOrder("\u05e9\u05dc\u05d5\u05dd"), "\u05dd\u05d5\u05dc\u05e9");
  assert.equal(visualOrder("\u0645\u0627\u0621"), "\u0621\ufe8e\ufee3");
  assert.equal(shapeArabic("\u0628\u064a\u062a"), "\ufe91\ufef4\ufe96");
  assert.equal(shapeArabic("\u062f\u0627\u0631"), "\ufea9\ufe8d\ufead");
});
