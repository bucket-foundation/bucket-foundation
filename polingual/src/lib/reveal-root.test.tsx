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

const REVEAL_TAGS = ["GameResults", "WordReveal", "RevealCard", "Reveal", "LearnPanel", "Results"];

function openingTags(src: string, names: readonly string[]): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  const start = new RegExp(`<(${names.join("|")})(?=[\\s/>])`, "g");
  for (const m of src.matchAll(start)) {
    let depth = 0;
    let quote: string | null = null;
    let i = (m.index ?? 0) + m[0].length;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === quote && src[i - 1] !== "\\") quote = null;
      } else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    out.push({ name: m[1], text: src.slice(m.index ?? 0, i + 1) });
  }
  return out;
}

test("the tag scanner reads self-closing, child-bearing and spread tags", () => {
  const src = `
    <Reveal rootLang={r} words={w.map((x) => x)} />
    <WordReveal title="a > b" {...props}>
      <p>child</p>
    </WordReveal>
    <LearnPanel missed={m} onDone={() => { go(); }}>x</LearnPanel>
    <RevealCardish />
  `;
  const tags = openingTags(src, REVEAL_TAGS);
  assert.deepEqual(tags.map((t) => t.name), ["Reveal", "WordReveal", "LearnPanel"]);
  assert.match(tags[0].text, /rootLang=/);
  assert.match(tags[1].text, /\{\.\.\.props\}>$/);
  assert.match(tags[2].text, /onDone=\{\(\) => \{ go\(\); \}\}>$/);
  assert.doesNotMatch(tags[2].text, /rootLang/);
});

test("every reveal surface in Play passes a root language", () => {
  let seen = 0;
  for (const file of sources(PLAY)) {
    for (const t of openingTags(readFileSync(file, "utf8"), REVEAL_TAGS)) {
      if (t.name === "Results" && !/result=/.test(t.text)) continue;
      seen++;
      assert.match(t.text, /rootLang[=}\s,]/, `${file}: ${t.text.slice(0, 80)}`);
    }
  }
  assert.ok(seen >= 12, `found ${seen} reveal surfaces`);
});
