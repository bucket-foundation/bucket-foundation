/**
 * Unit tests: the canon human sign-off tool's TypeScript side
 * (src/lib/canon-signoff.ts, the module behind
 * src/app/api/canon/signoff/route.ts) and its second allowlist gate
 * (src/lib/canon-signoff-approvers.ts). GOVERNANCE.md's "Canon sign-off"
 * section; CLI counterpart tested at tools/canon-pipeline/tests/
 * test_signoff.py, same fixture-tree approach (a temp bucket-canon/ tree
 * per test, no real repo file touched, no network).
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-canon-signoff.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listPending,
  listRecords,
  findRecord,
  approve,
  reject,
  statusOf,
  SignoffError,
  type SignoffStatus,
} from "../src/lib/canon-signoff";
import { isCanonApprover, isCanonSignoffApprover } from "../src/lib/canon-signoff-approvers";

// ---------------------------------------------------------------------------
// fixture tree
// ---------------------------------------------------------------------------

function rec(id: string, title: string, opts: { score?: number; doi?: string | null; signoff?: string | null } = {}) {
  const score = opts.score ?? 70;
  const doi = opts.doi === undefined ? "10.1/x" : opts.doi;
  const signoff = opts.signoff === undefined ? "pending: gianyrox" : opts.signoff;
  const lines = [
    `- id: ${id}`,
    `  title: '${title.replace(/'/g, "''")}'`,
    `  authors:`,
    `  - family: Doe`,
    `    given: J`,
    `  year: 2020`,
    `  venue:`,
    `    name: Nature`,
    // A record with no DOI omits the key entirely (matching what
    // canon-primary.ts's scanner treats as "" / falsy). A literal YAML
    // "null" would parse as the four-character string "null" (truthy),
    // so this builder never emits that.
    ...(doi ? [`  doi: '${doi}'`, `  canonical_url: 'https://doi.org/${doi}'`] : []),
    `  citation_count: 10`,
    `  concepts:`,
    `  - X`,
    `  sources_consulted:`,
    `  - openalex`,
    `  fetched_at: '2026-09-10T00:00:00Z'`,
    `  canon_score: ${score}`,
    `  canon_score_reasons:`,
    `  - +30 peer-reviewed type`,
    `  canon_branch_hints:`,
    `  - 07-mind`,
  ];
  if (signoff !== null) lines.push(`  provenance_signoff: '${signoff}'`);
  return lines.join("\n");
}

function writeConcept(dir: string, ...records: string[]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "primary-papers.yaml"), `records:\n${records.join("\n")}\n`);
}

function makeTree() {
  const base = mkdtempSync(join(tmpdir(), "canon-signoff-test-"));
  const root = join(base, "bucket-canon");
  writeConcept(
    join(root, "07-mind", "memory-systems"),
    rec("bkt-aaa", "Memory Paper One", { score: 85, doi: "10.1/aaa" }),
    rec("bkt-bbb", "Memory Paper Two (approved already)", { score: 80, doi: "10.1/bbb", signoff: "approved: alice 2026-01-01" }),
  );
  writeConcept(join(root, "07-mind", "sub-outcomes", "education"), rec("bkt-ccc", "Outcome Paper", { score: 60, doi: "10.1/ccc" }));
  writeConcept(join(root, "04-information", "no-doi-concept"), rec("bkt-ddd", "No DOI Paper", { score: 70, doi: null }));
  const index = join(base, "CANON-INGESTION-INDEX.md");
  writeFileSync(index, "# Bucket Foundation\n\nCanon Ingestion Index.\n");
  return { base, root, index };
}

function cleanup(base: string) {
  rmSync(base, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// listPending / listRecords
// ---------------------------------------------------------------------------

test("listPending: finds every nested record, excludes already-approved", () => {
  const { base, root } = makeTree();
  try {
    const ids = new Set(listPending(root).map((r) => r.id));
    assert.deepEqual(ids, new Set(["bkt-aaa", "bkt-ccc", "bkt-ddd"]));
  } finally {
    cleanup(base);
  }
});

test("listRecords: tags outcome tier from a sub-outcomes path, canon otherwise", () => {
  const { base, root } = makeTree();
  try {
    const byId = new Map(listPending(root).map((r) => [r.id, r]));
    assert.equal(byId.get("bkt-ccc")!.tier, "outcome");
    assert.equal(byId.get("bkt-aaa")!.tier, "canon");
  } finally {
    cleanup(base);
  }
});

test("listPending: sorted by canon_score desc", () => {
  const { base, root } = makeTree();
  try {
    const scores = listPending(root).map((r) => r.canonScore);
    assert.deepEqual(
      scores,
      [...scores].sort((a, b) => b - a),
    );
  } finally {
    cleanup(base);
  }
});

// ---------------------------------------------------------------------------
// findRecord resolution
// ---------------------------------------------------------------------------

test("findRecord: by bare id", () => {
  const { base, root } = makeTree();
  try {
    const loc = findRecord("bkt-aaa", root);
    assert.equal(loc.record.id, "bkt-aaa");
  } finally {
    cleanup(base);
  }
});

test("findRecord: by path#id", () => {
  const { base, root } = makeTree();
  try {
    const loc = findRecord("07-mind/memory-systems/primary-papers.yaml#bkt-aaa", root);
    assert.equal(loc.record.id, "bkt-aaa");
  } finally {
    cleanup(base);
  }
});

test("findRecord: by bare path with exactly one pending record", () => {
  const { base, root } = makeTree();
  try {
    const loc = findRecord("04-information/no-doi-concept", root);
    assert.equal(loc.record.id, "bkt-ddd");
  } finally {
    cleanup(base);
  }
});

test("findRecord: not found raises SignoffError", () => {
  const { base, root } = makeTree();
  try {
    assert.throws(() => findRecord("bkt-nonexistent", root), SignoffError);
  } finally {
    cleanup(base);
  }
});

// ---------------------------------------------------------------------------
// approve
// ---------------------------------------------------------------------------

test("approve offline: writes 'approved: <name> <date>' touching only that record's line", async () => {
  const { base, root, index } = makeTree();
  try {
    const yamlPath = join(root, "07-mind", "memory-systems", "primary-papers.yaml");
    const before = readFileSync(yamlPath, "utf-8");

    const result = await approve("bkt-aaa", "gianyrox", { offline: true, root, indexPath: index });
    assert.equal(result.action, "approved");
    assert.match(result.value, /^approved: gianyrox \d{4}-\d{2}-\d{2}$/);

    const after = readFileSync(yamlPath, "utf-8");
    assert.ok(after.includes("provenance_signoff: 'approved: alice 2026-01-01'"), "sibling record untouched");

    const beforeLines = before.split("\n");
    const afterLines = after.split("\n");
    assert.equal(beforeLines.length, afterLines.length);
    const changed = beforeLines.filter((l, i) => l !== afterLines[i]);
    assert.equal(changed.length, 1);
    assert.ok(afterLines.join("\n").includes("approved: gianyrox"));
  } finally {
    cleanup(base);
  }
});

test("approve: appends a CANON-INGESTION-INDEX.md entry", async () => {
  const { base, root, index } = makeTree();
  try {
    await approve("bkt-aaa", "gianyrox", { offline: true, root, indexPath: index });
    const text = readFileSync(index, "utf-8");
    assert.ok(text.includes("## Canon sign-off,"));
    assert.ok(text.includes("**approved**: `bucket-canon/07-mind/memory-systems/primary-papers.yaml#bkt-aaa`"));
  } finally {
    cleanup(base);
  }
});

test("approve twice is idempotent (second call is a noop)", async () => {
  const { base, root, index } = makeTree();
  try {
    const first = await approve("bkt-aaa", "gianyrox", { offline: true, root, indexPath: index });
    const second = await approve("bkt-aaa", "gianyrox", { offline: true, root, indexPath: index });
    assert.equal(first.action, "approved");
    assert.equal(second.action, "noop");
    const occurrences = (readFileSync(index, "utf-8").match(/## Canon sign-off,/g) || []).length;
    assert.equal(occurrences, 1);
  } finally {
    cleanup(base);
  }
});

test("approve: requires a non-empty approver name", async () => {
  const { base, root, index } = makeTree();
  try {
    await assert.rejects(() => approve("bkt-aaa", "  ", { offline: true, root, indexPath: index }), SignoffError);
  } finally {
    cleanup(base);
  }
});

test("approve without offline refuses a record with no DOI", async () => {
  const { base, root, index } = makeTree();
  try {
    await assert.rejects(() => approve("bkt-ddd", "gianyrox", { root, indexPath: index }), /no DOI/);
  } finally {
    cleanup(base);
  }
});

// ---------------------------------------------------------------------------
// reject
// ---------------------------------------------------------------------------

test("reject: writes 'rejected: <name> <date>: <reason>' and excludes the record from listPending", async () => {
  const { base, root, index } = makeTree();
  try {
    const result = await reject("bkt-aaa", "gianyrox", "broken DOI", { root, indexPath: index });
    assert.equal(result.action, "rejected");
    assert.ok(result.value.includes("broken DOI"));
    const ids = new Set(listPending(root).map((r) => r.id));
    assert.ok(!ids.has("bkt-aaa"));
    assert.ok(statusOf(result.value) === "rejected");
  } finally {
    cleanup(base);
  }
});

test("reject: requires a non-empty reason", async () => {
  const { base, root, index } = makeTree();
  try {
    await assert.rejects(() => reject("bkt-aaa", "gianyrox", "", { root, indexPath: index }), SignoffError);
  } finally {
    cleanup(base);
  }
});

test("reject twice is idempotent (second call is a noop)", async () => {
  const { base, root, index } = makeTree();
  try {
    await reject("bkt-aaa", "gianyrox", "bad", { root, indexPath: index });
    const second = await reject("bkt-aaa", "gianyrox", "bad again", { root, indexPath: index });
    assert.equal(second.action, "noop");
  } finally {
    cleanup(base);
  }
});

test("reject then approve transition is allowed", async () => {
  const { base, root, index } = makeTree();
  try {
    await reject("bkt-aaa", "gianyrox", "bad DOI", { root, indexPath: index });
    const result = await approve("bkt-aaa", "gianyrox", { offline: true, root, indexPath: index });
    assert.equal(result.action, "approved");
  } finally {
    cleanup(base);
  }
});

// ---------------------------------------------------------------------------
// statusOf
// ---------------------------------------------------------------------------

test("statusOf: vocabulary", () => {
  assert.equal(statusOf("pending: gianyrox"), "pending");
  assert.equal(statusOf("Pending: gianyrox"), "pending");
  assert.equal(statusOf("approved: gianyrox 2026-09-10"), "approved");
  assert.equal(statusOf("rejected: gianyrox 2026-09-10: bad doi"), "rejected");
  assert.equal(statusOf(null), "ungated");
  assert.equal(statusOf("garbage"), "unknown");
});

// ---------------------------------------------------------------------------
// isCanonApprover / isCanonSignoffApprover, the route's 403 gate
// (src/app/api/canon/signoff/route.ts's authorize()). Same env-allowlist
// pattern and test style as scripts/test-research-os-teacher-class.ts's
// isReviewerEmail coverage.
// ---------------------------------------------------------------------------

test("isCanonApprover: fails closed when CANON_SIGNOFF_APPROVERS is unset", () => {
  const prev = process.env.CANON_SIGNOFF_APPROVERS;
  delete process.env.CANON_SIGNOFF_APPROVERS;
  try {
    assert.equal(isCanonApprover("founder@bucket.foundation"), false);
  } finally {
    if (prev === undefined) delete process.env.CANON_SIGNOFF_APPROVERS;
    else process.env.CANON_SIGNOFF_APPROVERS = prev;
  }
});

test("isCanonApprover: true only for an allowlisted, case-insensitive email", () => {
  const prev = process.env.CANON_SIGNOFF_APPROVERS;
  process.env.CANON_SIGNOFF_APPROVERS = "founder@bucket.foundation, second@bucket.foundation";
  try {
    assert.equal(isCanonApprover("Founder@Bucket.Foundation"), true);
    assert.equal(isCanonApprover("someone-else@bucket.foundation"), false);
  } finally {
    if (prev === undefined) delete process.env.CANON_SIGNOFF_APPROVERS;
    else process.env.CANON_SIGNOFF_APPROVERS = prev;
  }
});

test("isCanonSignoffApprover: 403 case -- a Research OS reviewer who is not a canon approver is refused", () => {
  const prev = process.env.CANON_SIGNOFF_APPROVERS;
  process.env.CANON_SIGNOFF_APPROVERS = "founder@bucket.foundation";
  try {
    // isReviewer=true (passed the FIRST gate, RESEARCH_OS_REVIEWER_EMAILS)
    // but this email is not on the SECOND, narrower allowlist: must still
    // be refused. This is the exact scenario the route's two-allowlist
    // stack exists for.
    assert.equal(isCanonSignoffApprover(true, "teacher@school.example"), false);
    assert.equal(isCanonSignoffApprover(true, "founder@bucket.foundation"), true);
  } finally {
    if (prev === undefined) delete process.env.CANON_SIGNOFF_APPROVERS;
    else process.env.CANON_SIGNOFF_APPROVERS = prev;
  }
});

test("isCanonSignoffApprover: 403 case -- not a reviewer at all is refused even if the email is on CANON_SIGNOFF_APPROVERS", () => {
  const prev = process.env.CANON_SIGNOFF_APPROVERS;
  process.env.CANON_SIGNOFF_APPROVERS = "founder@bucket.foundation";
  try {
    assert.equal(isCanonSignoffApprover(false, "founder@bucket.foundation"), false);
  } finally {
    if (prev === undefined) delete process.env.CANON_SIGNOFF_APPROVERS;
    else process.env.CANON_SIGNOFF_APPROVERS = prev;
  }
});

test("isCanonSignoffApprover: 403 case -- no email at all is refused", () => {
  const prev = process.env.CANON_SIGNOFF_APPROVERS;
  process.env.CANON_SIGNOFF_APPROVERS = "founder@bucket.foundation";
  try {
    assert.equal(isCanonSignoffApprover(true, null), false);
    assert.equal(isCanonSignoffApprover(true, undefined), false);
  } finally {
    if (prev === undefined) delete process.env.CANON_SIGNOFF_APPROVERS;
    else process.env.CANON_SIGNOFF_APPROVERS = prev;
  }
});

test("listRecords: a custom statuses set can surface approved records too", () => {
  const { base, root } = makeTree();
  try {
    const all = listRecords({ root, statuses: new Set<SignoffStatus>(["pending", "approved"]) });
    const ids = new Set(all.map((r) => r.id));
    assert.deepEqual(ids, new Set(["bkt-aaa", "bkt-bbb", "bkt-ccc", "bkt-ddd"]));
    assert.equal(all.find((r) => r.id === "bkt-bbb")!.status, "approved");
  } finally {
    cleanup(base);
  }
});
