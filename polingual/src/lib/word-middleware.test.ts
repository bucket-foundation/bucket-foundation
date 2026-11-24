import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { knownWordPath, middleware } from "../middleware";
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
