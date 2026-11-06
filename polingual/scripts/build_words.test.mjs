import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { CORPUS_DIR, OUT_FILE, buildWords, cleanNote, rootClusters } from "./build_words.mjs";

test("notes lose dashes and internal tier notes", () => {
  assert.equal(cleanNote("From Latin 'terra' — root of 'terrain'. A canon-tier word tying to physics."), "From Latin 'terra', root of 'terrain'.");
  assert.equal(cleanNote(""), undefined);
});

test("root clusters skip suffixes and repeated language sets", () => {
  const c = { clusters: [{ root: "*wódr̥", langs: ["en", "ru"] }, { root: "*wed-", langs: ["ru", "en"] }, { root: "*-r̥", langs: ["en", "pl"] }, { root: "*x", langs: ["en"] }] };
  assert.deepEqual(rootClusters(c), [{ root: "*wódr̥", langs: ["en", "ru"] }]);
});

test("words.json matches the corpus", { skip: !existsSync(CORPUS_DIR) && "apple/Shared/Corpus not checked out" }, () => {
  assert.deepEqual(JSON.parse(readFileSync(OUT_FILE, "utf8")), buildWords());
});
