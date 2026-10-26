import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FAQ, FACTS, appJsonLd, faqJsonLd, jsonLdScript } from "./facts";

test("faq json-ld mirrors every visible question", () => {
  const ld = faqJsonLd();
  assert.equal(ld["@type"], "FAQPage");
  assert.deepEqual(ld.mainEntity.map((q) => q.name), FAQ.map((f) => f.q));
});

test("app json-ld names the iOS app", () => {
  const ld = appJsonLd();
  assert.equal(ld["@type"], "MobileApplication");
  assert.equal(ld.operatingSystem, "iOS");
  assert.match(ld.description, new RegExp(String(FACTS.languageCount)));
});

test("json-ld script cannot close its tag", () => {
  assert.ok(!jsonLdScript({ a: "</script>" }).includes("</"));
});

test("llms.txt links the pages it names", () => {
  const txt = readFileSync(join(__dirname, "../../public/llms.txt"), "utf8");
  assert.match(txt, /^# Polingual/);
  assert.match(txt, /\/compare\/duolingo-three-languages/);
  assert.match(txt, new RegExp(`${FACTS.languageCount} languages`));
});
