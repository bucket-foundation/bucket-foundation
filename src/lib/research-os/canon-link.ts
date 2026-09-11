/**
 * Research OS for K-12, canon-fs reads for the production guard (bkt-ros,
 * production guard bead). Two things `production-guard.ts`'s pure
 * functions need but cannot fetch themselves (that file has no I/O, by
 * this directory's own pure/IO split):
 *
 *   1. `canonClaimsAsDuplicateCandidates` -- task item 2's third
 *      duplicate-detection population, canon claim texts, read from the
 *      build-time JSON `scripts/research-os/ingest/canon-claims.ts`
 *      generates.
 *   2. `lookupCanonSignoff` -- task item 4's canon-record link, a
 *      `graph.nodes.provenance.paper_id` resolved to that record's raw,
 *      UNFILTERED `provenance_signoff` value (src/lib/canon-primary.ts's
 *      own `loadPrimaryPapers` deliberately excludes a pending/rejected
 *      record before caching, so it cannot answer what that record's
 *      raw signoff value says).
 *
 * fs-backed, the same posture src/lib/canon-primary.ts's own loader
 * already has; kept a separate module from production-guard.ts so that
 * file's own scoring functions stay pure and unit-testable with no
 * filesystem. Both loaders below are memoized per server process and
 * never throw: a missing or malformed file degrades to an empty result
 * rather than failing a Production submission or review decision, since
 * neither duplicate detection nor incentive-eligibility computation is
 * allowed to block or crash on missing canon data (production-guard.ts's
 * own "never blocks submission" rule, and an eligibility signal that
 * fails closed to `false` is the safe default either way).
 */
import fs from "fs";
import path from "path";
import { findPrimaryFiles, parseYamlRecords } from "../canon-primary";
import type { DuplicateCandidate } from "./production-guard";

const OUT_DIR = path.join(process.cwd(), "scripts", "research-os", "ingest", "out");
const GENERATED_CLAIMS_PATH = path.join(OUT_DIR, "canon-claims.json");
const SAMPLE_CLAIMS_PATH = path.join(OUT_DIR, "sample-canon-claims.json");

export interface CanonClaimRecord {
  id: string;
  branch: string;
  concept: string;
  claimText: string;
}

let claimsCache: CanonClaimRecord[] | null = null;

function readClaimsFile(filePath: string): CanonClaimRecord[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as { claims?: unknown };
  if (!Array.isArray(parsed.claims)) return [];
  return parsed.claims.filter((c): c is CanonClaimRecord => {
    const rec = c as Partial<CanonClaimRecord> | null;
    return Boolean(rec) && typeof rec?.id === "string" && typeof rec?.claimText === "string";
  });
}

/**
 * Every canon claim text available to the duplicate-detection check
 * (`scripts/research-os/ingest/canon-claims.ts`'s generated output when
 * present, else the committed `sample-canon-claims.json`, matching the
 * generated/sample split every other file under this directory's `out/`
 * already uses, see `.gitignore`). Memoized: a repeat call in the same
 * server process reads disk once.
 */
export function loadCanonClaims(): CanonClaimRecord[] {
  if (claimsCache) return claimsCache;
  const filePath = fs.existsSync(GENERATED_CLAIMS_PATH) ? GENERATED_CLAIMS_PATH : SAMPLE_CLAIMS_PATH;
  try {
    claimsCache = readClaimsFile(filePath);
  } catch {
    claimsCache = [];
  }
  return claimsCache;
}

export function canonClaimsAsDuplicateCandidates(): DuplicateCandidate[] {
  return loadCanonClaims().map((c) => ({ id: c.id, text: c.claimText, origin: "canon" as const }));
}

let signoffCache: Map<string, string | null> | null = null;

/**
 * `bucket-canon/**\/primary-papers.yaml` record id -> that record's raw
 * `provenance_signoff` value (or null when the record carries none),
 * read UNFILTERED via `canon-primary.ts`'s own exported `findPrimaryFiles`
 * / `parseYamlRecords` (the same pair `src/lib/canon-signoff.ts`'s
 * sign-off tool already reuses for the identical reason: `
 * loadPrimaryPapers()`'s cached, gate-applied output has already dropped
 * a pending or rejected record by the time a caller could read its own
 * signoff value back out). A record id not found returns null, the
 * same reading a record with no signoff field at all would produce.
 */
export function lookupCanonSignoff(paperId: string): string | null {
  if (!signoffCache) {
    const map = new Map<string, string | null>();
    for (const { branch, concept, file } of findPrimaryFiles()) {
      let raw = "";
      try {
        raw = fs.readFileSync(file, "utf-8");
      } catch {
        continue;
      }
      for (const record of parseYamlRecords(raw, branch, concept)) {
        map.set(record.id, record.provenanceSignoff);
      }
    }
    signoffCache = map;
  }
  return signoffCache.get(paperId) ?? null;
}
