import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { config, knownWordPath, middleware } from "../middleware";
import SITE_LANGS from "./site-langs.json";
import SLUGS from "../data/word-slugs.json";
import { WORDS } from "./words";

test("the middleware slug list matches the word list", () => {
  assert.deepEqual(SLUGS, WORDS.map((w) => w.slug));
});

test("junk slugs and unknown languages stop in middleware before any render or ISR write", () => {
  const slug = WORDS[0].slug;
  assert.equal(knownWordPath(`/ko/word/${slug}`), true);
  for (const p of ["/ko/word/zzz-nope", `/xx/word/${slug}`, `/ko/word/${slug}/x`]) {
    assert.equal(knownWordPath(p), false);
    const res = middleware(new NextRequest(`https://polingual.com${p}`));
    assert.equal(res.status, 404);
    assert.equal(res.headers.get("x-middleware-next"), null);
  }
  assert.equal(middleware(new NextRequest(`https://polingual.com/ko/word/${slug}`)).headers.get("x-middleware-next"), "1");
});

test("valid word pages run no middleware; junk paths still do", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { wordMatcher } = require("../../scripts/word-matcher.cjs") as { wordMatcher: () => string[] };
  assert.deepEqual(config.matcher, wordMatcher());
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getMiddlewareMatchers } = require("next/dist/build/analysis/get-page-static-info") as { getMiddlewareMatchers: (m: string[], c: object) => { regexp: string }[] };
  const res = getMiddlewareMatchers(config.matcher, { i18n: null }).map((m) => new RegExp(m.regexp));
  const hits = (p: string) => res.some((r) => r.test(p));
  let valid = 0;
  for (const lang of SITE_LANGS) for (const w of WORDS) {
    valid++;
    assert.equal(hits(`/${lang}/word/${w.slug}`), false, `${lang}/${w.slug}`);
  }
  assert.equal(valid, SITE_LANGS.length * WORDS.length);
  const slug = WORDS[0].slug;
  for (const p of ["/ko/word/zzz-nope", `/xx/word/${slug}`, `/ko/word/${slug}/x`, `/ko/word/${slug}x`, `/kox/word/${slug}`]) assert.equal(hits(p), true, p);
});
