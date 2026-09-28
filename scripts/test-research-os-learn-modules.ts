import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { atomLearningItems, contentHash, itemsToAtomFields } from "../src/lib/research-os/ingest/academy-items";
import { buildAcademyLearningItems, isAcademyCorpusFile } from "../src/lib/research-os/ingest/academy";
import { MODULE_KINDS, generateModule, generateModules, pathSteps, indexGraph, type CtxItem, type CtxNode, type ModuleContext } from "../src/lib/research-os/modules/generate";

const CORPUS = path.join(__dirname, "..", "learning", "app", "corpus");
const FIELDS = ["lesson", "depths", "quiz", "resources", "equation", "sources", "note"] as const;

function decks() {
  return fs
    .readdirSync(CORPUS)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ({ file: `learning/app/corpus/${f}`, json: JSON.parse(fs.readFileSync(path.join(CORPUS, f), "utf8")) as unknown }))
    .filter((d) => isAcademyCorpusFile(d.json));
}

function present(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

test("every science atom's content round-trips through learning items", () => {
  let atoms = 0;
  for (const d of decks()) {
    for (const atom of (d.json as { atoms: Record<string, unknown>[] }).atoms) {
      atoms++;
      const rebuilt = itemsToAtomFields(atomLearningItems(d.file, atom as { id: string }));
      for (const f of FIELDS) {
        if (present(atom[f])) assert.deepEqual(rebuilt[f], atom[f], `${d.file} ${String(atom.id)} ${f}`);
        else assert.equal(rebuilt[f], undefined, `${d.file} ${String(atom.id)} ${f} absent`);
      }
    }
  }
  assert.equal(atoms, 487);
});

test("item provenance names the source field and keys are unique per node", () => {
  const items = buildAcademyLearningItems(
    decks().map((d) => ({ sourceFile: d.file, branch: (d.json as { meta: { branch: string } }).meta.branch, atoms: (d.json as { atoms: { id: string; title: string }[] }).atoms })),
  );
  assert.equal(items.size, 487);
  for (const [slug, list] of Array.from(items.entries())) {
    const keys = list.map((i) => `${i.kind}:${i.ordinal}`);
    assert.equal(new Set(keys).size, keys.length, slug);
    for (const i of list) {
      assert.equal(i.provenance.type, "academy_atom");
      assert.equal(i.contentHash, contentHash(i.body));
    }
  }
});

test("content hashes ignore key order and change with content", () => {
  assert.equal(contentHash({ a: 1, b: [1, { c: 2, d: 3 }] }), contentHash({ b: [1, { d: 3, c: 2 }], a: 1 }));
  assert.notEqual(contentHash({ a: 1 }), contentHash({ a: 2 }));
});

const n = (id: string, tier: number, summary: string | null = `${id} summary text describing something particular`): CtxNode => ({ id, slug: `s-${id}`, title: `Title ${id}`, summary, tier });

function diamond(extra: Partial<ModuleContext> = {}): ModuleContext {
  const nodes = [n("a", 13, "Vectors carry magnitude and direction through space"), n("b", 14, "Kinematics describes motion without forces acting"), n("c", 14, "Calculus measures change through derivatives"), n("t", 15, "Newton's laws connect forces to accelerations of bodies"), n("x", 15), n("y", 14), n("z", 16), n("w", 13)];
  return {
    node: nodes[3],
    nodes,
    prerequisites: [
      { id: "e1", fromId: "a", toId: "b" },
      { id: "e2", fromId: "a", toId: "c" },
      { id: "e3", fromId: "b", toId: "t" },
      { id: "e4", fromId: "c", toId: "t" },
      { id: "e5", fromId: "t", toId: "z" },
    ],
    items: [],
    ...extra,
  };
}

const ITEMS: CtxItem[] = [
  { id: "i1", kind: "quiz", ordinal: 0, body: { level: "recall", prompt: "State the second law.", answer: "F = ma" } },
  { id: "i2", kind: "quiz", ordinal: 1, body: { level: "apply", prompt: "A 2 kg mass feels 4 N. Acceleration?", answer: "2 m/s^2" } },
  { id: "i3", kind: "lesson", ordinal: 0, body: { markdown: "### Intuition" } },
  { id: "i4", kind: "depth", ordinal: 0, body: { level: "eli5", text: "Things coast." } },
];

test("generation is deterministic", () => {
  assert.deepEqual(generateModules(diamond({ items: ITEMS })), generateModules(diamond({ items: ITEMS })));
});

test("every choice item has its answer among distinct choices and every item has provenance", () => {
  for (const ctx of [diamond(), diamond({ items: ITEMS })]) {
    for (const m of generateModules(ctx)) {
      for (const it of m.items) {
        assert.ok(it.provenance.length > 0, `${m.kind} ${it.id}`);
        if (it.choices) {
          assert.ok(it.choices.includes(it.answer), `${m.kind} ${it.prompt}`);
          assert.equal(new Set(it.choices).size, it.choices.length);
        }
      }
    }
  }
});

test("a node with no authored items still gets recall, drills and quiz facts", () => {
  const mods = Object.fromEntries(generateModules(diamond()).map((m) => [m.kind, m]));
  assert.ok(mods.recall.items.length >= 1);
  assert.ok(mods.drill.items.length >= 2);
  assert.ok(mods.quiz.items.length >= 2);
  assert.equal(mods.worked.items.length, 0);
});

test("authored quiz items feed recall, worked and quiz modules by level", () => {
  const mods = Object.fromEntries(generateModules(diamond({ items: ITEMS })).map((m) => [m.kind, m]));
  assert.deepEqual(mods.recall.items.map((i) => i.answer), ["F = ma"]);
  assert.deepEqual(mods.worked.items.map((i) => i.answer), ["2 m/s^2"]);
  assert.ok(mods.quiz.items.some((i) => i.answer === "F = ma"));
  assert.equal(mods.path.lesson?.markdown, "### Intuition");
  assert.deepEqual(mods.path.lesson?.depths, [{ level: "eli5", text: "Things coast." }]);
});

test("prerequisite drills pick a true parent and distractors off the path", () => {
  const ctx = diamond();
  const g = indexGraph(ctx);
  const drill = generateModule(ctx, "drill");
  const pre = drill.items.find((i) => i.prompt.startsWith("Which of these do you need before"));
  assert.ok(pre && pre.choices);
  assert.ok(["Title b", "Title c"].includes(pre.answer));
  for (const c of pre.choices.filter((c) => c !== pre.answer)) assert.ok(!["Title a", "Title b", "Title c"].includes(c), c);
  const order = drill.items.find((i) => i.prompt.startsWith("Which of these comes first"));
  assert.equal(order?.answer, "Title a");
  assert.ok(g.parents.get("t")!.length === 2);
});

test("true-false facts agree with the edges", () => {
  const quiz = generateModule(diamond(), "quiz");
  for (const it of quiz.items) {
    const m = it.lines[0].match(/^You need Title (\w) before Title t\.$/);
    assert.ok(m);
    assert.equal(it.answer, ["a", "b", "c"].includes(m[1]) ? "true" : "false");
  }
});

test("the path lists unmet ancestors foundation first", () => {
  const ctx = diamond();
  assert.deepEqual(pathSteps(indexGraph(ctx), "t").map((s) => s.id), ["a", "b", "c"]);
  assert.deepEqual(pathSteps(indexGraph(ctx), "t", new Set(["a"])).map((s) => s.id), ["b", "c"]);
});

test("nodes the viewer cannot read never appear, because generation only sees the filtered set", () => {
  const ctx = diamond();
  const hidden = { ...ctx, nodes: ctx.nodes.filter((x) => x.id !== "b"), prerequisites: ctx.prerequisites.filter((e) => e.fromId !== "b" && e.toId !== "b") };
  const text = JSON.stringify(generateModules(hidden));
  assert.ok(!text.includes("Title b"));
  assert.ok(!text.includes('"ref":"b"'));
});

test("distractors come from nodes of the same origin when there are enough", () => {
  const base = diamond();
  const atoms = base.nodes.map((x) => ({ ...x, origin: "academy_atom" }));
  const noise = ["p", "q", "r", "s", "u", "v", "k"].map((id) => ({ ...n(id, 15), title: `Claim ${id}`, origin: "canon_claim" }));
  const ctx: ModuleContext = { ...base, node: atoms[3], nodes: [...atoms, ...noise] };
  for (const m of generateModules(ctx)) for (const it of m.items) for (const c of it.choices ?? []) assert.ok(!c.startsWith("Claim "), c);
});

test("the module list covers every kind", () => {
  assert.deepEqual(generateModules(diamond()).map((m) => m.kind), Array.from(MODULE_KINDS));
});
