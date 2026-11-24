import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as { React?: typeof React }).React = React;
import { RevealCard } from "../app/(site)/play/LearnWord";
import { LearnPanel, WordReveal } from "../app/(site)/play/Reveal";

const PLAY = join(process.cwd(), "src/app/(site)/play");

function entry(over: Partial<Parameters<typeof RevealCard>[0]["entry"]> = {}) {
  return { lang: "es", word: "cien", roman: null, reading: null, meaning: "cent", gloss: "cent", correct: true, ...over };
}

for (const root of ["en", "fr", "ja"]) {
  test(`reveal card shows the ${root} translation and the word's language`, () => {
    const html = renderToStaticMarkup(<ul><RevealCard entry={entry()} index={0} rootLang={root} /></ul>);
    const rootName = { en: "English", fr: "French", ja: "Japanese" }[root]!;
    assert.match(html, new RegExp(`data-testid="reveal-root-lang"[^>]*>${rootName}<`));
    assert.match(html, /data-testid="reveal-definition"[\s\S]*cent/);
    assert.match(html, /Spanish/);
  });
}

test("reveal card keeps the root language label when the word has no entry", () => {
  const html = renderToStaticMarkup(<ul><RevealCard entry={entry({ meaning: "", gloss: "" })} index={0} rootLang="de" /></ul>);
  assert.match(html, /data-testid="reveal-root-lang"[^>]*>German</);
});

test("word reveal gives every card the learner's root", () => {
  const html = renderToStaticMarkup(<WordReveal title="t" rootLang="fr" words={[{ lang: "es", word: "cien", meaning: "cent" }, { lang: "de", word: "hundert", meaning: "cent" }]} />);
  assert.equal(html.match(/data-testid="reveal-root-lang"[^>]*>French</g)?.length, 2);
});

test("learn panel names each missed word's language and the root meaning", () => {
  const html = renderToStaticMarkup(<LearnPanel rootLang="fr" missed={[{ lang: "es", word: "cien", meaning: "cent" }]} />);
  assert.match(html, /data-testid="learn-missed-lang"[^>]*>Spanish</);
  assert.match(html, /data-testid="learn-missed-meaning"[^>]*>French: cent</);
});

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

test("every reveal surface in Play passes a root language", () => {
  const tags = /<(GameResults|WordReveal|RevealCard|Reveal|LearnPanel|Results)\b[^>]*?\/>/gs;
  let seen = 0;
  for (const file of sources(PLAY)) {
    for (const m of readFileSync(file, "utf8").matchAll(tags)) {
      if (m[1] === "Results" && !/result=/.test(m[0])) continue;
      seen++;
      assert.match(m[0], /rootLang=/, `${file}: ${m[0].slice(0, 80)}`);
    }
  }
  assert.ok(seen >= 12, `found ${seen} reveal surfaces`);
});
