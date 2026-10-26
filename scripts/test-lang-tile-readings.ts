import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildLangCorpus, createSystem, matchExercise, readingLabel, seededRng, type Exercise } from "../src/lib/academy/lang-systems";
import { linkForms } from "../src/lib/academy/lang-layout";
import LangExercise, { ReadingsContext } from "../src/app/research-os/(app)/learn/languages/LangExercise";

const ROOT = path.join(__dirname, "..");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(ROOT, "learning/app/corpus", f), "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));

test("readingLabel joins kana, romanization and IPA", () => {
  assert.equal(readingLabel(undefined), null);
  assert.equal(readingLabel({}), null);
  assert.equal(readingLabel({ ipa: "ˈoʊ" }), "/ˈoʊ/");
  assert.equal(readingLabel({ kana: "いぬ", roman: "inu" }), "いぬ · inu");
  assert.equal(readingLabel({ roman: "  " }), null);
});

test("linked word tiles carry the reading of each language", () => {
  const item = corpus.items.find((i) => i.kind === "word" && i.forms.ru && i.forms.ja && i.forms.es)!;
  const sys = createSystem("en", ["es", "ru", "ja"], [], 0);
  const links = linkForms(item, sys, "es");
  assert.ok(links.length > 0);
  for (const l of links) if (l.lang !== "en" || item.readings.en) assert.deepEqual(l.reading, item.readings[l.lang]);
  const ru = links.find((l) => l.lang === "ru")!;
  assert.ok(readingLabel(ru.reading));
});

test("same-root tiles carry readings", () => {
  const sys = createSystem("en", ["es", "fr", "it", "pt"], [], 0);
  const item = corpus.items.find((i) => i.kind === "word" && i.cognateLangs.filter((l) => sys.targets.includes(l)).length >= 2)!;
  const ex = matchExercise(corpus, sys, item, seededRng(3))!;
  assert.ok(ex.family!.length >= 2);
  for (const f of ex.family!) assert.deepEqual(f.reading, item.readings[f.lang]);
});

function render(ex: Exercise, readings: boolean, links?: Parameters<typeof LangExercise>[0]["links"]) {
  return renderToStaticMarkup(createElement(ReadingsContext.Provider, { value: readings }, createElement(LangExercise, { ex, onDone: () => {}, links, targetLayout: true })));
}

test("intro tiles show IPA or romanization under each linked word, and hide them when readings are off", () => {
  const item = corpus.items.find((i) => i.kind === "word" && i.forms.ru && i.forms.es && i.forms.ja)!;
  const sys = createSystem("en", ["es", "ru", "ja"], [], 0);
  const links = linkForms(item, sys, "es");
  const ex: Exercise = { kind: "intro", itemId: item.id, lang: "es", root: "en", prompt: item.forms.en, promptLang: "en", answer: item.forms.es, answerLang: "es", answerReading: item.readings.es };
  const on = render(ex, true, links).replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
  assert.match(on, /data-testid="link-word"/);
  assert.ok(on.includes(readingLabel(item.readings.ru)!), readingLabel(item.readings.ru)!);
  assert.match(on, /data-testid="link-word-reading"/);
  const off = render(ex, false, links);
  assert.doesNotMatch(off, /link-word-reading/);
  assert.match(off, /data-testid="link-word"/);
});
