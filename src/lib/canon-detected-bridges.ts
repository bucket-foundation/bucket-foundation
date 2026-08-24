// canon-detected-bridges.ts, server-only loader for LLM-named
// multi-branch primitive bridges discovered via embedding clustering.
//
// Data lives at bucket-canon/_bridges/detected/<NN-slug>/README.md
// produced by `agf-bridge-name`.

import fs from "fs";
import path from "path";

export type DetectedBridge = {
  slug: string;
  rank: number;
  name: string;
  branches: string[];
  branchCount: number;
  size: number;
  bridgeScore: number;
  category: string;
  confidence: number;
  canonicalForm: string;
  description: string;
  vocabularyMap: { branch: string; term: string; role: string }[];
  supportingAuthors: string[];
  testFalsifiability: string;
  memberClaims: { branch: string; concept: string; title: string }[];
  body: string;
};

const REPO_ROOT = path.resolve(process.cwd());
const DETECTED_ROOT = path.join(REPO_ROOT, "bucket-canon", "_bridges", "detected");

function parseDetected(dir: string, fullSlug: string): DetectedBridge | null {
  const file = path.join(dir, "README.md");
  let raw: string;
  try { raw = fs.readFileSync(file, "utf-8"); } catch { return null; }

  const m = fullSlug.match(/^(\d+)-(.+)$/);
  const rank = m ? parseInt(m[1], 10) : 0;
  const slug = m ? m[2] : fullSlug;
  const name = (raw.split("\n")[0] || "").replace(/^#\s+/, "").trim();

  const get = (label: string) => {
    const re = new RegExp(`\\*\\*${label}\\*\\*[:\\s]*(.+?)$`, "m");
    return raw.match(re)?.[1]?.trim() || "";
  };

  const branchesLine = get("Branches");
  const branches = branchesLine
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);

  const size = parseInt(get("Cluster size").match(/\d+/)?.[0] || "0", 10);
  const bridgeScore = parseFloat(get("Bridge score") || "0");
  const category = get("Category \\(LLM judgment\\)")?.replace(/\s+·.*$/, "") || "";
  const confidence = parseFloat(
    raw.match(/\*\*Confidence\*\*[:\s]*([\d.]+)/)?.[1] || "0",
  );

  // Canonical form: quote block after ## Canonical form
  const cfMatch = raw.match(/## Canonical form\s*\n+>\s*(.+?)\n/);
  const canonicalForm = cfMatch?.[1].trim() || "";

  // Description: paragraph after ## Description
  const descSect = raw.split("## Description")[1]?.split("\n## ")[0] || "";
  const description = descSect.trim();

  // Vocabulary map
  const vocabSect = raw.split("## Vocabulary across branches")[1]?.split("\n## ")[0] || "";
  const vocabularyMap: DetectedBridge["vocabularyMap"] = [];
  for (const line of vocabSect.split("\n")) {
    const v = line.match(/^- \*\*([^*]+)\*\* — `([^`]+)` — (.+)$/);
    if (v) vocabularyMap.push({ branch: v[1].trim(), term: v[2].trim(), role: v[3].trim() });
  }

  // Supporting authors
  const authSect = raw.split("## Supporting authors")[1]?.split("\n## ")[0] || "";
  const supportingAuthors = authSect
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);

  // Test / falsifiability
  const tfSect = raw.split("## Test / falsifiability")[1]?.split("\n## ")[0] || "";
  const testFalsifiability = tfSect.trim();

  // Member claims
  const memSect = raw.split("## Source claims (cluster members)")[1] || "";
  const memberClaims: DetectedBridge["memberClaims"] = [];
  for (const line of memSect.split("\n")) {
    const mm = line.match(/^- \[([^\]]+)\] (.+)$/);
    if (mm) {
      const [b, c] = mm[1].split("/");
      memberClaims.push({ branch: b, concept: c, title: mm[2].trim() });
    }
  }

  return {
    slug, rank, name, branches, branchCount: branches.length,
    size, bridgeScore, category, confidence,
    canonicalForm, description, vocabularyMap, supportingAuthors,
    testFalsifiability, memberClaims, body: raw,
  };
}

export function getAllDetectedBridges(): DetectedBridge[] {
  if (!fs.existsSync(DETECTED_ROOT)) return [];
  const out: DetectedBridge[] = [];
  for (const entry of fs.readdirSync(DETECTED_ROOT)) {
    const p = path.join(DETECTED_ROOT, entry);
    if (!fs.statSync(p).isDirectory()) continue;
    const b = parseDetected(p, entry);
    if (b) out.push(b);
  }
  out.sort((a, b) => b.bridgeScore - a.bridgeScore || a.rank - b.rank);
  return out;
}

export function getDetectedBridge(slug: string): DetectedBridge | null {
  if (!fs.existsSync(DETECTED_ROOT)) return null;
  for (const entry of fs.readdirSync(DETECTED_ROOT)) {
    const p = path.join(DETECTED_ROOT, entry);
    if (!fs.statSync(p).isDirectory()) continue;
    if (entry.endsWith(`-${slug}`) || entry === slug) {
      return parseDetected(p, entry);
    }
  }
  return null;
}
