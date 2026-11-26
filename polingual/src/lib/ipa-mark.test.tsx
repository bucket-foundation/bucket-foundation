import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { IpaMark, isGeneratedIpa } from "@/ui";
import WordCard from "../app/(site)/app/[system]/study/WordCard";
import type { Exercise } from "@/lib/academy/lang-systems";

test("IpaMark shows generated for epitran and llm only", () => {
  assert.match(renderToStaticMarkup(<IpaMark source="epitran" />), /data-testid="ipa-generated"[^>]*>generated</);
  assert.match(renderToStaticMarkup(<IpaMark source="llm" />), />generated</);
  assert.equal(renderToStaticMarkup(<IpaMark source="wiktionary" />), "");
  assert.equal(renderToStaticMarkup(<IpaMark source={null} />), "");
  assert.equal(isGeneratedIpa(undefined), false);
  for (const s of ["rules", "jmdict", "cedict"]) assert.match(renderToStaticMarkup(<IpaMark source={s} />), /title="Pronunciation from spelling rules"/);
});

function card(source?: "wiktionary" | "llm") {
  const ex = { kind: "intro", lang: "es", prompt: "dog", promptLang: "en", answer: "perro", answerLang: "es", answerReading: { ipa: "ˈpero", ipa_source: source } } as unknown as Exercise;
  return renderToStaticMarkup(<WordCard ex={ex} readings onNext={() => {}} />);
}

test("WordCard marks generated IPA", () => {
  assert.match(card("llm"), /ipa-generated/);
  assert.doesNotMatch(card("wiktionary"), /ipa-generated/);
});

test("search and photon pages render IpaMark beside IPA", () => {
  for (const f of ["src/app/search.tsx", "src/app/(site)/photon/[id]/page.tsx"]) {
    assert.match(readFileSync(join(process.cwd(), f), "utf8"), /<IpaMark source=\{\w+\.ipa_source\} \/>/);
  }
});
