import test from "node:test";
import assert from "node:assert/strict";
import { DECK_MAX_CARDS, createDeckHandler, parseDeckCard, type DeckCard, type DeckDeps } from "../src/lib/polingual/deck";

function deps(over: Partial<DeckDeps> = {}) {
  const saved: [string, DeckCard][] = [];
  const d: DeckDeps = {
    configured: () => true,
    verifyUser: async () => "u1",
    rateHit: async () => true,
    count: async (uid) => saved.filter(([u]) => u === uid).length,
    save: async (uid, card) => {
      const dup = saved.some(([u, c]) => u === uid && c.deck === card.deck && c.lang === card.lang && c.surface === card.surface);
      if (!dup) saved.push([uid, card]);
      return { ok: true, duplicate: dup };
    },
    list: async (uid, deck) => saved.filter(([u, c]) => u === uid && (!deck || c.deck === deck)).map(([, c]) => c),
    ...over,
  };
  return { d, saved };
}

test("parseDeckCard normalizes fields and defaults the deck", () => {
  const r = parseDeckCard({ surface: "  agua \n", lang: "ES", meaning_en: "water", source_surface: "water", source_lang: "en" });
  assert.deepEqual(r, {
    ok: true,
    card: { surface: "agua", lang: "es", meaning_en: "water", ipa: null, source_surface: "water", source_lang: "en", deck: "default" },
  });
});

test("parseDeckCard rejects bad input", () => {
  assert.deepEqual(parseDeckCard(null), { ok: false, error: "missing_surface" });
  assert.deepEqual(parseDeckCard({ surface: "x", lang: "spanish" }), { ok: false, error: "bad_lang" });
  assert.deepEqual(parseDeckCard({ surface: "x", lang: "es", source_lang: "e1" }), { ok: false, error: "bad_source_lang" });
  assert.deepEqual(parseDeckCard({ surface: "x", lang: "es", deck: "../etc" }), { ok: false, error: "bad_deck" });
  const long = parseDeckCard({ surface: "a".repeat(500), lang: "es" });
  assert.equal(long.ok && long.card.surface.length, 120);
});

test("save returns 503 unconfigured and 401 without a user", async () => {
  assert.equal((await createDeckHandler(deps({ configured: () => false }).d).save({})).status, 503);
  assert.equal((await createDeckHandler(deps({ verifyUser: async () => null }).d).save({ surface: "a", lang: "es" })).status, 401);
});

test("save stores once, reports duplicates, and lists by deck", async () => {
  const { d, saved } = deps();
  const h = createDeckHandler(d);
  const first = await h.save({ surface: "agua", lang: "es" });
  assert.equal(first.status, 201);
  const again = await h.save({ surface: "agua", lang: "es" });
  assert.equal(again.status, 200);
  assert.equal(again.body.duplicate, true);
  await h.save({ surface: "eau", lang: "fr", deck: "travel" });
  assert.equal(saved.length, 2);
  const travel = await h.list("travel");
  assert.deepEqual((travel.body.cards as DeckCard[]).map((c) => c.surface), ["eau"]);
  assert.equal((await h.list(null)).body.cards instanceof Array, true);
  assert.equal((await h.list("bad/deck")).status, 400);
});

test("save maps rate limit, validation and store failure", async () => {
  assert.equal((await createDeckHandler(deps({ rateHit: async () => false }).d).save({ surface: "a", lang: "es" })).status, 429);
  assert.equal((await createDeckHandler(deps().d).save({ surface: "", lang: "es" })).status, 400);
  assert.equal((await createDeckHandler(deps({ save: async () => ({ ok: false }) }).d).save({ surface: "a", lang: "es" })).status, 500);
  assert.equal((await createDeckHandler(deps({ list: async () => null }).d).list(null)).status, 500);
});

test("save refuses a full deck and a failed count", async () => {
  assert.deepEqual((await createDeckHandler(deps({ count: async () => DECK_MAX_CARDS }).d).save({ surface: "a", lang: "es" })).body, { error: "deck_full", limit: DECK_MAX_CARDS });
  assert.equal((await createDeckHandler(deps({ count: async () => null }).d).save({ surface: "a", lang: "es" })).status, 500);
});
