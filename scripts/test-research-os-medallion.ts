import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileSourceId, parseSourceId } from "../src/lib/research-os/evidence/identity";
import { parsePolicy } from "../src/lib/research-os/evidence/rights";
import { byteLength, sha256Hex } from "../src/lib/research-os/evidence/text";
import { admissionRow, bronzeRecord, directoryManifest, rightsForTypes, runRevision, UNKNOWN_RIGHTS } from "../src/lib/research-os/medallion/bronze";
import { lineageFor, type LineageNode } from "../src/lib/research-os/medallion/lineage";
import { checkRepoPath, isTranscriptPath } from "../src/lib/research-os/medallion/paths";
import { planMedallion, silverKey, type MedallionIO, type PlanNode } from "../src/lib/research-os/medallion/plan";
import { edgeCandidates, edgeKey, edgeProposalRow, factorAndDependent, FACTOR_KINDS, nodeProposalRow, queueable, splitImport } from "../src/lib/research-os/medallion/proposals";
import type { IngestEdgeDraft, IngestNodeDraft } from "../src/lib/research-os/ingest/types";
import { shadowRequested } from "./research-os/ingest/lib/medallion-shadow";
import { demotionRows } from "../src/lib/research-os/medallion/demotions";
import { checkPromotion, type GoldTarget } from "../src/lib/research-os/medallion/promote";
import { publicCitation, publicSilver } from "../src/lib/research-os/medallion/redact";
import { summarizeBackfill } from "../src/lib/research-os/medallion/report";
import { band, combineConfidence, locateSpan, silverItem, verifySilver } from "../src/lib/research-os/medallion/silver";
import { decompose } from "../src/lib/research-os/primes";

const ROOT = path.join(__dirname, "..");
const POLICY = parsePolicy(JSON.parse(readFileSync(path.join(ROOT, "learning", "research-os", "ai", "rights-policy.json"), "utf8")));
const SEEDS = new Map([["supabase/seed/research-os-sky-blue.json", new Set(["air-is-made-of-tiny-particles"])]]);
const ALLOWED = { rule: "academy-atom", revision: 1, allowIndex: true, permission: "project-authored" };
const REFUSED = { rule: "source-excerpt", revision: 1, allowIndex: false, permission: "none" };
const HASH = "a".repeat(64);

