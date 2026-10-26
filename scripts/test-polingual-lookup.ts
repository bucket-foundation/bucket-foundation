import test from "node:test";
import assert from "node:assert/strict";
import { handleLookup, type LookupDeps } from "../src/lib/polingual/lookup";
import type { DeckCard } from "../src/lib/polingual/deck";

function deps(user: string | null, over: Partial<LookupDeps> = {}) {
  const deck = new Map<string, DeckCard>();
  const calls: string[] = [];
  const d: LookupDeps = {
    fetchJson: async (path) => {
      calls.push(path);
      if (path === "/translate/many") return { found: true, word: "water", meaning_en: "water", ipa: "/ˈwɔːtər/", translations: [{ lang: "es", results: [{ surface: "agua" }] }] };
      if (path === "/semantic") return { results: [{ surface: "agua", lang: "es", meaning_en: "water", ipa: "/ˈaɣwa/", score: 0.98 }] };
      return { results: [{ surface: "waiter", lang: "en", meaning_en: "server", ipa: "/ˈweɪtər/", similarity: 0.7 }, { lang: "en" }] };
    },
    userId: async () => user,
    addCard: async (uid, card) => {
      const key = `${uid}|${card.deck}|${card.lang}|${card.surface}`;
      const duplicate = deck.has(key);
      deck.set(key, card);
      return { ok: true, duplicate };
    },
    ...over,
  };
  return { d, deck, calls };
}

const Q = { surface: "water", from: "en", to: null, deck: null };

test("lookup returns similar words by meaning and by phonetics", async () => {
  const { d, calls } = deps(null);
  const r = await handleLookup(d, Q);
  assert.equal(r.status, 200);
  const sim = r.body.similar as { meaning: { surface: string; score: number }[]; phonetic: { surface: string; score: number }[] };
  assert.deepEqual(sim.meaning.map((w) => [w.surface, w.score]), [["agua", 0.98]]);
  assert.deepEqual(sim.phonetic.map((w) => [w.surface, w.score]), [["waiter", 0.7]]);
  assert.deepEqual(calls.sort(), ["/phonetic", "/semantic", "/translate/many"]);
});

test("a signed-out lookup never touches the deck", async () => {
  let added = 0;
  const { d } = deps(null, { addCard: async () => (added++, { ok: true }) });
  const r = await handleLookup(d, Q);
  assert.deepEqual(r.body.deck, { saved: false, reason: "signed_out" });
  assert.equal(added, 0);
});

test("a signed-in lookup adds the word once and stays idempotent", async () => {
  const { d, deck } = deps("u1");
  const first = await handleLookup(d, Q);
  assert.deepEqual(first.body.deck, { saved: true, already_in_deck: false, deck: "default" });
  const again = await handleLookup(d, Q);
  assert.deepEqual(again.body.deck, { saved: false, already_in_deck: true, deck: "default" });
  assert.equal(deck.size, 1);
  assert.equal(Array.from(deck.values())[0].ipa, "/ˈwɔːtər/");
});

test("missing word, missing surface, upstream down and save failure", async () => {
  let added = 0;
  const nf = deps("u1", { fetchJson: async () => ({ found: false }), addCard: async () => (added++, { ok: true }) });
  const r = await handleLookup(nf.d, Q);
  assert.equal(r.status, 404);
  assert.equal(added, 0);
  assert.equal((await handleLookup(deps("u1").d, { ...Q, surface: " " })).status, 400);
  assert.equal((await handleLookup(deps("u1", { fetchJson: async () => null }).d, Q)).status, 503);
  const bad = await handleLookup(deps("u1", { addCard: async () => ({ ok: false }) }).d, Q);
  assert.deepEqual(bad.body.deck, { saved: false, reason: "save_failed" });
  const noSim = deps(null);
  const orig = noSim.d.fetchJson;
  noSim.d.fetchJson = async (p, q) => (p === "/translate/many" ? orig(p, q) : null);
  assert.deepEqual((await handleLookup(noSim.d, Q)).body.similar, { meaning: [], phonetic: [] });
});
