import test from "node:test";
import assert from "node:assert/strict";
import { ATLAS_HOMES, ATLAS_MAX, atlasGhosts, atlasPoints, atlasRounds, distanceKm, nearestHome, publicPlayback, atlasPrompts, atlasRevealedBefore, nightAtlasKey, nightAtlasRounds } from "../src/lib/academy/voice-atlas";
import { visiblePrompts } from "../src/lib/academy/lobbies";

const langs = Object.keys(ATLAS_HOMES);
const items = Array.from({ length: 80 }, (_, n) => {
  const forms: Record<string, string> = { en: `en${n}` };
  for (const l of langs) forms[l] = `${l}${n}`;
  return { id: `w${n}`, kind: "word", category: "food", gloss: `en${n}`, forms };
}) as any[];

test("daily rounds use six distinct languages and are fixed per date", () => {
  const a = atlasRounds(items, "2026-11-13");
  assert.equal(a.length, 6);
  assert.equal(new Set(a.map((r) => r.lang)).size, 6);
  assert.deepEqual(atlasRounds(items, "2026-11-13"), a);
  assert.ok(a.every((r) => items.find((i) => i.id === r.itemId).forms[r.lang] === r.form));
});

test("distance and points", () => {
  assert.ok(Math.abs(distanceKm([48.9, 2.4], [51.5, -0.1]) - 340) < 20);
  assert.equal(nearestHome("pt", [-22.9, -43.2])?.home[0], -23.5);
  assert.equal(nearestHome("xx", [0, 0]), null);
  assert.equal(atlasPoints(0), ATLAS_MAX);
  assert.ok(atlasPoints(1000) < ATLAS_MAX && atlasPoints(1000) > atlasPoints(5000));
  assert.ok(atlasPoints(20000) < 50);
});

test("ghosts are fixed per day and sorted", () => {
  const g = atlasGhosts("2026-11-13");
  assert.deepEqual(atlasGhosts("2026-11-13"), g);
  assert.ok(g.every((x, i) => i === 0 || g[i - 1].score >= x.score));
});

test("every atlas clip carries a licence, and only public licences may play on a room TV", () => {
  for (const r of atlasRounds(items, "2026-11-27")) assert.equal(r.licence, "device-tts");
  for (const l of ["device-tts", "cc0", "cc-by", "cc-by-sa"] as const) assert.ok(publicPlayback(l));
  for (const l of ["personal", "unknown", "family-room"] as const) assert.ok(!publicPlayback(l));
  assert.ok(!publicPlayback(undefined));
});

test("lobby atlas prompts carry each clip's licence through to what the TV reads", () => {
  const rows = atlasPrompts(items, { id: "L", seed: "42", root: "en", rounds: 4 });
  assert.equal(rows.length, 4);
  for (const r of rows) {
    assert.equal(r.mode, "voice");
    assert.equal(r.licence, "device-tts");
    assert.ok(r.choices.includes(r.answer));
    assert.equal(r.answer, r.lang);
  }
  const shown = visiblePrompts(rows, 0, false)[0];
  assert.equal(shown.licence, "device-tts");
  assert.equal(shown.lang, rows[0].lang);
  assert.ok(publicPlayback(shown.licence));
  const bare = visiblePrompts([{ ...rows[0], licence: null }], 0, false)[0];
  assert.equal(bare.licence, undefined);
  assert.ok(!publicPlayback(bare.licence));
});

test("night atlas rounds are keyed to the lobby game and hide each language until its clip closes", () => {
  const key = nightAtlasKey({ id: "L", started_at: "2026-11-27T20:00:00.000Z" });
  assert.notEqual(key, nightAtlasKey({ id: "L", started_at: "2026-11-27T21:00:00.000Z" }));
  assert.doesNotMatch(key, /^\d{4}-\d{2}-\d{2}$/);
  const rounds = atlasRounds(items, key);
  assert.equal(atlasRevealedBefore(null), 0);
  assert.equal(atlasRevealedBefore({ kind: "voice-atlas", clip: 2 }), 2);
  assert.ok(atlasRevealedBefore({ kind: "family-teach" }) >= rounds.length);
  const phone = nightAtlasRounds(rounds, 2, false);
  assert.deepEqual(phone.map((r) => r.lang), [rounds[0].lang, rounds[1].lang, undefined, undefined, undefined, undefined]);
  assert.ok(phone.every((r, i) => r.form === rounds[i].form && r.clip === i));
  assert.ok(nightAtlasRounds(rounds, 0, true).every((r, i) => r.lang === rounds[i].lang));
});
