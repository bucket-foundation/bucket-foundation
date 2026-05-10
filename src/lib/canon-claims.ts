// canon-claims.ts — server-only filesystem scanner for
// bucket-canon/05-biophysics/sub-claims/ (curated candidate claims with
// timestamps + source citations).

import fs from "fs";
import path from "path";

export type ClaimCard = {
  branch: string;          // "05-biophysics"
  concept: string;         // "melanin"
  slug: string;            // "001-fascinated-by-it..."
  title: string;
  excerpt: string;
  videoTitle: string;
  videoSlug: string;
  url: string;             // YouTube URL with ?t=
  timestamp: string;
  sec: number;
  score: number;
  patternSignals: string[];
  crossConcepts: string[];
  capturedAt: string;
};

const REPO_ROOT = path.resolve(process.cwd());
const CLAIMS_ROOT = path.join(REPO_ROOT, "bucket-canon", "05-biophysics", "sub-claims");

function parseClaimMd(file: string, branch: string, concept: string, slug: string): ClaimCard | null {
  let raw: string;
  try { raw = fs.readFileSync(file, "utf-8"); } catch { return null; }
  const lines = raw.split("\n");

  const title = (lines.find((l) => l.startsWith("# "))?.replace(/^#\s+/, "") || slug)
    .replace(/^Claim\s*[—-]\s*/, "")
    .trim();

  const get = (key: string) => {
    const re = new RegExp(`^- \\*\\*${key}\\*\\*:\\s*(.+?)$`, "m");
    return raw.match(re)?.[1]?.trim() || "";
  };

  const sourceLine = get("Source");
  const sourceMatch = sourceLine.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  const videoTitle = sourceMatch?.[1] || sourceLine;
  const url = sourceMatch?.[2] || "";

  const tsLine = get("Timestamp");
  const tsMatch = tsLine.match(/`([^`]+)`\s*\(~(\d+)s\)/);
  const timestamp = tsMatch?.[1] || tsLine;
  const sec = tsMatch ? parseInt(tsMatch[2], 10) : 0;

  const scoreLine = get("Score");
  const scoreMatch = scoreLine.match(/^(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  const patternSignals = (scoreLine.match(/Pattern signals\*\*:\s*([^·]+)$/i)?.[1] || "")
    .split(/[,/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Pattern signals come from the same line as Score, split on '·'
  const psLine = (raw.match(/^- \*\*Score\*\*:.*$/m)?.[0] || "");
  const ps = (psLine.split("Pattern signals**:")[1] || "")
    .split(/[,/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const crossLine = get("Cross-concepts");
  const crossConcepts = crossLine === "—"
    ? []
    : crossLine.split(",").map((s) => s.trim()).filter(Boolean);

  const capturedAt = get("Captured");

  // Excerpt: text after "## Excerpt" up to next "## "
  const excerptIdx = raw.indexOf("## Excerpt");
  const provIdx = raw.indexOf("## Provenance", excerptIdx);
  let excerpt = "";
  if (excerptIdx > 0 && provIdx > excerptIdx) {
    excerpt = raw.slice(excerptIdx + "## Excerpt".length, provIdx).trim();
    excerpt = excerpt.replace(/^>\s*/gm, "").trim();
  }

  // Provenance — video slug
  const provSlugMatch = raw.match(/Video slug:\s*`([^`]+)`/);
  const videoSlug = provSlugMatch?.[1] || "";

  return {
    branch,
    concept,
    slug,
    title,
    excerpt,
    videoTitle,
    videoSlug,
    url,
    timestamp,
    sec,
    score,
    patternSignals: ps,
    crossConcepts,
    capturedAt,
  };
}

export function getAllClaims(): ClaimCard[] {
  if (!fs.existsSync(CLAIMS_ROOT)) return [];
  const out: ClaimCard[] = [];
  for (const concept of fs.readdirSync(CLAIMS_ROOT)) {
    const conceptDir = path.join(CLAIMS_ROOT, concept);
    if (!fs.statSync(conceptDir).isDirectory()) continue;
    for (const file of fs.readdirSync(conceptDir)) {
      if (!file.endsWith(".md")) continue;
      const slug = file.replace(/\.md$/, "");
      const c = parseClaimMd(path.join(conceptDir, file), "05-biophysics", concept, slug);
      if (c) out.push(c);
    }
  }
  // sort score desc, then concept
  out.sort((a, b) => b.score - a.score || a.concept.localeCompare(b.concept));
  return out;
}

export function getClaimsByConcept(): Record<string, ClaimCard[]> {
  const all = getAllClaims();
  const by: Record<string, ClaimCard[]> = {};
  for (const c of all) {
    (by[c.concept] ||= []).push(c);
  }
  return by;
}

export function getClaim(concept: string, slug: string): ClaimCard | null {
  const file = path.join(CLAIMS_ROOT, concept, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return parseClaimMd(file, "05-biophysics", concept, slug);
}

export function getConcepts(): { concept: string; count: number }[] {
  const by = getClaimsByConcept();
  return Object.entries(by)
    .map(([concept, claims]) => ({ concept, count: claims.length }))
    .sort((a, b) => b.count - a.count);
}