function withReviewers<T>(emails: string, run: () => T): T {
  const prior = process.env.RESEARCH_OS_REVIEWER_EMAILS;
  process.env.RESEARCH_OS_REVIEWER_EMAILS = emails;
  try {
    return run();
  } finally {
    if (prior === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    else process.env.RESEARCH_OS_REVIEWER_EMAILS = prior;
  }
}

test("a file source id names bytes and parses back", () => {
  const id = fileSourceId(HASH.toUpperCase());
  assert.equal(id, `file:${HASH}`);
  assert.deepEqual(parseSourceId(id), { kind: "file", id, sha256: HASH });
  for (const bad of ["file:", "file:abc", `file:${HASH}0`, "file:bucket-canon/x.md", `file:/srv/abs/${HASH}`]) assert.equal(parseSourceId(bad), null, bad);
  assert.throws(() => fileSourceId("not-a-hash"));
});

test("repo paths are relative and inside the allowed roots", () => {
  for (const good of ["_intake/concept-digests/a.md", "bucket-canon/02-physics/sub-claims/x/", "learning/app/corpus/02-physics.json", "supabase/seed/research-os-sky-blue.json", "canon-figures/figures.json", "src/data/canon-sites.json"]) {
    assert.deepEqual(checkRepoPath(good), { ok: true, path: good }, good);
  }
  const cases: [string, string][] = [
    ["", "empty"],
    ["/srv/abs/agfarms/bucket-foundation/_intake/a.md", "absolute"],
    ["~/agfarms/_intake/a.md", "home"],
    ["_intake/../.env.local", "dot_segment"],
    ["_intake/./a.md", "dot_segment"],
    ["..", "dot_segment"],
    ["_intake//a.md", "double_slash"],
    ["_intake\\a.md", "backslash"],
    ["_intake/a\u0000.md", "control"],
    [".env.local", "outside_roots"],
    ["src/app/page.tsx", "outside_roots"],
    ["_intake/" + "a".repeat(600), "too_long"],
  ];
  for (const [p, error] of cases) assert.deepEqual(checkRepoPath(p), { ok: false, error }, p);
});

test("transcript paths are the sub-claims cards, bridge clusters and video transcripts", () => {
  assert.equal(isTranscriptPath("bucket-canon/05-biophysics/sub-claims/emf/001-x.md"), true);
  assert.equal(isTranscriptPath("_intake/embeddings-v2/clusters.json"), true);
  assert.equal(isTranscriptPath("_intake/yt/abc-slug/transcript.txt"), true);
  assert.equal(isTranscriptPath("bucket-canon/02-physics/bell-theorem/primary-papers.yaml"), false);
  assert.equal(isTranscriptPath("learning/app/corpus/02-physics.json"), false);
});

test("bronze ids depend on bytes alone, and a rerun converges", () => {
  const bytes = Buffer.from("line one\r\nline two\n", "utf8");
  const a = bronzeRecord("_intake/a.md", bytes, ALLOWED);
  const b = bronzeRecord("_intake/a.md", Buffer.from(bytes), ALLOWED);
  assert.deepEqual(a, b);
  assert.equal(a.sourceId, `file:${sha256Hex(bytes)}`);
  assert.notEqual(a.bodyHash, a.originalHash);
  assert.equal(a.text, "line one\nline two\n");
  const moved = bronzeRecord("_intake/b.md", bytes, ALLOWED);
  assert.equal(moved.sourceId, a.sourceId);
  assert.equal(moved.sourceRevision, a.sourceRevision);
  const changed = bronzeRecord("_intake/a.md", Buffer.from("line one\n"), ALLOWED);
  assert.notEqual(changed.sourceId, a.sourceId);
  assert.equal(runRevision([a, changed]), runRevision([changed, a]));
  assert.throws(() => bronzeRecord("/srv/abs/_intake/a.md", bytes, ALLOWED), /absolute/);
  assert.throws(() => bronzeRecord("_intake/../x", bytes, ALLOWED), /dot_segment/);
});

test("the admission row never carries the path in its public id", () => {
  const b = bronzeRecord("bucket-canon/05-biophysics/sub-claims/emf/001-kruse.md", Buffer.from("claim"), REFUSED);
  const row = admissionRow(b);
  assert.match(row.source_id, /^file:[0-9a-f]{64}$/);
  assert.equal(row.repo_path, "bucket-canon/05-biophysics/sub-claims/emf/001-kruse.md");
  assert.equal(row.allow_index, false);
  assert.ok(!row.source_id.includes("kruse") && !row.source_revision.includes("kruse"));
  assert.equal(row.extraction_revision, "medallion-file/1 nfc-lf/1");
});

test("a file's rights are the most restrictive rule over the nodes it feeds", () => {
  assert.equal(rightsForTypes(POLICY, [{ slug: "a", provenanceType: "academy_atom" }], SEEDS).allowIndex, true);
  const mixed = rightsForTypes(POLICY, [{ slug: "d", provenanceType: "intake_digest" }, { slug: "p", provenanceType: "intake_paper" }], SEEDS);
  assert.equal(mixed.allowIndex, false);
  assert.equal(mixed.rule, "intake-paper");
  assert.deepEqual(rightsForTypes(POLICY, [{ slug: "e", provenanceType: "canon_entry" }], SEEDS), UNKNOWN_RIGHTS);
  assert.deepEqual(rightsForTypes(POLICY, [], SEEDS), UNKNOWN_RIGHTS);
  assert.equal(rightsForTypes(POLICY, [{ slug: "air-is-made-of-tiny-particles", provenanceType: "textbook" }], SEEDS).allowIndex, true);
});

test("a silver span slices back to its bronze text, multibyte included", () => {
  const b = bronzeRecord("_intake/a.md", Buffer.from("# Schrödinger équation\nbody\n"), ALLOWED);
  const span = locateSpan(b.text, "Schrödinger équation");
  assert.ok(span);
  assert.equal(span.end - span.start, byteLength("Schrödinger équation"));
  const item = silverItem(b, span, { kind: "term", locator: null, parser: "t", parserRevision: "t/1", confidenceParts: { parse: 1, match: 0.8 }, proposal: { slug: "s", kind: "law", title: "t", branch: "02-physics" } });
  assert.equal(item.text, "Schrödinger équation");
  assert.equal(item.confidence, 0.8);
  assert.equal(verifySilver(item, b.text), true);
  assert.equal(verifySilver({ ...item, span_start: span.start + 1 }, b.text), false);
  assert.equal(verifySilver({ ...item, span_end: span.end - 1 }, b.text), false);
  assert.equal(locateSpan(b.text, "absent"), null);
});

test("silver keeps no text for a refused source", () => {
  const b = bronzeRecord("bucket-canon/05-biophysics/sub-claims/emf/001.md", Buffer.from("a transcript line"), REFUSED);
  const item = silverItem(b, { start: 0, end: 12 }, { kind: "claim", locator: "01:05:44.400", parser: "t", parserRevision: "t/1", confidenceParts: { parse: 1 }, proposal: { slug: "s", kind: "excerpt", title: "t", branch: "05-biophysics" } });
  assert.equal(item.text, null);
  assert.equal(item.text_hash, sha256Hex("a transcript"));
});

test("confidence is the lowest part and bands at 0.5 and 0.75", () => {
  assert.equal(combineConfidence({ a: 0.9, b: 0.6 }), 0.6);
  assert.throws(() => combineConfidence({}));
  assert.throws(() => combineConfidence({ a: 1.2 }));
  assert.throws(() => combineConfidence({ a: Number.NaN }));
  assert.equal(band(0.49), "hidden");
  assert.equal(band(0.5), "uncertain");
  assert.equal(band(0.74), "uncertain");
  assert.equal(band(0.75), "shown");
});

const academy: GoldTarget = { kind: "concept", provenanceType: "academy_atom", provenanceSource: "learning/app/corpus/02-physics.json" };
const canonEntry: GoldTarget = { kind: "law", provenanceType: "canon_entry", provenanceSource: "bucket-canon/02-physics/bell-theorem/primary-papers.yaml" };
const canonSource: GoldTarget = { kind: "primary_source", provenanceType: "primary_source", provenanceSource: "bucket-canon/02-physics/bell-theorem/primary-papers.yaml" };
const excerpt: GoldTarget = { kind: "excerpt", provenanceType: "source_excerpt", provenanceSource: null };
const live = { status: "candidate" as const, confidence: 0.9 };

test("only an allowlisted reviewer promotes through review", () => {
  withReviewers("founder@bucket.example", () => {
    const denied = checkPromotion({ by: "reviewer", identity: { id: "u1", email: "someone@else.example" } }, { silver: live, node: academy });
    assert.deepEqual(denied, { ok: false, error: "not_a_reviewer" });
    assert.deepEqual(checkPromotion({ by: "reviewer", identity: null }, { silver: live, node: academy }), { ok: false, error: "not_a_reviewer" });
    const allowed = checkPromotion({ by: "reviewer", identity: { id: "u2", email: "Founder@Bucket.example" } }, { silver: live, node: academy });
    assert.deepEqual(allowed, { ok: true, row: { promoted_by: "reviewer", importer: null, reviewer_id: "u2" } });
  });
  withReviewers("", () => {
    assert.deepEqual(checkPromotion({ by: "reviewer", identity: { id: "u2", email: "founder@bucket.example" } }, { silver: live, node: academy }), { ok: false, error: "not_a_reviewer" });
  });
});

test("the importer carve-out covers academy-import and canon-import and nothing else", () => {
  assert.deepEqual(checkPromotion({ by: "importer", importer: "academy-import" }, { silver: live, node: academy }), { ok: true, row: { promoted_by: "importer", importer: "academy-import", reviewer_id: null } });
  assert.equal(checkPromotion({ by: "importer", importer: "canon-import" }, { silver: live, node: canonEntry }).ok, true);
  assert.equal(checkPromotion({ by: "importer", importer: "canon-import" }, { silver: live, node: canonSource }).ok, true);
  assert.deepEqual(checkPromotion({ by: "importer", importer: "academy-import" }, { silver: live, node: canonEntry }), { ok: false, error: "importer_out_of_scope" });
  assert.deepEqual(checkPromotion({ by: "importer", importer: "canon-import" }, { silver: live, node: excerpt }), { ok: false, error: "importer_out_of_scope" });
  for (const other of ["canon-all", "intake-all", "infer-edges"]) {
    assert.deepEqual(checkPromotion({ by: "importer", importer: other }, { silver: live, node: academy }), { ok: false, error: "importer_not_allowed" }, other);
  }
});

test("an excerpt enters gold only with cites, and withdrawn or hidden silver never promotes", () => {
  withReviewers("founder@bucket.example", () => {
    const reviewer = { by: "reviewer" as const, identity: { id: "u", email: "founder@bucket.example" } };
    for (const kind of ["derives_from", "prerequisite"]) {
      assert.deepEqual(checkPromotion(reviewer, { silver: live, edge: { kind, from: excerpt } }), { ok: false, error: "excerpt_rests_on_nothing" }, kind);
    }
    assert.equal(checkPromotion(reviewer, { silver: live, edge: { kind: "cites", from: excerpt } }).ok, true);
    assert.equal(checkPromotion(reviewer, { silver: live, edge: { kind: "derives_from", from: academy } }).ok, true);
    assert.deepEqual(checkPromotion(reviewer, { silver: { status: "withdrawn", confidence: 1 }, node: academy }), { ok: false, error: "silver_withdrawn" });
    assert.deepEqual(checkPromotion(reviewer, { silver: { status: "rejected", confidence: 1 }, node: academy }), { ok: false, error: "silver_rejected" });
    assert.deepEqual(checkPromotion(reviewer, { silver: { status: "candidate", confidence: 0.49 }, node: academy }), { ok: false, error: "below_floor" });
  });
});

test("a rights-refused source shows its id and hash alone: no text, locator or path", () => {
  const row = { id: "s1", source_id: `file:${HASH}`, kind: "claim", locator: "01:05:44.400", text: "Jobs knew about it", text_hash: HASH, confidence: 0.9, repo_path: "bucket-canon/05-biophysics/sub-claims/emf/001-kruse.md" };
  const out = publicSilver(row, { allow_index: false, status: "active" });
  assert.equal(out.text, null);
  assert.equal(out.locator, null);
  assert.equal(out.redacted, true);
  const json = JSON.stringify(out);
  assert.ok(!json.includes("bucket-canon") && !json.includes("kruse") && !json.includes("01:05:44"), json);
  assert.deepEqual(publicCitation(`file:${HASH}`, "01:05:44.400", { allow_index: false, status: "active" }), { sourceId: `file:${HASH}`, locator: null });
  assert.equal(publicSilver(row, null).redacted, true);
  assert.equal(publicSilver(row, { allow_index: true, status: "withdrawn" }).text, null);
  const shown = publicSilver(row, { allow_index: true, status: "active" });
  assert.equal(shown.text, "Jobs knew about it");
  assert.equal(shown.locator, "01:05:44.400");
  assert.ok(!JSON.stringify(shown).includes("bucket-canon"));
});

function node(slug: string, provenance: Record<string, unknown>, kind = "concept", branch = "02-physics"): LineageNode {
  return { slug, kind, branch, provenance };
}

test("each provenance type maps to its bronze file", () => {
  const cases: [LineageNode, string | null, boolean][] = [
    [node("a", { type: "academy_atom", source: "learning/app/corpus/02-physics.json" }), "learning/app/corpus/02-physics.json", false],
    [node("m", { type: "mirror", source: "learning/app/corpus/02-physics.json" }), "learning/app/corpus/02-physics.json", false],
    [node("e", { type: "canon_entry", source: "bucket-canon/02-physics/bell-theorem/primary-papers.yaml" }, "law"), "bucket-canon/02-physics/bell-theorem/primary-papers.yaml", false],
    [node("p", { type: "canon_paper", concept: "bell-theorem" }, "primary_source"), "bucket-canon/02-physics/bell-theorem/primary-papers.yaml", false],
    [node("x", { type: "source_excerpt", branch: "05-biophysics", concept: "emf", claim_slug: "001-x" }, "excerpt"), "bucket-canon/05-biophysics/sub-claims/emf/001-x.md", true],
    [node("b", { type: "canon_bridge" }), "_intake/embeddings-v2/clusters.json", true],
    [node("f", { type: "canon_figure" }, "figure"), "canon-figures/figures.json", false],
    [node("s", { type: "canon_site" }, "site"), "src/data/canon-sites.json", false],
    [node("d", { type: "intake_digest", file: "_intake/concept-digests/a.md" }), "_intake/concept-digests/a.md", false],
    [node("l", { type: "literature_paper", file: "_intake/research-os-k12-literature/x/y.md" }, "primary_source"), "_intake/research-os-k12-literature/x/y.md", false],
    [node("i", { type: "intake_paper", digest: "emf-non-thermal" }, "primary_source"), "_intake/concept-digests/emf-non-thermal.md", false],
    [node("t", { type: "intake_target", folder: "_intake/concept-circadian/" }), "_intake/concept-circadian/README.md", false],
    [node("air-is-made-of-tiny-particles", { type: "textbook" }, "fact"), "supabase/seed/research-os-sky-blue.json", false],
  ];
  for (const [n, repoPath, transcript] of cases) {
    const l = lineageFor(n, SEEDS);
    assert.equal(l.status, "file", `${n.slug}: ${JSON.stringify(l)}`);
    if (l.status === "file") {
      assert.equal(l.repoPath, repoPath, n.slug);
      assert.equal(l.transcript, transcript, n.slug);
    }
  }
  assert.deepEqual(lineageFor(node("c", { type: "canon_concept", branch: "01-mathematics", concept: "chaos-theory" }), SEEDS), {
    status: "directory",
    repoPath: "bucket-canon/01-mathematics/sub-claims/chaos-theory/",
    transcript: true,
  });
  assert.deepEqual(lineageFor(node("u", { type: "import" }, "artifact"), SEEDS), { status: "upload" });
  assert.equal(lineageFor(node("q", { type: "production" }), SEEDS).status, "unknown");
  assert.equal(lineageFor(node("q", {}), SEEDS).status, "unknown");
  assert.deepEqual(lineageFor(node("z", { type: "intake_digest", file: "/srv/abs/secret.md" }), SEEDS), { status: "unknown", reason: "path refused: absolute" });
  assert.deepEqual(lineageFor(node("z", { type: "literature_paper", file: "_intake/../../.ssh/id" }), SEEDS), { status: "unknown", reason: "path refused: dot_segment" });
});

function fakeIO(files: Record<string, string>, dirs: Record<string, string[]> = {}): MedallionIO {
  return {
    readFile: (p) => (p in files ? Buffer.from(files[p], "utf8") : null),
    listDir: (p) => dirs[p] ?? null,
  };
}

const PLAN_NODES: PlanNode[] = [
  { slug: "academy-02-physics-kinematics", title: "Kinematics", kind: "concept", branch: "02-physics", provenance: { type: "academy_atom", source: "learning/app/corpus/02-physics.json" } },
  { slug: "academy-02-physics-vectors", title: "Vectors", kind: "concept", branch: "02-physics", provenance: { type: "academy_atom", source: "learning/app/corpus/02-physics.json" } },
  { slug: "claim-1", title: "the top clock always runs faster", kind: "excerpt", branch: "05-biophysics", provenance: { type: "source_excerpt", branch: "05-biophysics", concept: "emf", claim_slug: "001-x", timestamp: "00:01:02.000" } },
  { slug: "canon-05-biophysics-emf", title: "Emf", kind: "concept", branch: "05-biophysics", provenance: { type: "canon_concept", branch: "05-biophysics", concept: "emf" } },
  { slug: "digest-missing", title: "Missing", kind: "concept", branch: "05-biophysics", provenance: { type: "intake_digest", file: "_intake/concept-digests/missing.md" } },
  { slug: "import-1", title: "Upload", kind: "artifact", branch: "00-imports", provenance: { type: "import" } },
  { slug: "production-1", title: "Work", kind: "extension", branch: "02-physics", provenance: { type: "production" } },
];

const PLAN_IO = fakeIO(
  {
    "learning/app/corpus/02-physics.json": '{"atoms":[{"title":"Kinematics"},{"title":"Vectors"}]}',
    "bucket-canon/05-biophysics/sub-claims/emf/001-x.md": "# the top clock always runs faster\n",
  },
  { "bucket-canon/05-biophysics/sub-claims/emf/": ["001-x.md", "002-y.md"] },
);

test("the plan groups nodes by bronze file, withholds refused text, and a second run matches the first", () => {
  const input = { nodes: PLAN_NODES, io: PLAN_IO, policy: POLICY, seedSlugs: SEEDS, parser: "legacy", parserRevision: "legacy/1" };
  const plan = planMedallion(input);
  assert.equal(plan.bronze.length, 3);
  assert.equal(plan.silver.length, 4);
  assert.deepEqual(plan.uploads, ["import-1"]);
  assert.deepEqual(plan.unknown.map((u) => u.slug).sort(), ["digest-missing", "production-1"]);
  assert.match(plan.unknown.find((u) => u.slug === "digest-missing")!.reason, /bronze file missing/);

  const academy = plan.bronze.find((b) => b.repoPath === "learning/app/corpus/02-physics.json")!;
  assert.equal(academy.rights.allowIndex, true);
  const kin = plan.silverBySlug.get("academy-02-physics-kinematics")!;
  assert.equal(kin.text, "Kinematics");
  assert.equal(kin.confidence, 1);
  assert.equal(verifySilver(kin, academy.text), true);

  const claim = plan.silverBySlug.get("claim-1")!;
  assert.equal(claim.kind, "claim");
  assert.equal(claim.text, null);
  assert.equal(claim.locator, "00:01:02.000");

  const dir = plan.bronze.find((b) => b.repoPath.endsWith("/emf/"))!;
  assert.equal(dir.text, directoryManifest(["002-y.md", "001-x.md"]));
  assert.equal(plan.silverBySlug.get("canon-05-biophysics-emf")!.confidence, 0.5);

  const again = planMedallion(input);
  assert.deepEqual(again.bronze.map(admissionRow), plan.bronze.map(admissionRow));
  assert.deepEqual(again.silver, plan.silver);
});

test("the backfill report counts lineage and the transcript nodes on dependency paths", () => {
  const plan = planMedallion({ nodes: PLAN_NODES, io: PLAN_IO, policy: POLICY, seedSlugs: SEEDS, parser: "legacy", parserRevision: "legacy/1" });
  const ids = new Map(PLAN_NODES.map((n, i) => [n.slug, `id-${i}`]));
  const reportNodes = PLAN_NODES.map((n) => ({ id: ids.get(n.slug)!, slug: n.slug, title: n.title, kind: n.kind, provenanceType: (n.provenance.type as string) ?? null }));
  const dec = decompose(
    reportNodes.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, branch: "02-physics" })),
    [
      { fromId: ids.get("academy-02-physics-vectors")!, toId: ids.get("academy-02-physics-kinematics")!, kind: "prerequisite", confidence: 1 },
      { fromId: ids.get("canon-05-biophysics-emf")!, toId: ids.get("academy-02-physics-kinematics")!, kind: "derives_from", confidence: 0.6 },
    ],
  );
  const report = summarizeBackfill({ nodes: reportNodes, plan, decomposition: dec, uploadNodesWithFile: new Set([ids.get("import-1")!]) });
  assert.deepEqual(
    { known: report.lineage.known, file: report.lineage.file, directory: report.lineage.directory, upload: report.lineage.upload, unknown: report.lineage.unknown },
    { known: 5, file: 3, directory: 1, upload: 1, unknown: 2 },
  );
  assert.deepEqual(report.lineage.unknownByType, { intake_digest: 1, production: 1 });
  assert.equal(report.transcript.nodes, 2);
  assert.equal(report.transcript.onDependencyPath, 1);
  assert.equal(report.transcript.byType.canon_concept.onDependencyPath, 1);
  assert.equal(report.transcript.byType.source_excerpt.onDependencyPath, 0);
  assert.ok(report.transcript.deepest >= 1);
  assert.equal(report.bronze.textWithheld, 1);

  const noFile = summarizeBackfill({ nodes: reportNodes, plan, decomposition: dec, uploadNodesWithFile: new Set() });
  assert.equal(noFile.lineage.unknownByType["import without a file"], 1);
});

