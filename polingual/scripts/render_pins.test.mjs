import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { credit, loadCredit, loadConcepts, pickTiles, pinHtml } from "./render_pins.mjs";

test("credit reads the license version from lang-core metadata", () => {
  assert.equal(credit({ license: "kaikki.org data, CC-BY-SA 4.0, more" }).text, "Words from Wiktionary via Kaikki, CC BY-SA 4.0");
  assert.equal(credit({ license: "CC-BY-SA 4.0" }).url, "https://creativecommons.org/licenses/by-sa/4.0/");
  assert.throws(() => credit({ license: "no license here" }));
});

test("pins rotate their languages", () => {
  const langs = loadConcepts().get("pig").langs;
  const first = pickTiles(langs, 6, 0).map((t) => t.lang);
  const second = pickTiles(langs, 6, 1).map((t) => t.lang);
  assert.notDeepEqual(first, second);
});

test("a rendered pin's caption carries the credit", async () => {
  const cr = loadCredit();
  const tiles = pickTiles(loadConcepts().get("pig").langs);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(pinHtml("pig", tiles, "", cr.text));
  assert.equal(await page.locator(".cr").innerText(), cr.text);
  await browser.close();
});
