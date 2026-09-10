/**
 * Unit tests: the Academy corpus importer
 * (src/lib/research-os/ingest/academy.ts, task item 1). A small fixture
 * corpus exercises the depth/tier heuristic, the kind heuristic, a
 * `requires` cycle, and an unresolved `requires` reference; a second block
 * runs the importer against the REAL 487-atom corpus on disk to confirm
 * the shipped data produces zero tier violations and zero orphan edges
 * (task item 3's stability requirement, against real data rather than
 * only a fixture).
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/test-ingest-academy.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  ACADEMY_TIER_BASE,
  academyNodeSlug,
  buildAcademyFileImport,
  buildAcademyImport,
  computeRequiresDepth,
  isAcademyCorpusFile,
  mapAtomKind,
  type AcademyAtom,
  type AcademyCorpusFile,
} from "../../../src/lib/research-os/ingest/academy";
import { checkOrphanEdges, checkTierMonotonicity } from "../../../src/lib/research-os/ingest/validate";
import { loadAcademyCorpusFiles } from "./lib/load-academy-corpus";

// ---------------------------------------------------------------------------
// academyNodeSlug / mapAtomKind
// ---------------------------------------------------------------------------

test("academyNodeSlug: deterministic on (sourceFile, atomId)", () => {
  const a = academyNodeSlug("learning/app/corpus/02-physics.json", "kinematics");
  const b = academyNodeSlug("learning/app/corpus/02-physics.json", "kinematics");
  assert.equal(a, b);
  assert.equal(a, "academy-02-physics-kinematics");
});

test("academyNodeSlug: the same atom id in a different source file is a different slug (idempotency key includes source)", () => {
  const a = academyNodeSlug("learning/app/corpus/01-mathematics.json", "godel-incompleteness");
  const b = academyNodeSlug("learning/app/corpus/04-information.json", "godel-incompleteness");
  assert.notEqual(a, b);
});

test("mapAtomKind: 'law' and 'theorem' map to law, everything else (including missing) maps to concept", () => {
  assert.equal(mapAtomKind("law"), "law");
  assert.equal(mapAtomKind("theorem"), "law");
  assert.equal(mapAtomKind("concept"), "concept");
  assert.equal(mapAtomKind("equation"), "concept");
  assert.equal(mapAtomKind("result"), "concept");
  assert.equal(mapAtomKind("method"), "concept");
  assert.equal(mapAtomKind("definition"), "concept");
  assert.equal(mapAtomKind(undefined), "concept");
  assert.equal(mapAtomKind(null), "concept");
});

// ---------------------------------------------------------------------------
// isAcademyCorpusFile
// ---------------------------------------------------------------------------

test("isAcademyCorpusFile: accepts a branch file, rejects the language/manifest shapes", () => {
  assert.equal(isAcademyCorpusFile({ meta: { branch: "02-physics" }, atoms: [{ id: "a", title: "A" }] }), true);
  assert.equal(isAcademyCorpusFile({ meta: { branch: "lang-core" }, atoms: [{ id: "eight", gloss: "eight (8)" }] }), false, "no title field");
  assert.equal(isAcademyCorpusFile({ meta: { branch: "lang-cognates" }, concepts: [] }), false, "no atoms array");
  assert.equal(isAcademyCorpusFile({ decks: [] }), false, "index.json manifest shape");
  assert.equal(isAcademyCorpusFile({ meta: {}, atoms: [] }), false, "empty atoms array");
  assert.equal(isAcademyCorpusFile(null), false);
});

// ---------------------------------------------------------------------------
// computeRequiresDepth / tier heuristic
// ---------------------------------------------------------------------------

function fixtureFile(atoms: AcademyAtom[], sourceFile = "learning/app/corpus/fixture.json", branch = "02-physics"): AcademyCorpusFile {
  return { sourceFile, branch, atoms };
}

test("computeRequiresDepth: a root atom (no requires) is depth 0", () => {
  const { depth } = computeRequiresDepth([{ id: "a", title: "A", requires: [] }]);
  assert.equal(depth.get("a"), 0);
});

test("computeRequiresDepth: depth is 1 + max(prerequisite depth), a straight chain increments by one", () => {
  const atoms: AcademyAtom[] = [
    { id: "a", title: "A", requires: [] },
    { id: "b", title: "B", requires: ["a"] },
    { id: "c", title: "C", requires: ["b"] },
  ];
  const { depth, cyclic, unresolved } = computeRequiresDepth(atoms);
  assert.deepEqual([depth.get("a"), depth.get("b"), depth.get("c")], [0, 1, 2]);
  assert.deepEqual(cyclic, []);
  assert.deepEqual(unresolved, []);
});

test("computeRequiresDepth: a diamond takes the LONGER of its two paths (the max over both arms)", () => {
  const atoms: AcademyAtom[] = [
    { id: "a", title: "A", requires: [] },
    { id: "b", title: "B", requires: ["a"] },
    { id: "c", title: "C", requires: ["a", "b"] }, // depends on both a (depth 0) and b (depth 1)
  ];
  const { depth } = computeRequiresDepth(atoms);
  assert.equal(depth.get("c"), 2, "expected 1 + max(depth(a)=0, depth(b)=1) = 2, taking the longer arm through b");
});

test("computeRequiresDepth: a cycle is detected and its members excluded from depth, never thrown", () => {
  const atoms: AcademyAtom[] = [
    { id: "a", title: "A", requires: ["b"] },
    { id: "b", title: "B", requires: ["a"] },
  ];
  const { depth, cyclic } = computeRequiresDepth(atoms);
  assert.deepEqual(new Set(cyclic), new Set(["a", "b"]));
  assert.equal(depth.has("a"), false);
  assert.equal(depth.has("b"), false);
});

test("computeRequiresDepth: a requires id absent from the file is reported instead of thrown, and excluded from the depth calc", () => {
  const atoms: AcademyAtom[] = [{ id: "a", title: "A", requires: ["ghost"] }];
  const { depth, unresolved } = computeRequiresDepth(atoms);
  assert.deepEqual(unresolved, [["a", "ghost"]]);
  assert.equal(depth.get("a"), 0, "the unresolvable requires contributes nothing, so a reads as a root");
});

// ---------------------------------------------------------------------------
// buildAcademyFileImport: tier assignment, edge direction, review items
// ---------------------------------------------------------------------------

test("buildAcademyFileImport: tier = ACADEMY_TIER_BASE + depth, monotonic by construction", () => {
  const file = fixtureFile([
    { id: "a", title: "A", type: "concept", requires: [] },
    { id: "b", title: "B", type: "concept", requires: ["a"] },
    { id: "c", title: "C", type: "law", requires: ["b"] },
  ]);
  const result = buildAcademyFileImport(file);
  const bySlug = new Map(result.nodes.map((n) => [n.slug, n]));
  assert.equal(bySlug.get(academyNodeSlug(file.sourceFile, "a"))!.tier, ACADEMY_TIER_BASE + 0);
  assert.equal(bySlug.get(academyNodeSlug(file.sourceFile, "b"))!.tier, ACADEMY_TIER_BASE + 1);
  assert.equal(bySlug.get(academyNodeSlug(file.sourceFile, "c"))!.tier, ACADEMY_TIER_BASE + 2);
  assert.equal(bySlug.get(academyNodeSlug(file.sourceFile, "c"))!.kind, "law");
  assert.deepEqual(checkTierMonotonicity(result.nodes, result.edges), []);
});

test("buildAcademyFileImport: a prerequisite edge runs prerequisite (easier/source) -> dependent (harder/target)", () => {
  const file = fixtureFile([
    { id: "a", title: "A", requires: [] },
    { id: "b", title: "B", requires: ["a"] },
  ]);
  const result = buildAcademyFileImport(file);
  assert.equal(result.edges.length, 1);
  assert.equal(result.edges[0].fromSlug, academyNodeSlug(file.sourceFile, "a"));
  assert.equal(result.edges[0].toSlug, academyNodeSlug(file.sourceFile, "b"));
  assert.equal(result.edges[0].kind, "prerequisite");
});

test("buildAcademyFileImport: labels carry the atom's own title; provenance carries source file and atom id", () => {
  const file = fixtureFile([{ id: "a", title: "Kinematics", type: "concept", summary: "motion", requires: [] }]);
  const node = buildAcademyFileImport(file).nodes[0];
  assert.deepEqual(node.labels, { en: { title: "Kinematics" } });
  assert.equal(node.provenance.type, "academy_atom");
  assert.equal(node.provenance.source, file.sourceFile);
  assert.equal(node.provenance.atom_id, "a");
});

test("buildAcademyFileImport: a cycle produces a prerequisite_cycle review item and no orphan/monotonicity fallout", () => {
  const file = fixtureFile([
    { id: "a", title: "A", requires: ["b"] },
    { id: "b", title: "B", requires: ["a"] },
  ]);
  const result = buildAcademyFileImport(file);
  assert.equal(result.reviewList.filter((r) => r.kind === "prerequisite_cycle").length, 2);
  assert.deepEqual(checkOrphanEdges(result.nodes, result.edges), []);
});

test("buildAcademyFileImport: an unresolved requires id produces an unresolved_requires review item and writes no edge for it", () => {
  const file = fixtureFile([{ id: "a", title: "A", requires: ["ghost"] }]);
  const result = buildAcademyFileImport(file);
  assert.equal(result.edges.length, 0);
  assert.equal(result.reviewList.length, 1);
  assert.equal(result.reviewList[0].kind, "unresolved_requires");
});

// ---------------------------------------------------------------------------
// Stable / idempotent: same fixture in, byte-identical result out
// ---------------------------------------------------------------------------

test("buildAcademyImport: identical input produces identical output on a second run (pure function determinism)", () => {
  const files = [
    fixtureFile(
      [
        { id: "a", title: "A", type: "concept", requires: [] },
        { id: "b", title: "B", type: "law", requires: ["a"] },
      ],
      "learning/app/corpus/fixture-1.json",
    ),
  ];
  const first = buildAcademyImport(files);
  const second = buildAcademyImport(files);
  assert.deepEqual(first, second);
});

// ---------------------------------------------------------------------------
// Against the real, shipped 487-atom corpus
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

test("buildAcademyImport: the real corpus loads exactly the 487-atom population the review names", () => {
  const files = loadAcademyCorpusFiles(REPO_ROOT);
  const totalAtoms = files.reduce((sum, f) => sum + f.atoms.length, 0);
  assert.equal(
    totalAtoms,
    487,
    "RESEARCH-OS-K12-SYSTEM-REVIEW.md section 2 names '487 atoms'; the language-learning corpora and index.json must stay excluded",
  );
});

test("buildAcademyImport: zero tier violations and zero orphan edges against the real corpus", () => {
  const files = loadAcademyCorpusFiles(REPO_ROOT);
  const result = buildAcademyImport(files);
  assert.deepEqual(checkOrphanEdges(result.nodes, result.edges), []);
  assert.deepEqual(checkTierMonotonicity(result.nodes, result.edges), []);
});

test("buildAcademyImport: every node slug is unique across the real corpus (the idempotency key never collides)", () => {
  const files = loadAcademyCorpusFiles(REPO_ROOT);
  const result = buildAcademyImport(files);
  const slugs = result.nodes.map((n) => n.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("sanity: the fixture corpus file on disk still matches (guards silent drift of the source JSON)", () => {
  const raw = JSON.parse(readFileSync(join(REPO_ROOT, "learning", "app", "corpus", "02-physics.json"), "utf8"));
  assert.equal(isAcademyCorpusFile(raw), true);
});
