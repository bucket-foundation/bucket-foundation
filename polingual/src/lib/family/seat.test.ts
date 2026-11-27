import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildLangCorpus, LANG_CODES } from "@academy/lang-systems";
import { buildPrompts } from "@academy/lobbies";
import { answerLangFor, seatPrompt } from "@academy/seat-prompts";
import type { FairCard } from "@academy/fair-score";

const dir = path.join(__dirname, "../../../../learning/app/corpus");
const read = (n: string) => JSON.parse(readFileSync(path.join(dir, n), "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
const byId = (id: string) => corpus.byId.get(id);
const rows = buildPrompts(corpus.items, { id: "l", seed: "777", root: "en", targets: ["es"], rounds: 6, game: "daily", playlist: null }, LANG_CODES);
const row = rows[0];
const item = byId(row.item_id)!;

const abuela: FairCard = { band: "adult", speaks: [{ lang: "es", level: 4 }, { lang: "en", level: 1 }], learn: ["fr"] };
const kid: FairCard = { band: "teen", speaks: [{ lang: "en", level: 3 }], learn: ["es"] };
const cousin: FairCard = { band: "adult", speaks: [{ lang: "de", level: 4 }], learn: ["es"] };

test("same word, different side: fluent speakers answer in their learn language", () => {
  assert.equal(answerLangFor(abuela, "es", "en", item), "fr");
  const p = seatPrompt(row, corpus.items, byId, abuela, "en", "s|abuela");
  assert.equal(p.mode, "meaning");
  assert.equal(p.gloss, item.forms.es);
  assert.equal(p.answer, item.forms.fr);
  assert.ok(p.choices.includes(p.answer) && p.choices.length >= 2);
  assert.equal(p.round, row.round);
  assert.equal(p.item_id, row.item_id);
});

test("learners answer in the language they know", () => {
  assert.deepEqual(seatPrompt(row, corpus.items, byId, kid, "en", "s|kid"), row);
  const p = seatPrompt(row, corpus.items, byId, cousin, "en", "s|cousin");
  assert.equal(p.answer, item.forms.de);
  assert.equal(p.gloss, item.forms.es);
});

test("seats without a card and the TV see the shared prompt, and each seat is stable", () => {
  assert.deepEqual(seatPrompt(row, corpus.items, byId, null, "en", "s|tv"), row);
  assert.deepEqual(seatPrompt(row, corpus.items, byId, abuela, "en", "s|abuela"), seatPrompt(row, corpus.items, byId, abuela, "en", "s|abuela"));
});
