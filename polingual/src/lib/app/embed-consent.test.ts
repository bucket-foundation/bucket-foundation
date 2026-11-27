import { test } from "node:test";
import assert from "node:assert/strict";
import { EMBED_CONSENT_KEY, onAnswer, onPoster, rememberConsent, storedConsent, type ConsentStore } from "./embed-consent";

function memory(): ConsentStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

test("the first tap on the poster asks before any YouTube request", () => {
  assert.equal(onPoster(storedConsent(memory())), "asking");
  assert.equal(onAnswer(false), "declined");
  assert.equal(onAnswer(true), "playing");
});

test("an allow is remembered and later taps play at once", () => {
  const s = memory();
  rememberConsent(s);
  assert.equal(s.data[EMBED_CONSENT_KEY], "allow");
  assert.equal(onPoster(storedConsent(s)), "playing");
});

test("a store that throws or holds another value counts as no consent", () => {
  const broken: ConsentStore = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(storedConsent(broken), false);
  assert.doesNotThrow(() => rememberConsent(broken));
  assert.equal(storedConsent(null), false);
  const other = memory();
  other.setItem(EMBED_CONSENT_KEY, "personalized");
  assert.equal(storedConsent(other), false);
});