const draft = (slug: string, kind = "concept"): IngestNodeDraft => ({ slug, title: slug, kind: kind as IngestNodeDraft["kind"], tier: 12, branch: "02-physics", summary: null, labels: {}, provenance: { type: "canon_concept" } });

test("the import split keeps factor edges and new nodes out of the gold write", () => {
  const nodes = [draft("tag"), draft("claim", "excerpt"), draft("atom")];
  const edges: IngestEdgeDraft[] = [
    { fromSlug: "tag", toSlug: "atom", kind: "derives_from", confidence: 0.7, provenance: { rule: "concept_lexical", shared: ["rate"] } },
    { fromSlug: "atom", toSlug: "tag", kind: "prerequisite", confidence: 0.6 },
    { fromSlug: "claim", toSlug: "atom", kind: "cites", confidence: 0.8 },
    { fromSlug: "claim", toSlug: "tag", kind: "example_of", confidence: 1 },
  ];
  const split = splitImport(nodes, edges, new Set(["tag", "atom"]), new Set([edgeKey(edges[1])]));
  assert.deepEqual(split.goldNodes.map((n) => n.slug), ["tag", "atom"]);
  assert.deepEqual(split.proposedNodes.map((n) => n.slug), ["claim"]);
  assert.deepEqual(split.directEdges.map((e) => e.kind), ["cites", "example_of"]);
  assert.deepEqual(split.factorEdges.map((e) => e.kind), ["derives_from"]);
  assert.deepEqual(split.factorEdgesInGold.map((e) => e.kind), ["prerequisite"]);
  assert.ok(Array.from(FACTOR_KINDS).every((k) => !split.directEdges.some((e) => e.kind === k)));
});

