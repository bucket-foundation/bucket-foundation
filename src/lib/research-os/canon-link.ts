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
