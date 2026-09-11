/**
 * Research OS for K-12, canon-claims generator (bkt-ros, production
 * guard bead, task item 2's "canon claim texts, a build-time JSON of
 * canon claim summaries"). Reads every `bucket-canon/**\/primary-
 * papers.yaml` record via `src/lib/canon-primary.ts`'s existing
 * `loadPrimaryPapers` (the same loader `canon-import.ts` and
 * `/api/research` already depend on) across EVERY branch, unlike
 * `canon-import.ts`'s own `02-physics`-only scope: duplicate detection
 * needs the whole canon a learner's claim could echo, the full set past
 * one branch's importable slice.
 *
 * Synthesizes one claim text per record with the exact rule
 * `src/lib/research-os/ingest/canon.ts`'s `buildCanonEntryNode` already
 * uses for a canon-bridge node's own `summary`: a law-kind record
 * (`isLawFolder(concept)`) reads "<law>, established in <title>
 * (<year>).", any other record reads as its own paper title. Reused from
 * that existing rule, so a claim text here reads the same way the
 * graph's own canon-bridge node summaries already do.
 *
 * Writes `scripts/research-os/ingest/out/canon-claims.json` (gitignored,
 * regenerated on demand, see `.gitignore`'s `out/*` rule). A small,
 * hand-picked slice of a real run is committed separately as
 * `out/sample-canon-claims.json`, read by `src/lib/research-os/
 * canon-link.ts`'s `loadCanonClaims` on a fresh checkout that has not
 * run this generator yet.
 *
 * Must run with the repo root as the working directory:
 * `src/lib/canon-primary.ts`'s own loader resolves `bucket-canon/` off
 * `process.cwd()`.
 *
 * Run (from the repo root):
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/canon-claims.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadPrimaryPapers } from "../../../src/lib/canon-primary";
import { isLawFolder } from "../../../src/lib/research-os/ingest/canon";

const OUT_DIR = join(__dirname, "out");

function claimTextFor(concept: string, title: string, year: number | null): string {
  if (isLawFolder(concept)) {
    const law = concept.replace(/-/g, " ");
    return `${law}, established in ${title}${year ? ` (${year})` : ""}.`;
  }
  return title;
}

function main() {
  const papers = loadPrimaryPapers();
  const claims = papers.map((p) => ({
    id: p.id,
    branch: p.branch,
    concept: p.concept,
    claimText: claimTextFor(p.concept, p.title, p.year),
  }));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "canon-claims.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), count: claims.length, claims }, null, 2) + "\n",
  );
  console.log(`[canon-claims] wrote ${claims.length} canon claim texts.`);
}

main();