test("a proposal names the factor first, whatever the edge kind", () => {
  assert.deepEqual(factorAndDependent({ fromSlug: "tag", toSlug: "atom", kind: "derives_from" }), { factor: "atom", dependent: "tag" });
  assert.deepEqual(factorAndDependent({ fromSlug: "atom", toSlug: "tag", kind: "prerequisite" }), { factor: "atom", dependent: "tag" });
  const row = edgeProposalRow("canon-all", { fromSlug: "tag", toSlug: "atom", kind: "derives_from", confidence: 0.7, provenance: { rule: "concept_lexical", shared: ["rate", "motion"] } }, "s1", "02-physics");
  assert.equal(row.from_slug, "atom");
  assert.equal(row.to_slug, "tag");
  assert.equal(row.proposed_kind, "derives_from");
  assert.equal(row.confidence_source, "medallion_lexical");
  assert.equal(row.action, "add");
  assert.equal(row.silver_item_id, "s1");
  assert.equal(row.justification, "canon-all word match (concept_lexical): rate, motion.");
  assert.match(row.prompt_hash, /^[0-9a-f]{64}$/);
  assert.equal(edgeProposalRow("canon-all", { fromSlug: "tag", toSlug: "atom", kind: "derives_from", confidence: 0 }, null, "b").confidence, 0.5);
});

