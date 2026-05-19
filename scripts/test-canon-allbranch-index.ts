/**
 * All-branch canon-index regression guard (bkt-epic-canon-intake).
 *
 * The audit (_intake/2026-05-19-canon-integrity/AUDIT.md §1.5) found the
 * curated primary layer was only ever populated for 4 biophysics concepts.
 * canon-primary.ts:findPrimaryFiles() is branch-AGNOSTIC by construction (it
 * walks every `^\d{2}-` branch dir), so the wiring is generic — this test
 * PINS that: it asserts the loader picks up primary-papers.yaml from MORE than
 * one branch and that every loaded record is structurally serveable by
 * /api/research (DOI + canonical_url + title + canon_score).
 *
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' \
 *        scripts/test-canon-allbranch-index.ts
 * Exit non-zero on regression (e.g. someone hard-codes branch=05-biophysics).
 */
import * as path from "path";

/* eslint-disable @typescript-eslint/no-require-imports */
const Mod = require("module");
const origResolve = Mod._resolveFilename;
Mod._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request.startsWith("@/")) {
    request = path.join(__dirname, "..", "src", request.slice(2));
  }
  return origResolve.call(this, request, ...rest);
};
const { loadPrimaryPapers } = require("../src/lib/canon-primary");
const { rankPrimary } = require("../src/lib/canon-primary");
/* eslint-enable @typescript-eslint/no-require-imports */

type P = {
  branch: string;
  concept: string;
  title: string;
  doi: string;
  canonicalUrl: string;
  canonScore: number;
};

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const papers: P[] = loadPrimaryPapers();
const byBranch: Record<string, number> = {};
papers.forEach((p) => {
  byBranch[p.branch] = (byBranch[p.branch] ?? 0) + 1;
});
const branchNames = Object.keys(byBranch).sort();

console.log(`loaded ${papers.length} primary papers`);
branchNames.forEach((b) => console.log(`  ${b}: ${byBranch[b]}`));

check(
  "primary layer spans >1 branch (audit: was 05-biophysics only)",
  branchNames.length > 1,
  `${branchNames.length} branches: ${branchNames.join(", ")}`,
);
check(
  "01-mathematics has curated primary records (was ZERO pre-pipeline)",
  (byBranch["01-mathematics"] ?? 0) > 0,
);
check(
  "02-physics has curated primary records (was ZERO pre-pipeline)",
  (byBranch["02-physics"] ?? 0) > 0,
);

const bad = papers.filter(
  (p) => !p.doi || !p.canonicalUrl || !p.title || p.canonScore <= 0,
);
check(
  "every loaded record is serveable (doi+url+title+score)",
  bad.length === 0,
  bad.length ? `${bad.length} malformed: ${bad.slice(0, 3).map((p) => p.concept)}` : "",
);

// The wiring is live END-TO-END: a query whose terms lexically appear in a
// non-biophysics primary title now ranks that real paper through the SAME
// rankPrimary() the /api/research route calls. (Queries are chosen to clear
// the title-overlap abstention gate; precision for paraphrase/German-title
// queries is the SEPARATELY-beaded semantic-ranking follow-up, bkt P1 — not
// this deliverable. Abstaining on a non-match is the audited-correct
// behaviour, not a wiring failure.)
const mathHit = rankPrimary("computable numbers Entscheidungsproblem", 3);
check(
  "rankPrimary serves a 01-mathematics paper for a math query (wiring live)",
  mathHit.length > 0 && mathHit[0].paper.branch === "01-mathematics",
  mathHit[0]?.paper?.title?.slice(0, 50) ?? "(no hit)",
);
const physHit = rankPrimary("Einstein Podolsky Rosen paradox", 3);
check(
  "rankPrimary serves a 02-physics paper for a physics query (wiring live)",
  physHit.length > 0 && physHit[0].paper.branch === "02-physics",
  physHit[0]?.paper?.title?.slice(0, 50) ?? "(no hit)",
);

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
