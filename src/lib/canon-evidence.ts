// canon-evidence.ts, server-only loader for per-claim corpus evidence
// passages. Data comes from _intake/embeddings/claim-evidence.jsonl
// produced by agf-claim-evidence.

import fs from "fs";
import path from "path";

export type EvidencePassage = {
  score: number;
  source_path: string;
  text: string;
};

export type ClaimEvidence = {
  claim_id: number;
  branch: string;
  concept: string;
  slug: string;
  title: string;
  path: string;
  evidence: EvidencePassage[];
};

const REPO_ROOT = path.resolve(process.cwd());
const EVIDENCE_PATH = path.join(REPO_ROOT, "_intake", "embeddings", "claim-evidence.jsonl");

let cache: Map<string, ClaimEvidence> | null = null;

function buildCache(): Map<string, ClaimEvidence> {
  const c = new Map<string, ClaimEvidence>();
  if (!fs.existsSync(EVIDENCE_PATH)) return c;
  const raw = fs.readFileSync(EVIDENCE_PATH, "utf-8");
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line) as ClaimEvidence;
      const key = `${d.concept}::${d.slug}`;
      c.set(key, d);
    } catch {
      continue;
    }
  }
  return c;
}

export function getEvidenceFor(concept: string, slug: string): ClaimEvidence | null {
  if (!cache) cache = buildCache();
  return cache.get(`${concept}::${slug}`) || null;
}

// Format a source path for display, strip the repo prefix
export function prettySourcePath(p: string): string {
  return p.replace(/^.*?\/bucket-foundation\//, "");
}

// Categorize source by its path prefix
export function sourceKind(p: string): string {
  const m = p.match(/bucket-foundation\/([^/]+)/);
  if (!m) return "other";
  return m[1]; // yt, pubmed, archive, openalex, blog, _intake, etc.
}