test("an edge candidate is its own silver item on the dependent's source, at the lower confidence", () => {
  const plan = planMedallion({ nodes: PLAN_NODES, io: PLAN_IO, policy: POLICY, seedSlugs: SEEDS, parser: "shadow", parserRevision: "shadow/1" });
  const edges: IngestEdgeDraft[] = [
    { fromSlug: "canon-05-biophysics-emf", toSlug: "academy-02-physics-kinematics", kind: "derives_from", confidence: 0.62 },
    { fromSlug: "canon-05-biophysics-emf", toSlug: "academy-02-physics-vectors", kind: "derives_from", confidence: 0.9 },
    { fromSlug: "nobody", toSlug: "academy-02-physics-vectors", kind: "derives_from", confidence: 0.9 },
  ];
  const { candidates, unsilvered } = edgeCandidates(edges, plan.silverBySlug, "shadow", "shadow/1");
  assert.equal(candidates.length, 2);
  assert.deepEqual(unsilvered.map((e) => e.fromSlug), ["nobody"]);
  const [a, b] = candidates.map((c) => c.silver);
  const base = plan.silverBySlug.get("canon-05-biophysics-emf")!;
  assert.equal(a.kind, "edge_candidate");
  assert.equal(a.source_id, base.source_id);
  assert.equal(a.subject, "academy-02-physics-kinematics->canon-05-biophysics-emf");
  assert.notEqual(silverKey(a), silverKey(b));
  assert.equal(a.confidence, 0.5);
  assert.equal(b.confidence, 0.5);
  assert.equal(queueable(a), true);
  assert.equal(queueable({ confidence: 0.49 }), false);
});

