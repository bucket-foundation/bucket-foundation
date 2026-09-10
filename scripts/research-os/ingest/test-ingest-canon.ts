/**
 * Unit tests: the canon entry importer
 * (src/lib/research-os/ingest/canon.ts, task item 2). Fixtures cover both
 * kind branches (a law-folder dossier and a plain primary_source dossier),
 * both match paths (an exact slug match and a canon-atom-map.json
 * override), an unresolved map entry, and an entry with no match at all
 * (the review-list path). A second block runs the importer against the
 * REAL bucket-canon/02-physics/ dossiers and the real Academy corpus, and
 * asserts the exact 2-law/4-source split and 5-matched/1-unmatched split
 * this repo's current six dossiers and canon-atom-map.json produce (bkt-ros
 * ros-03 item 4 resolved three of the four review-list entries the
 * previous, canon-only-ingestion pass left unmatched).
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/test-ingest-canon.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  CANON_TOP_TIER,
  buildCanonCitesEdge,
  buildCanonEntryNode,
  buildCanonImport,
  buildCanonSourceNode,
  canonEntrySlug,
  canonSourceSlug,
  isLawFolder,
  matchAcademyAtom,
  type AcademyAtomRef,
  type CanonAtomMap,
  type CanonPaperLike,
} from "../../../src/lib/research-os/ingest/canon";
import { academyNodeSlug } from "../../../src/lib/research-os/ingest/academy";
import { loadPrimaryPapers, authorsShort } from "../../../src/lib/canon-primary";
import { loadAcademyCorpusFiles } from "./lib/load-academy-corpus";

function paper(overrides: Partial<CanonPaperLike> = {}): CanonPaperLike {
  return {
    id: "bkt-abc123",
    branch: "02-physics",
    concept: "special-relativity",
    title: "Zur Elektrodynamik bewegter Koerper",
    year: 1905,
    venueName: "Annalen der Physik",
    doi: "10.1002/andp.19053221004",
    canonicalUrl: "https://doi.org/10.1002/andp.19053221004",
    canonScore: 80,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isLawFolder / kind heuristic
// ---------------------------------------------------------------------------

test("isLawFolder: matches a dossier slug naming a theorem, principle, or law; not a bare field name", () => {
  assert.equal(isLawFolder("bell-theorem"), true);
  assert.equal(isLawFolder("gauge-principle"), true);
  assert.equal(isLawFolder("newtons-law-of-cooling"), true);
  assert.equal(isLawFolder("quantum-mechanics"), false);
  assert.equal(isLawFolder("special-relativity"), false);
  assert.equal(isLawFolder("standard-model"), false);
});

test("buildCanonEntryNode: a law-folder entry gets kind=law at CANON_TOP_TIER", () => {
  const p = paper({ concept: "bell-theorem", title: "On the Einstein Podolsky Rosen paradox" });
  const node = buildCanonEntryNode(p, "Bell");
  assert.equal(node.kind, "law");
  assert.equal(node.tier, CANON_TOP_TIER);
  assert.equal(node.slug, canonEntrySlug(p));
});

test("buildCanonEntryNode: a non-law-folder entry gets kind=primary_source, titled after the paper itself", () => {
  const p = paper({ concept: "special-relativity" });
  const node = buildCanonEntryNode(p, "Einstein");
  assert.equal(node.kind, "primary_source");
  assert.equal(node.title, p.title);
});

test("buildCanonSourceNode / buildCanonCitesEdge: only emitted for a law-folder entry, and never a self-loop", () => {
  const lawPaper = paper({ concept: "gauge-principle" });
  const sourceNode = buildCanonSourceNode(lawPaper, "Yang & Mills");
  assert.ok(sourceNode);
  assert.equal(sourceNode!.kind, "primary_source");
  const cites = buildCanonCitesEdge(lawPaper);
  assert.ok(cites);
  assert.equal(cites!.fromSlug, canonEntrySlug(lawPaper));
  assert.equal(cites!.toSlug, canonSourceSlug(lawPaper));
  assert.notEqual(cites!.fromSlug, cites!.toSlug, "a node never cites itself (graph.edges forbids a self-loop)");

  const sourcePaper = paper({ concept: "standard-model" });
  assert.equal(buildCanonSourceNode(sourcePaper, "Weinberg"), null);
  assert.equal(buildCanonCitesEdge(sourcePaper), null);
});

// ---------------------------------------------------------------------------
// matchAcademyAtom
// ---------------------------------------------------------------------------

const atomIndex: AcademyAtomRef[] = [
  { branch: "02-physics", sourceFile: "learning/app/corpus/02-physics.json", atomId: "special-relativity", title: "Special relativity" },
  { branch: "02-physics", sourceFile: "learning/app/corpus/02-physics.json", atomId: "standard-model", title: "The Standard Model" },
];

test("matchAcademyAtom: an exact slug match wins with no map entry needed", () => {
  const m = matchAcademyAtom("special-relativity", atomIndex, {});
  assert.notEqual(m, null);
  assert.notEqual(m, "unresolved_map_entry");
  const match = m as { ref: AcademyAtomRef; matchedBy: string };
  assert.equal(match.ref.atomId, "special-relativity");
  assert.equal(match.matchedBy, "slug");
});

test("matchAcademyAtom: no slug match and no map entry -> null (goes to the review list, never guessed)", () => {
  assert.equal(matchAcademyAtom("bell-theorem", atomIndex, {}), null);
});

test("matchAcademyAtom: an explicit override resolves even when no atom id matches the concept slug", () => {
  const overrideMap: CanonAtomMap = { "bell-theorem": { branch: "02-physics", atom_id: "special-relativity" } };
  const m = matchAcademyAtom("bell-theorem", atomIndex, overrideMap);
  const match = m as { ref: AcademyAtomRef; matchedBy: string };
  assert.equal(match.matchedBy, "map");
  assert.equal(match.ref.atomId, "special-relativity");
});

test("matchAcademyAtom: an override naming an atom that does not exist reports unresolved_map_entry instead of a silent miss", () => {
  const overrideMap: CanonAtomMap = { "bell-theorem": { branch: "02-physics", atom_id: "does-not-exist" } };
  assert.equal(matchAcademyAtom("bell-theorem", atomIndex, overrideMap), "unresolved_map_entry");
});

test("matchAcademyAtom: an override takes precedence even when a slug match also exists", () => {
  const overrideMap: CanonAtomMap = { "special-relativity": { branch: "02-physics", atom_id: "standard-model" } };
  const m = matchAcademyAtom("special-relativity", atomIndex, overrideMap);
  const match = m as { ref: AcademyAtomRef; matchedBy: string };
  assert.equal(match.matchedBy, "map");
  assert.equal(match.ref.atomId, "standard-model");
});

// ---------------------------------------------------------------------------
// buildCanonImport: end to end on a small fixture
// ---------------------------------------------------------------------------

test("buildCanonImport: matched entry gets a derives_from edge, unmatched entry lands on the review list", () => {
  const papers = [paper({ id: "bkt-1", concept: "special-relativity" }), paper({ id: "bkt-2", concept: "bell-theorem", title: "Bell 1964" })];
  const result = buildCanonImport({
    papers,
    authorsLabelByPaperId: new Map([
      ["bkt-1", "Einstein"],
      ["bkt-2", "Bell"],
    ]),
    atomIndex,
    overrideMap: {},
  });
  const derivesFrom = result.edges.filter((e) => e.kind === "derives_from");
  assert.equal(derivesFrom.length, 1);
  assert.equal(derivesFrom[0].fromSlug, canonEntrySlug(papers[0]));
  assert.equal(derivesFrom[0].toSlug, academyNodeSlug(atomIndex[0].sourceFile, atomIndex[0].atomId));

  const unmatched = result.reviewList.filter((r) => r.kind === "unmatched_derives_from");
  assert.equal(unmatched.length, 1);
  assert.equal(unmatched[0].detail.concept, "bell-theorem");
});

test("buildCanonImport: is idempotent on repeat input (pure function determinism)", () => {
  const papers = [paper({ id: "bkt-1", concept: "special-relativity" })];
  const input = { papers, authorsLabelByPaperId: new Map([["bkt-1", "Einstein"]]), atomIndex, overrideMap: {} };
  assert.deepEqual(buildCanonImport(input), buildCanonImport(input));
});

// ---------------------------------------------------------------------------
// Against the real bucket-canon/02-physics/ dossiers and the real corpus
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

test("buildCanonImport: the real bucket-canon/02-physics/ dossiers produce exactly the 2-law/4-source, 5-matched/1-unmatched split", () => {
  const allPapers = loadPrimaryPapers();
  const papers = allPapers.filter((p) => p.branch === "02-physics").map((p) => ({ ...p }));
  assert.equal(papers.length, 6, "one entry per dossier folder today: bell-theorem, gauge-principle, quantum-field-theory, quantum-mechanics, special-relativity, standard-model");

  const authorsLabelByPaperId = new Map(papers.map((p) => [p.id, authorsShort(p)]));
  const files = loadAcademyCorpusFiles(REPO_ROOT);
  const fullAtomIndex: AcademyAtomRef[] = files.flatMap((f) => f.atoms.map((a) => ({ branch: f.branch, sourceFile: f.sourceFile, atomId: a.id, title: a.title })));
  const rawOverrideMap: Record<string, unknown> = JSON.parse(readFileSync(join(__dirname, "canon-atom-map.json"), "utf8"));
  const overrideMap: CanonAtomMap = {};
  for (const [key, value] of Object.entries(rawOverrideMap)) {
    if (key.startsWith("_")) continue; // every "_comment"-style annotation key, matching canon-import.ts's own loadOverrideMap
    overrideMap[key] = value as CanonAtomMap[string];
  }

  const result = buildCanonImport({ papers, authorsLabelByPaperId, atomIndex: fullAtomIndex, overrideMap });

  const lawNodes = result.nodes.filter((n) => n.kind === "law");
  const sourceNodes = result.nodes.filter((n) => n.provenance.type === "primary_source");
  assert.equal(lawNodes.length, 2, "bell-theorem, gauge-principle");
  assert.equal(sourceNodes.length, 2, "one bibliographic source node per law entry");
  assert.equal(result.nodes.length, 8, "6 entry nodes + 2 source nodes");

  // bkt-ros ros-03 item 4 resolved three of the four review-list entries
  // this test originally found unmatched (bell-theorem, quantum-field-
  // theory, quantum-mechanics), adding explicit canon-atom-map.json rows;
  // gauge-principle stays unmatched (no Academy atom covers gauge
  // invariance or Yang-Mills theory).
  const derivesFrom = result.edges.filter((e) => e.kind === "derives_from");
  assert.equal(
    derivesFrom.length,
    5,
    "special-relativity and standard-model match an Academy atom id exactly; bell-theorem, quantum-field-theory, and quantum-mechanics match via canon-atom-map.json",
  );
  assert.equal(
    result.reviewList.filter((r) => r.kind === "unmatched_derives_from").length,
    1,
    "gauge-principle has no matching Academy atom id and no map override",
  );
});
