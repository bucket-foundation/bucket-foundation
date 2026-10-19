import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FiguresPage from "../src/app/research/figures/page";
import { loadFigures } from "../src/lib/figures";
import sitemap from "../src/app/sitemap";

const ROOT = path.resolve(__dirname, "..");
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/generations/registry.json"), "utf8")) as { generations: { name: string; script: string; data: string[] }[] };
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "public/figures/manifest.json"), "utf8")) as { figures: { name: string; published: boolean; image?: string; ran?: string; missing?: string[] }[] };
const html = renderToStaticMarkup(createElement(FiguresPage));

test("every registry entry appears on the page with its script link", () => {
  for (const g of registry.generations) {
    assert.ok(html.includes(`data-figure="${g.name}"`), `${g.name} is missing from the page`);
    assert.ok(html.includes(`https://github.com/bucket-foundation/bucket-foundation/blob/dev/tools/generations/${g.script}`), `${g.name} has no script link`);
  }
  assert.deepEqual(manifest.figures.map((f) => f.name).sort(), registry.generations.map((g) => g.name).sort());
});

test("every rendered figure has its webp under 400 KB and a run date", () => {
  for (const f of manifest.figures.filter((x) => x.published)) {
    assert.match(f.image ?? "", /^\/figures\/[a-z0-9-]+\.webp$/);
    const file = path.join(ROOT, "public", f.image!);
    assert.ok(fs.existsSync(file), `${f.image} is not on disk`);
    assert.ok(fs.statSync(file).size <= 400 * 1024, `${f.image} is above 400 KB`);
    assert.ok(!Number.isNaN(Date.parse(f.ran ?? "")));
    assert.ok(html.includes(`src="${f.image}"`));
  }
});

test("figures whose data is not published show the waiting state and no image", () => {
  const waiting = manifest.figures.filter((f) => !f.published);
  assert.ok(waiting.length > 0);
  for (const f of waiting) {
    const card = html.split(`data-figure="${f.name}"`)[1].split("</li>")[0];
    assert.ok(card.includes('data-state="waiting"'));
    assert.ok(card.includes("Data not published yet"));
    assert.ok(!card.includes("<img"));
    assert.ok(!fs.existsSync(path.join(ROOT, "public/figures", `${f.name}.webp`)));
  }
});

test("home-relative paths stay out of the manifest and the page", () => {
  assert.ok(!fs.readFileSync(path.join(ROOT, "public/figures/manifest.json"), "utf8").includes("~/"));
  assert.ok(!html.includes("~/"));
  assert.ok(!html.includes(".cache/bucket-atlas"));
  assert.ok(html.includes("local cache"));
});

test("multi-image figures say how many images they hold and language licences link out", () => {
  assert.ok(html.split('data-figure="atlas-plots"')[1].split("</li>")[0].includes("Shows 1 of 9 images"));
  const lang = html.split('data-figure="polingual-coverage"')[1].split("</li>")[0];
  assert.ok(lang.includes('href="https://creativecommons.org/licenses/by-sa/3.0/"'));
  assert.ok(lang.includes('href="https://en.wiktionary.org"'));
});

test("published figures read only data tracked in the repository", () => {
  for (const f of manifest.figures.filter((x) => x.published)) {
    const g = registry.generations.find((x) => x.name === f.name)!;
    for (const d of g.data) assert.ok(!d.startsWith("~/") && fs.existsSync(path.join(ROOT, d)), `${f.name} reads ${d}`);
  }
});

test("language figures come first and the page is in the sitemap", () => {
  const topics = loadFigures().map((f) => f.topic);
  const lastLanguage = topics.lastIndexOf("language");
  assert.ok(lastLanguage >= 0);
  assert.ok(topics.slice(0, lastLanguage + 1).every((t) => t === "language"));
  assert.ok(sitemap().some((e) => e.url.endsWith("/research/figures")));
});