test("a node proposal carries the draft under a medallion key", () => {
  const row = nodeProposalRow("canon-all", draft("claim-x", "excerpt"), { confidence: 0.9 }, "s2");
  assert.equal(row.key, "medallion:claim-x");
  assert.equal(row.draft.kind, "excerpt");
  assert.equal(row.silver_item_id, "s2");
  assert.equal(row.model, "none");
});

test("the medallion leg runs by default with --apply and stops for --no-medallion", () => {
  assert.equal(shadowRequested(["node", "x.ts"]), false);
  assert.equal(shadowRequested(["node", "x.ts", "--medallion"]), true);
  assert.equal(shadowRequested(["node", "x.ts", "--apply"]), true);
  assert.equal(shadowRequested(["node", "x.ts", "--apply", "--no-medallion"]), false);
  assert.equal(shadowRequested(["node", "x.ts", "--medallion", "--no-medallion"]), false);
});

test("each demotion names the atom as factor and the tag as dependent, ordered by tag", () => {
  const rows = demotionRows([
    { tagSlug: "canon-06-cosmology-hubble", tagBranch: "06-cosmology", atomSlug: "academy-06-cosmology-redshift", confidence: 0.8, provenance: { rule: "concept_lexical", shared: ["redshift"] }, silverItemId: "s1" },
    { tagSlug: "canon-02-physics-heisenberg", tagBranch: "02-physics", atomSlug: "academy-02-physics-waves", confidence: 0.6, provenance: { rule: "concept_lexical" }, silverItemId: null },
  ]);
  assert.deepEqual(rows.map((r) => [r.from_slug, r.to_slug, r.action, r.proposed_kind, r.branch]), [
    ["academy-02-physics-waves", "canon-02-physics-heisenberg", "demote", "derives_from", "02-physics"],
    ["academy-06-cosmology-redshift", "canon-06-cosmology-hubble", "demote", "derives_from", "06-cosmology"],
  ]);
});

