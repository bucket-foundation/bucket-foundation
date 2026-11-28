import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../src/lib/markdown";
import { PAGES_DIR, readPage } from "../src/lib/pages";

const pages = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith(".md"));

test("content/pages holds at least one page", () => {
  assert.ok(pages.length > 0);
});

for (const file of pages) {
  const name = path.basename(file, ".md");
  test(`content/pages/${file} renders`, () => {
    const html = renderToStaticMarkup(React.createElement(Markdown, { source: readPage(name) }));
    assert.ok(html.includes("<p"));
    assert.ok(!html.includes("voice-ignore"));
  });
  test(`src/app/${name}/page.tsx reads content/pages/${file}`, () => {
    const src = fs.readFileSync(path.join("src", "app", name, "page.tsx"), "utf-8");
    assert.match(src, new RegExp(`readPage\\("${name}"\\)`));
    assert.match(src, /ContentPage/);
  });
}

test("about keeps its links", () => {
  const html = renderToStaticMarkup(React.createElement(Markdown, { source: readPage("about") }));
  for (const href of ["/governance", "/protocol", "/mission", "/manifesto", "/research-os", "/download"]) {
    assert.ok(html.includes(`href="${href}"`), href);
  }
});
