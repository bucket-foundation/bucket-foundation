import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as { React?: typeof React }).React = React;
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MeaningLine } from "@learn/languages/LangExercise";
import { withMeaning, type Exercise, type ExerciseKind } from "@academy/lang-systems";
import { nativeCorpus } from "./daily/fixture";

const KINDS: ExerciseKind[] = ["intro", "choose", "reverse", "listen", "translate", "type-heard", "speak", "cloze", "cognate", "match", "sentence", "wordbank", "gender", "conjugate", "false-friend", "spell-heard"];

for (const root of ["en", "fr"]) {
  for (const kind of KINDS) {
    test(`${kind} feedback shows the word's language and the ${root} meaning`, () => {
      const corpus = nativeCorpus();
      const ex: Exercise = withMeaning({ kind, itemId: "hundred", lang: "es", root, prompt: "cien", promptLang: "es", answer: "cien", answerLang: "es" }, corpus);
      const html = renderToStaticMarkup(<MeaningLine ex={ex} />);
      const rootName = root === "en" ? "English" : "French";
      const meaning = corpus.byId.get("hundred")!.forms[root];
      assert.match(html, new RegExp(`data-testid="feedback-meaning"[\\s\\S]*${rootName}[\\s\\S]*${meaning}`));
    });
  }
}

test("letter cards carry no word meaning", () => {
  const ex = withMeaning({ kind: "letter", itemId: "abc:а", lang: "ru", root: "en", prompt: "a", promptLang: "ru", answer: "а", answerLang: "ru" }, nativeCorpus());
  assert.equal(ex.meaning, undefined);
});

test("every feedback names the answer's language beside it", () => {
  const src = readFileSync(join(process.cwd(), "../src/app/research-os/(app)/learn/languages/LangExercise.tsx"), "utf8");
  assert.match(src, /data-testid="feedback-lang">\{langName\(ex\.answerLang\)\}/);
  assert.match(src, /<MeaningLine ex=\{ex\} \/>/);
});
