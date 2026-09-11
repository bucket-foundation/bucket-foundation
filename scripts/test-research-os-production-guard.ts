/**
 * Unit tests: src/lib/research-os/production-guard.ts's pure functions
 * (bkt-ros, production guard bead) plus src/lib/research-os/canon-link.ts's
 * fs-backed canon-claims loader against the committed
 * scripts/research-os/ingest/out/sample-canon-claims.json (no network, no
 * Supabase: canon-link.ts's own loaders are the only I/O here, both plain
 * filesystem reads of a file this repo already commits).
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-production-guard.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  checkSourceProvenance,
  unverifiedSources,
  hasUnverifiedSource,
  unverifiedSourceReturnNote,
  tokenize,
  jaccardOverlap,
  computeDuplicateFlag,
  DUPLICATE_OVERLAP_THRESHOLD,
  requiresCounterEvidence,
  normalizeCounterEvidence,
  hasCounterEvidence,
  computeIncentiveEligible,
  type DuplicateCandidate,
  type QuoteEvidenceRecord,
} from "../src/lib/research-os/production-guard";
import { loadCanonClaims, canonClaimsAsDuplicateCandidates, lookupCanonSignoff } from "../src/lib/research-os/canon-link";

// ---------------------------------------------------------------------------
// Rule 1: quote-locator source verification
// ---------------------------------------------------------------------------

function quoteEv(locator: string): QuoteEvidenceRecord {
  return { nodeId: "n1", locator, at: "2026-09-10T00:00:00.000Z" };
}

test("checkSourceProvenance: a source line carrying a real locator verifies", () => {
  const checks = checkSourceProvenance(
    ['NASA Space Place, "Why Is the Sky Blue?", body text'],
    [quoteEv('NASA Space Place, "Why Is the Sky Blue?", body text')],
  );
  assert.equal(checks.length, 1);
  assert.equal(checks[0].verified, true);
});

test("checkSourceProvenance: whitespace/case differences still match (normalized)", () => {
  const checks = checkSourceProvenance(
    ["  NASA SPACE place,   \"Why Is the Sky Blue?\", body text  "],
    [quoteEv('NASA Space Place, "Why Is the Sky Blue?", body text')],
  );
  assert.equal(checks[0].verified, true);
});

test("checkSourceProvenance: a source with no matching locator is unverified", () => {
  const checks = checkSourceProvenance(["I read this on some website"], [quoteEv("Wikipedia, \"Rayleigh scattering\", lead paragraph")]);
  assert.equal(checks[0].verified, false);
});

test("checkSourceProvenance: an empty source line is unverified even with quote evidence on file", () => {
  const checks = checkSourceProvenance([""], [quoteEv("Wikipedia, \"Rayleigh scattering\", lead paragraph")]);
  assert.equal(checks[0].verified, false);
});

test("hasUnverifiedSource / unverifiedSources: true and non-empty only when a source failed", () => {
  const allGood = checkSourceProvenance(["a (loc-a)"], [quoteEv("loc-a")]);
  assert.equal(hasUnverifiedSource(allGood), false);
  assert.deepEqual(unverifiedSources(allGood), []);

  const mixed = checkSourceProvenance(["a (loc-a)", "b (unknown)"], [quoteEv("loc-a")]);
  assert.equal(hasUnverifiedSource(mixed), true);
  assert.equal(unverifiedSources(mixed).length, 1);
  assert.equal(unverifiedSources(mixed)[0].text, "b (unknown)");
});

test("unverifiedSourceReturnNote: empty string when nothing is unverified, a real template otherwise", () => {
  const allGood = checkSourceProvenance(["a (loc-a)"], [quoteEv("loc-a")]);
  assert.equal(unverifiedSourceReturnNote(allGood), "");

  const bad = checkSourceProvenance(["made up source"], []);
  const note = unverifiedSourceReturnNote(bad);
  assert.ok(note.includes("made up source"));
  assert.ok(note.toLowerCase().includes("quote"));
});

// ---------------------------------------------------------------------------
// Rule 2: duplicate detection, normalized token overlap
// ---------------------------------------------------------------------------

test("tokenize: lowercases and extracts alphanumeric tokens, drops no stop words", () => {
  const tokens = tokenize("The sky is Blue, the SKY is blue!");
  assert.ok(tokens.has("the"));
  assert.ok(tokens.has("sky"));
  assert.ok(tokens.has("is"));
  assert.ok(tokens.has("blue"));
  assert.equal(tokens.size, 4);
});

test("jaccardOverlap: identical token sets score 1, disjoint sets score 0, empty sets score 0", () => {
  const a = tokenize("light scatters blue");
  assert.equal(jaccardOverlap(a, a), 1);
  assert.equal(jaccardOverlap(tokenize("light scatters blue"), tokenize("mitochondria produce atp")), 0);
  assert.equal(jaccardOverlap(new Set(), a), 0);
});

test("computeDuplicateFlag: a near-duplicate claim (high token overlap) against the learner's own prior work flags", () => {
  const priorClaim =
    "Blue light scatters more than red light in the atmosphere because of Rayleigh scattering and the lambda to the minus four law";
  const nearDuplicate =
    "Blue light scatters more than red light in the atmosphere because of Rayleigh scattering and the lambda to the minus four rule";
  const candidates: DuplicateCandidate[] = [{ id: "prod-1", text: priorClaim, origin: "own_prior" }];
  const flag = computeDuplicateFlag(nearDuplicate, candidates);
  assert.ok(flag, "expected a duplicate flag for a near-identical claim");
  assert.equal(flag!.matchId, "prod-1");
  assert.equal(flag!.matchOrigin, "own_prior");
  assert.ok(flag!.score >= DUPLICATE_OVERLAP_THRESHOLD, `score ${flag!.score} should clear the threshold`);
});

test("computeDuplicateFlag: an unrelated claim against the same candidate does not flag", () => {
  const candidates: DuplicateCandidate[] = [{ id: "prod-1", text: "mitochondria produce ATP through oxidative phosphorylation", origin: "own_prior" }];
  const flag = computeDuplicateFlag("blue light scatters more than red light in the atmosphere", candidates);
  assert.equal(flag, null);
});

test("computeDuplicateFlag: no candidates, or an empty claim, returns null rather than throwing", () => {
  assert.equal(computeDuplicateFlag("anything at all", []), null);
  assert.equal(computeDuplicateFlag("", [{ id: "x", text: "anything at all", origin: "canon" }]), null);
});

test("computeDuplicateFlag: picks the highest-scoring candidate across mixed origins", () => {
  const claim = "blue light scatters more than red light because of rayleigh scattering";
  const candidates: DuplicateCandidate[] = [
    { id: "weak", text: "blue light scatters", origin: "canon" },
    { id: "strong", text: "blue light scatters more than red light because of rayleigh scattering itself", origin: "class_peer" },
  ];
  const flag = computeDuplicateFlag(claim, candidates);
  assert.ok(flag);
  assert.equal(flag!.matchId, "strong");
  assert.equal(flag!.matchOrigin, "class_peer");
});

// ---------------------------------------------------------------------------
// Rule 3: counter-evidence
// ---------------------------------------------------------------------------

test("requiresCounterEvidence: true at internalization and production, false earlier", () => {
  assert.equal(requiresCounterEvidence("access"), false);
  assert.equal(requiresCounterEvidence("awareness"), false);
  assert.equal(requiresCounterEvidence("understanding"), false);
  assert.equal(requiresCounterEvidence("internalization"), true);
  assert.equal(requiresCounterEvidence("production"), true);
});

test("normalizeCounterEvidence: accepts a bare string array or {text} objects, drops blanks and junk", () => {
  assert.deepEqual(normalizeCounterEvidence(["a rebuttal", "  ", ""]), [{ text: "a rebuttal" }]);
  assert.deepEqual(normalizeCounterEvidence([{ text: "shaped" }, { text: "  " }, { nope: true }]), [{ text: "shaped" }]);
  assert.deepEqual(normalizeCounterEvidence(undefined), []);
  assert.deepEqual(normalizeCounterEvidence("not an array" as unknown), []);
});

test("hasCounterEvidence: true only when normalization leaves at least one entry", () => {
  assert.equal(hasCounterEvidence(["a real rebuttal"]), true);
  assert.equal(hasCounterEvidence([]), false);
  assert.equal(hasCounterEvidence(["   "]), false);
  assert.equal(hasCounterEvidence(null), false);
});

// ---------------------------------------------------------------------------
// Rule 4: citation-incentive eligibility
// ---------------------------------------------------------------------------

test("computeIncentiveEligible: true only for an accepted status with a signoff starting 'approved'", () => {
  assert.equal(computeIncentiveEligible("accepted", "approved: gianyrox 2026-09-10"), true);
  assert.equal(computeIncentiveEligible("accepted", "  approved: gianyrox 2026-09-10"), true);
});

test("computeIncentiveEligible: false for a pending, rejected, missing, or absent signoff", () => {
  assert.equal(computeIncentiveEligible("accepted", "pending: gianyrox"), false);
  assert.equal(computeIncentiveEligible("accepted", "rejected: gianyrox 2026-09-10: not primary source"), false);
  assert.equal(computeIncentiveEligible("accepted", null), false);
  assert.equal(computeIncentiveEligible("accepted", undefined), false);
});

test("computeIncentiveEligible: false for any non-accepted status regardless of signoff", () => {
  assert.equal(computeIncentiveEligible("submitted", "approved: gianyrox 2026-09-10"), false);
  assert.equal(computeIncentiveEligible("draft", "approved: gianyrox 2026-09-10"), false);
});

// ---------------------------------------------------------------------------
// canon-link.ts: fs-backed loaders against the committed sample
// ---------------------------------------------------------------------------

test("loadCanonClaims: every committed sample id is present (whichever file, sample or a real generated run, is actually loaded)", () => {
  const claims = loadCanonClaims();
  assert.ok(claims.length > 0, "expected at least the committed sample");
  const ids = new Set(claims.map((c) => c.id));
  // The committed sample was drawn from a real generator run, so every one
  // of its ids is a real canon record id either way this loader resolves.
  assert.ok(ids.has("bkt-d8a749ee80a7"), "expected the bell-theorem sample entry");
  assert.ok(ids.has("bkt-13cda172e614"), "expected the godel sample entry");
});

test("canonClaimsAsDuplicateCandidates: maps every claim to a canon-origin duplicate candidate", () => {
  const candidates = canonClaimsAsDuplicateCandidates();
  assert.ok(candidates.length > 0);
  for (const c of candidates) {
    assert.equal(c.origin, "canon");
    assert.equal(typeof c.id, "string");
    assert.equal(typeof c.text, "string");
    assert.ok(c.text.length > 0);
  }
});

test("lookupCanonSignoff: returns null for an id that does not exist, never throws", () => {
  assert.equal(lookupCanonSignoff("bkt-does-not-exist-at-all"), null);
});
