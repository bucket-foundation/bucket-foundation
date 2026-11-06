import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Tile } from "../app/tile";
import { WordView } from "../app/(site)/word/views";
import { MAX_PX, MIN_PX, ROOM_ICON_CQI, capPx, fitCqi, fitPx, fitVars, wordEm } from "./tile-fit";
import { snapshot, stop, toggle } from "./speak";
import { word } from "./words";

const CSS = readFileSync(join(process.cwd(), "src/app/site.module.css"), "utf8");

function rule(selector: string): string {
  const at = CSS.indexOf(`${selector}{`);
  assert.ok(at >= 0, `missing ${selector}`);
  return CSS.slice(at + selector.length + 1, CSS.indexOf("}", at));
}

const LONGEST: [string, string, number][] = [
  ["en", "tomorrow", 4.72], ["es", "mantequilla", 5.69], ["fr", "aujourd'hui", 5.33], ["it", "camminare", 5.2], ["pt", "cor-de-rosa", 5.56],
  ["de", "schwimmen", 5.63], ["nl", "onderwijzen", 5.81], ["sv", "långsam", 4.05], ["ru", "преподавать", 6.43], ["ja", "じゃがいも", 5],
  ["ar", "مُوسِيقَى", 3.79], ["el", "χαρούμενος", 5.98], ["fi", "vaaleanpunainen", 8.06], ["hi", "मधुमक्खी", 3.75], ["ko", "머리카락", 3.68],
  ["pl", "pomarańczowy", 7.18], ["zh", "粉红色", 3], ["ang", "ǣrendġewrit", 6.13], ["cs", "přemýšlet", 4.76], ["fa", "اُسْتُخْوَان", 3.81],
  ["grc", "σανδαράκινος", 7.09], ["he", "מוּזִיקָה", 3.05], ["id", "menemukan", 5.79], ["la", "autocīnētum", 5.92], ["sa", "जलवेष्टितभूमि", 5.38],
  ["ta", "உருளைக்கிழங்கு", 10.14], ["th", "ดวงอาทิตย์", 4.65], ["tr", "kahverengi", 5.23], ["vi", "giường", 3.38],
];

test("the speaker sits inline right after the word", () => {
  const html = renderToStaticMarkup(<Tile lang="it" code="it" label="Italian" word="marrone" play={<button type="button" />} />);
  assert.match(html, /<span class="wd"><b class="word"[^>]*>marrone<\/b><span class="snd"><svg[^>]*aria-hidden="true"/);
  const bare = renderToStaticMarkup(<Tile lang="la" code="la" label="Latin" word="spadix" />);
  assert.doesNotMatch(bare, /class="snd"/);
});

test("the deal-in delay staggers by tile index", () => {
  assert.match(renderToStaticMarkup(<Tile lang="es" code="es" label="Spanish" word="noche" index={3} />), /--i:3/);
  assert.match(renderToStaticMarkup(<Tile lang="es" code="es" label="Spanish" word="noche" index={40} />), /--i:11/);
  assert.match(CSS, /\.tile\{animation:deal \.5s cubic-bezier\(\.2,\.9,\.3,1\.2\) backwards;animation-delay:calc\(var\(--i,0\) \* 110ms\)/);
  assert.match(CSS, /@keyframes deal\{from\{rotate:y -90deg\}\}/);
});

test("reduced motion drops the deal, the transition and the hover lift", () => {
  const blocks = CSS.match(/@media \(prefers-reduced-motion:reduce\)\{(?:[^{}]*\{[^{}]*\})*\}/g) ?? [];
  assert.equal(blocks.length, 1);
  assert.match(blocks[0], /\.tile\{animation:none;transition:none\}/);
  assert.match(blocks[0], /\.tile:has\(\.play\):hover\{transform:none\}/);
});

test("the resting tilt and hover lift match the landing tiles", () => {
  assert.equal(rule(".tile:nth-child(odd)"), "transform:rotate(-2deg)");
  assert.equal(rule(".tile:nth-child(even)"), "transform:rotate(1.5deg) translateY(-6px)");
  assert.equal(rule(".tile:has(.play):hover"), "transform:translateY(-6px) rotate(0)");
  assert.match(rule(".snd svg"), /width:22px;height:22px/);
});

test("the play button covers the whole tile and a tap plays or stops", () => {
  assert.match(rule(".play"), /^position:absolute;inset:0;z-index:3;width:100%;height:100%/);
  const html = renderToStaticMarkup(<WordView w={word("brown")!} code="en" />);
  assert.match(html, /<li[^>]*>(?:(?!<\/li>).)*<button type="button" class="play"[^>]*aria-label="Listen to brown"/s);
  const item = { id: "en", text: "brown", lang: "en-US" };
  stop();
  toggle(item, false);
  assert.equal(snapshot().id, "en");
  toggle(item, true);
  assert.equal(snapshot().id, null);
});

test("the longest form in each language fits one line at or above the 12px floor", () => {
  const narrowest = 168;
  const room = (narrowest * ROOM_ICON_CQI) / 100;
  for (const [lang, form, em] of LONGEST) {
    assert.ok(wordEm(form) >= em, `${lang} ${form} estimate ${wordEm(form)} under measured ${em}`);
    const px = fitPx(form, narrowest);
    assert.ok(px >= MIN_PX, `${lang} ${form} ${px}`);
    assert.ok(em * px <= room + 0.5, `${lang} ${form} needs ${em * px}px of ${room}`);
  }
});

test("the word size is set in CSS from a build-time fit, with no client fitting", () => {
  const html = renderToStaticMarkup(<Tile lang="ru" code="ru" label="Russian" word="коричневый" play={<button type="button" />} />);
  assert.match(html, /--fit:[\d.]+;--fit-icon:[\d.]+;--cap:54px/);
  assert.match(CSS, /\.word\{[^}]*font-size:clamp\(12px,calc\(var\(--fit,20\) \* 1cqi\),var\(--cap,54px\)\)/);
  assert.match(rule(".tile:has(.play) .word"), /clamp\(12px,calc\(var\(--fit-icon,20\) \* 1cqi\)/);
  assert.match(CSS, /\.word\{[^}]*overflow-wrap:normal;word-break:keep-all;hyphens:none;text-wrap:balance/);
  assert.match(CSS, /\.tile\{position:relative;container-type:inline-size/);
  const page = renderToStaticMarkup(<WordView w={word("brown")!} code="ru" />);
  assert.doesNotMatch(page, /data-fit/);
});

test("fit caps single words at 54px and phrases at 24px", () => {
  assert.equal(capPx("brun"), MAX_PX);
  assert.equal(capPx("màu da cam"), 24);
  assert.equal(capPx("橙色", "/ʈʂʰə̌ŋ.sɤ̂/ · chéngsè"), 44);
  assert.equal(capPx("牛乳", "ぎゅうにゅう · gyūnyū"), 44);
  assert.equal(capPx("brun", "/bʁœ̃/"), 54);
  assert.equal(fitPx("八", 180), 54);
  assert.ok(fitCqi("brown") < Number(fitVars("brown")["--fit"]));
});
