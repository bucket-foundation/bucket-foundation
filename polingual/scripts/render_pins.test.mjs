import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import fs from "node:fs";
import { credit, defaultPins, loadCredit, loadConcepts, pickTiles, pinHtml } from "./render_pins.mjs";

const hasBrowser = (() => {
  try {
    return fs.existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

test("credit reads the license version from lang-core metadata", () => {
  assert.equal(credit({ license: "kaikki.org data, CC-BY-SA 4.0, more" }).text, "Words and pronunciation from Wiktionary via Kaikki, CC BY-SA 4.0");
  assert.equal(credit({ license: "CC-BY-SA 4.0" }).url, "https://creativecommons.org/licenses/by-sa/4.0/");
  assert.throws(() => credit({ license: "no license here" }));
});

test("every default pin shows a different language set and all flags appear", () => {
  const pins = defaultPins(loadConcepts(), 12).map(([, langs], turn) => pickTiles(langs, 6, turn).map((t) => t.lang));
  assert.equal(pins.length, 12);
  for (const p of pins) assert.ok(p.length >= 4 && p.length <= 6);
  for (let i = 1; i < pins.length; i++) assert.notDeepEqual(pins[i], pins[i - 1]);
  assert.equal(new Set(pins.flat()).size, 17);
});

test("a rendered pin's caption carries the credit", { skip: !hasBrowser && "no Chromium installed" }, async () => {
  const cr = loadCredit();
  const tiles = pickTiles(loadConcepts().get("pig").langs);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(pinHtml("pig", tiles, "", cr.text));
  assert.equal(await page.locator(".cr").innerText(), cr.text);
  await browser.close();
});
