import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeCorpus } from "./fixture";
import { voicePrompts } from "./voice";

test("voicePrompts repeats for the same day and offers the spoken language among the choices", () => {
  const a = voicePrompts(nativeCorpus(), "en", ["es", "fr", "de"], "2026-11-13");
  const b = voicePrompts(nativeCorpus(), "en", ["es", "fr", "de"], "2026-11-13");
  assert.ok(a.length > 0);
  assert.deepEqual(a, b);
  for (const p of a) {
    assert.equal(p.answer, p.word.lang);
    assert.ok(p.choices.includes(p.answer));
  }
});
