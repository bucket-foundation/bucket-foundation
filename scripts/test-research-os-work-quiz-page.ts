import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LanguagePicker, { CHIP_OFF, CHIP_ON } from "../src/app/research-os/(app)/quiz/LanguagePicker";
import { WordCredit } from "../src/app/research-os/(app)/quiz/WorkQuiz";
import { languagesByName, systemLanguageCodes, withSystemLanguages } from "../src/lib/research-os/work-quiz/languages";
import type { PublicQuestion } from "../src/lib/research-os/work-quiz/types";

const noSave = async (next: string[]) => next;

test("the language picker lists all 27 names in Academy chip style and marks the saved ones pressed", () => {
  const html = renderToStaticMarkup(createElement(LanguagePicker, { languages: ["he", "de"], save: noSave }));
  for (const l of languagesByName()) assert.ok(html.includes(`>${l.name}</button>`), l.name);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 2);
  assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 25);
  assert.ok(html.includes(`class="${CHIP_ON}"`) && html.includes(`class="${CHIP_OFF}"`));
  assert.ok(CHIP_ON.includes("rounded-full") && CHIP_ON.includes("min-h-[44px]"));
  assert.match(html, /Wiktionary via Kaikki, CC-BY-SA/);
  assert.match(html, /Changes save as you tap/);
});

test("languages from the language systems show pressed and locked, with a link to change them there", () => {
  const html = renderToStaticMarkup(createElement(LanguagePicker, { languages: ["de"], fromSystems: ["en", "ru"], save: noSave }));
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 3);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 2);
  assert.match(html, /title="From your language systems"[^>]*>English</);
  assert.match(html, /href="\/research-os\/learn\/languages"/);
  assert.match(html, /always on here\. Change them there\./);
  assert.doesNotMatch(renderToStaticMarkup(createElement(LanguagePicker, { languages: ["de"], save: noSave })), /from-systems/);
});

test("system languages take each root and target once, skip codes outside the word set, and append after the chosen ones", () => {
  assert.deepEqual(systemLanguageCodes([{ root: "en", targets: ["ru", "xx"] }, { root: "ru", targets: ["en", "de"] }]), ["en", "ru", "de"]);
  assert.deepEqual(withSystemLanguages(["de", "fr"], ["en", "de"]), ["de", "fr", "en"]);
  assert.deepEqual(withSystemLanguages([], []), []);
});

test("a word question shows its language and the Wiktionary credit; a work question shows nothing", () => {
  const word: PublicQuestion = { id: "m1", type: "meaning", prompt: "Which Hebrew word means \"peace\"?", lines: [], choices: ["שלום", "מלך"], limitSec: 20, word: { lang: null, choicesLang: "he", credit: "Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0", href: "https://en.wiktionary.org" } };
  const html = renderToStaticMarkup(createElement(WordCredit, { q: word }));
  assert.match(html, /Hebrew · /);
  assert.match(html, /href="https:\/\/en\.wiktionary\.org"[^>]*>Wiktionary via Kaikki \(kaikki\.org\), CC-BY-SA 3\.0</);
  const unnamed: PublicQuestion = { ...word, type: "language", word: { ...word.word!, choicesLang: null } };
  const hidden = renderToStaticMarkup(createElement(WordCredit, { q: unnamed }));
  assert.ok(!hidden.includes("Hebrew"));
  assert.match(hidden, /CC-BY-SA/);
  const work: PublicQuestion = { id: "r", type: "recall", prompt: "p", lines: [], choices: null, limitSec: 20 };
  assert.equal(renderToStaticMarkup(createElement(WordCredit, { q: work })), "");
});
