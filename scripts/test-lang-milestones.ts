import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeState } from "../src/lib/academy/engine";
import { buildLangCorpus, cardId, createSystem } from "../src/lib/academy/lang-systems";
import { allMilestones, completed, MILESTONES, milestoneProgress, shareLines, shareText } from "../src/lib/academy/lang-milestones";
import { CARD_W, fitText, layoutCard, MIN_FONT, PAD, type Measure } from "../src/lib/academy/milestone-card";

const ROOT = path.join(__dirname, "..");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(ROOT, "learning/app/corpus", f), "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
const system = createSystem("en", ["es", "fr", "it"], [], 0);

function stateWith(ids: string[], langs = system.targets, card: Record<string, unknown> = { state: "review", reps: 1 }) {
  const s = normalizeState(null);
  for (const l of langs) for (const id of ids) s.cards[cardId(l, id)] = { due: 0, stability: 1, difficulty: 5, lapses: 0, ...card } as never;
  return s;
}

const mono: Measure = (text, font) => Array.from(text).length * Number(/(\d+)px/.exec(font)![1]) * 0.6;

test("every milestone item exists in the corpus", () => {
  for (const m of MILESTONES) for (const id of m.items) assert.ok(corpus.byId.get(id), `${m.id}: ${id}`);
});

test("nothing earned on a fresh state", () => {
  const all = allMilestones(system, corpus, normalizeState(null));
  assert.equal(all.length, MILESTONES.length);
  assert.ok(all.every((p) => !p.earned && p.learned === 0));
  assert.ok(all.every((p) => p.langs.length === system.targets.length));
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

test("only answered reviews count as completion", () => {
  assert.equal(completed(undefined), false);
  assert.equal(completed({ state: "new", reps: 0 } as never), false);
  assert.equal(completed({ state: "review", reps: 1, placed: true } as never), false);
  assert.equal(completed({ state: "review", reps: 1 } as never), true);
  const m = MILESTONES.find((x) => x.id === "hello")!;
  assert.equal(milestoneProgress(m, system, corpus, stateWith(["ph-hello"], system.targets, { state: "new", reps: 0 })).earned, false);
  assert.equal(milestoneProgress(m, system, corpus, stateWith(["ph-hello"], system.targets, { state: "review", reps: 1, placed: true })).earned, false);
});

test("a language missing a form is shown with what is missing", () => {
  const ids = ["ph-menu-please", "ph-i-would-like", "ph-water-please", "ph-the-check-please"];
  const gap = ["la", "grc", "sa", "ang"].find((l) => ids.some((id) => !corpus.byId.get(id)!.forms[l]));
  assert.ok(gap, "the corpus has a language without restaurant phrases");
  const sys = createSystem("en", ["es", gap!], [], 0);
  const p = milestoneProgress(MILESTONES.find((x) => x.id === "order-food")!, sys, corpus, stateWith(ids, ["es"]));
  const missing = p.langs.find((l) => l.lang === gap)!;
  assert.ok(missing.missing.length > 0);
  assert.equal(missing.done, false);
  assert.equal(p.earned, true);
  assert.deepEqual(shareLines(p).map((l) => l.code), ["es"]);
});

test("right-to-left lines align right on the card", () => {
  const sys = createSystem("en", ["es", "ar"], [], 0);
  const p = milestoneProgress(MILESTONES.find((x) => x.id === "hello")!, sys, corpus, stateWith(["ph-hello"], ["es", "ar"]));
  assert.equal(p.earned, true);
  const ops = layoutCard(p, mono);
  const ar = ops.find((o) => o.text === corpus.byId.get("ph-hello")!.forms.ar)!;
  assert.equal(ar.direction, "rtl");
  assert.equal(ar.align, "right");
  assert.equal(ar.x, CARD_W - PAD);
  const es = ops.find((o) => o.text === "hola")!;
  assert.equal(es.align, "left");
});

test("long lines shrink, then end in an ellipsis inside the card", () => {
  const max = CARD_W - PAD * 2;
  const long = "uno · dos · tres · cuatro · cinco · seis · siete · ocho · nueve · diez · cien".repeat(3);
  const fit = fitText(long, max, 64, 700, mono);
  assert.match(fit.font, new RegExp(`${MIN_FONT}px`));
  assert.ok(fit.text.endsWith("…"));
  assert.ok(mono(fit.text, fit.font) <= max);
  const short = fitText("hola", max, 64, 700, mono);
  assert.equal(short.text, "hola");
  assert.match(short.font, /64px/);
});

test("every text op on a full count-to-100 card fits the width", () => {
  const ids = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "hundred"];
  const p = milestoneProgress(MILESTONES.find((x) => x.id === "count-100")!, system, corpus, stateWith(ids));
  for (const op of layoutCard(p, mono)) assert.ok(mono(op.text, op.font) <= CARD_W - PAD * 2, op.text);
});

test("share lines and text name each language", () => {
  const p = milestoneProgress(MILESTONES.find((x) => x.id === "count-10")!, system, corpus, stateWith(["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]));
  const lines = shareLines(p);
  assert.equal(lines.length, 3);
  assert.match(lines[0].text, /^uno · dos/);
  assert.equal(shareText(p), "Count to 10: Spanish, French, Italian. Learned with Bucket.");
});
