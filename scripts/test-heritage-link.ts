import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { heritageLangs, studyHref } from "../src/lib/academy/lang-systems";
import { HeritageLink } from "../src/app/research-os/(app)/learn/languages/LangStudy";

test("heritage applies to targets written in a non-Latin script", () => {
  assert.deepEqual(heritageLangs({ targets: ["es", "ru", "ja", "fr"] }), ["ru", "ja"]);
  assert.deepEqual(heritageLangs({ targets: ["es", "fr"] }), []);
});

test("study links toggle the heritage query", () => {
  assert.equal(studyHref("abc", true), "/research-os/learn/languages/abc/study?heritage=1");
  assert.equal(studyHref("abc", false), "/research-os/learn/languages/abc/study");
  assert.equal(studyHref("a b", false), "/research-os/learn/languages/a%20b/study");
});

test("the study screen links into heritage mode and back without the query by hand", () => {
  const off = renderToStaticMarkup(createElement(HeritageLink, { systemId: "s1", langs: ["ru", "ja"], on: false }));
  assert.match(off, /href="\/research-os\/learn\/languages\/s1\/study\?heritage=1"/);
  assert.match(off, /I speak Russian or Japanese but can(&#x27;|')t read the script/);
  const on = renderToStaticMarkup(createElement(HeritageLink, { systemId: "s1", langs: ["ru"], on: true }));
  assert.match(on, /href="\/research-os\/learn\/languages\/s1\/study"/);
  assert.match(on, /back to regular study/);
  assert.equal(renderToStaticMarkup(createElement(HeritageLink, { systemId: "s1", langs: [], on: false })), "");
});
