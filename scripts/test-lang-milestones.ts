import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeState } from "../src/lib/academy/engine";
import { buildLangCorpus, cardId, createSystem } from "../src/lib/academy/lang-systems";
import { allMilestones, MILESTONES, milestoneProgress, shareLines, shareText } from "../src/lib/academy/lang-milestones";

const ROOT = path.join(__dirname, "..");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(ROOT, "learning/app/corpus", f), "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
const system = createSystem("en", ["es", "fr", "it"], [], 0);

function stateWith(ids: string[], langs = system.targets) {
  const s = normalizeState(null);
  for (const l of langs) for (const id of ids) s.cards[cardId(l, id)] = { due: 0, stability: 1, difficulty: 5, reps: 1, lapses: 0, state: 2, last: 0 } as never;
  return s;
}

test("every milestone item exists in the corpus", () => {
  for (const m of MILESTONES) for (const id of m.items) assert.ok(corpus.byId.get(id), `${m.id}: ${id}`);
});

test("nothing earned on a fresh state", () => {
  const all = allMilestones(system, corpus, normalizeState(null));
  assert.equal(all.length, MILESTONES.length);
  assert.ok(all.every((p) => !p.earned && p.learned === 0));
});

test("hello is earned once every language has its card", () => {
  const m = MILESTONES.find((x) => x.id === "hello")!;
  assert.equal(milestoneProgress(m, system, corpus, stateWith(["ph-hello"], ["es", "fr"])).earned, false);
  const p = milestoneProgress(m, system, corpus, stateWith(["ph-hello"]));
  assert.equal(p.earned, true);
  assert.deepEqual(p.langs.map((l) => l.words[0].form), ["hola", "bonjour", "ciao"]);
});

test("count to 100 needs one to ten and hundred", () => {
  const m = MILESTONES.find((x) => x.id === "count-100")!;
  const ten = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  assert.equal(milestoneProgress(m, system, corpus, stateWith(ten)).earned, false);
  const p = milestoneProgress(m, system, corpus, stateWith([...ten, "hundred"]));
  assert.equal(p.earned, true);
  assert.equal(p.total, 33);
});

test("languages without a form are left out of the card", () => {
  const sys = createSystem("en", ["es", "la"], [], 0);
  const p = milestoneProgress(MILESTONES.find((x) => x.id === "order-food")!, sys, corpus, normalizeState(null));
  assert.ok(p.langs.every((l) => l.words.every((w) => w.form)));
});

test("share lines and text name each language", () => {
  const p = milestoneProgress(MILESTONES.find((x) => x.id === "count-10")!, system, corpus, stateWith(["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]));
  const lines = shareLines(p);
  assert.equal(lines.length, 3);
  assert.match(lines[0].text, /^uno · dos/);
  assert.equal(shareText(p), "Count to 10: Spanish, French, Italian. Learned with Bucket.");
});
