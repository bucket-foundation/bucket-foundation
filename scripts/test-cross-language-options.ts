import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildLangCorpus, createSystem, crossLanguageOptions, seededRng, type Exercise } from "../src/lib/academy/lang-systems";

const dir = path.join(__dirname, "../apple/BucketKit/Tests/BucketKitTests/Fixtures/lang");
const read = (n: string) => JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), "utf8"));
const corpus = buildLangCorpus(read("core"), read("cognates"), read("phrases"), read("layers"));
const golden = read("golden") as { cross: { itemId: string; lang: string; options: string[] | null; optionLangs: string[] | null }[] };
const item = corpus.byId.get("eight")!;
const system = createSystem("en", ["fr", "es", "it", "de"], [], 0);
const choose: Exercise = { kind: "choose", itemId: "eight", lang: "fr", root: "en", prompt: "eight", promptLang: "en", answer: item.forms.fr, answerLang: "fr", options: [item.forms.fr, "neuf", "sept", "six"] };

test("options come from the learner's other languages first, labeled by language", () => {
  const out = crossLanguageOptions(choose, item, system, seededRng(1));
  assert.equal(out.options!.length, 4);
  assert.ok(out.options!.includes(item.forms.fr));
  for (const o of out.options!) assert.ok(out.optionLangs![o]);
  assert.deepEqual(Object.values(out.optionLangs!).sort(), ["de", "es", "fr", "it"]);
});

test("non-choose exercises pass through unchanged", () => {
  const typed = { ...choose, kind: "translate" as const };
  assert.equal(crossLanguageOptions(typed, item, system, seededRng(1)), typed);
});

test("a one-language system keeps the same-language distractors", () => {
  const solo = createSystem("en", ["fr"], [], 0);
  assert.equal(crossLanguageOptions(choose, item, solo, seededRng(1)), choose);
});

test("golden cross rows pair each option with a language", () => {
  assert.ok(golden.cross.length > 100);
  assert.ok(golden.cross.every((r) => r.options && r.optionLangs && r.options.length === r.optionLangs.length));
});
