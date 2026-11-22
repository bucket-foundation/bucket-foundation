import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVideo, cuesFrom, indexEntry, mergeTranslations, parseJsonArray, toSeconds, validateVideo, VIDEO_LANGS } from "./video-lib.mjs";

const videos = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "videos");

test("timestamps convert to seconds", () => {
  assert.equal(toSeconds("00:01:02.500"), 62.5);
  assert.equal(toSeconds("01:00:00.000"), 3600);
  assert.throws(() => toSeconds("aa:bb"));
});

test("chunks become cues with translations merged", () => {
  const cues = cuesFrom([{ start: "00:00:01.000", end: "00:00:02.000", text: "Hola" }, { start: "00:00:03.000", end: "00:00:03.000", text: "x" }], "es");
  assert.equal(cues.length, 1);
  const merged = mergeTranslations(cues, "en", ["Hello"]);
  assert.deepEqual(merged[0].text, { es: "Hola", en: "Hello" });
  assert.throws(() => mergeTranslations(cues, "fr", []));
  const v = buildVideo({ meta: { id: "abc", title: "T", channel: "C", duration: 9.6 }, cues: merged, sourceLang: "es", langs: ["es", "en", "fr"] });
  assert.deepEqual(v.langs, ["es", "en"]);
  assert.equal(v.duration, 10);
  assert.deepEqual(validateVideo(v), []);
  assert.deepEqual(Object.keys(indexEntry(v, "/videos/abc.jpg")), ["id", "title", "channel", "duration", "langs", "thumb"]);
});

test("json arrays parse out of chatty replies", () => {
  assert.deepEqual(parseJsonArray('Sure:\n["a","b"]\n["c"]'), ["a", "b"]);
  assert.throws(() => parseJsonArray("none"));
});

test("seeded videos match the shared schema in every required language", () => {
  const index = JSON.parse(readFileSync(path.join(videos, "index.json"), "utf8"));
  assert.ok(index.length >= 3);
  for (const f of readdirSync(videos).filter((n) => n.endsWith(".json") && n !== "index.json")) {
    const v = JSON.parse(readFileSync(path.join(videos, f), "utf8"));
    assert.deepEqual(validateVideo(v), [], f);
    for (const l of VIDEO_LANGS) assert.ok(v.langs.includes(l), `${f} lacks ${l}`);
    assert.ok(index.some((e) => e.id === v.id), `${f} missing from index`);
  }
});