test("recasting three leaf tags to cites leaves them unfactored and moves no other depth", () => {
  const nodes = ["a0", "a1", "a2", "a3", "t1", "t2", "t3"].map((id) => ({ id, slug: id, title: id, kind: "concept", branch: "02-physics" }));
  const base = [
    { fromId: "a0", toId: "a1", kind: "prerequisite", confidence: 1 },
    { fromId: "a1", toId: "a2", kind: "prerequisite", confidence: 1 },
    { fromId: "a2", toId: "a3", kind: "prerequisite", confidence: 1 },
  ];
  const tagEdges = [
    { fromId: "t1", toId: "a3", kind: "derives_from", confidence: 0.7 },
    { fromId: "t2", toId: "a2", kind: "derives_from", confidence: 0.6 },
    { fromId: "t3", toId: "a1", kind: "derives_from", confidence: 0.9 },
  ];
  const before = decompose(nodes, [...base, ...tagEdges]);
  const after = decompose(nodes, [...base, ...tagEdges.map((e) => ({ ...e, kind: "cites" }))]);
  assert.equal(before.get("t1")!.depth, 4);
  for (const t of ["t1", "t2", "t3"]) {
    assert.equal(before.get(t)!.status, "composite");
    assert.equal(after.get(t)!.status, "unfactored");
  }
  for (const a of ["a0", "a1", "a2", "a3"]) assert.equal(after.get(a)!.depth, before.get(a)!.depth, a);
});
