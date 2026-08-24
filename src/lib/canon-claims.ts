// canon-claims.ts, server-only filesystem scanner for
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
const CANON_ROOT = path.join(REPO_ROOT, "bucket-canon");
// All branch dirs that match `\d{2}-*` and contain a `sub-claims/` folder.
function getBranchDirs(): { branch: string; root: string }[] {
  if (!fs.existsSync(CANON_ROOT)) return [];
  const out: { branch: string; root: string }[] = [];
  for (const d of fs.readdirSync(CANON_ROOT)) {
    if (!/^\d{2}-/.test(d)) continue;
    const sc = path.join(CANON_ROOT, d, "sub-claims");
    if (fs.existsSync(sc) && fs.statSync(sc).isDirectory()) {
      out.push({ branch: d, root: sc });
    }
  }
  return out.sort((a, b) => a.branch.localeCompare(b.branch));
}

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

  // Provenance, video slug
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
  const out: ClaimCard[] = [];
  for (const { branch, root } of getBranchDirs()) {
    for (const concept of fs.readdirSync(root)) {
      const conceptDir = path.join(root, concept);
      if (!fs.statSync(conceptDir).isDirectory()) continue;
      for (const file of fs.readdirSync(conceptDir)) {
        if (!file.endsWith(".md") || file === "INDEX.md") continue;
        const slug = file.replace(/\.md$/, "");
        const c = parseClaimMd(path.join(conceptDir, file), branch, concept, slug);
        if (c) out.push(c);
      }
    }
  }
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
  for (const { branch, root } of getBranchDirs()) {
    const file = path.join(root, concept, `${slug}.md`);
    if (fs.existsSync(file)) return parseClaimMd(file, branch, concept, slug);
  }
  return null;
}

export function getConcepts(): { concept: string; count: number }[] {
  const by = getClaimsByConcept();
  return Object.entries(by)
    .map(([concept, claims]) => ({ concept, count: claims.length }))
    .sort((a, b) => b.count - a.count);
}

// Map a `/canon/<slug>` route slug to the on-disk branch directory name.
// Same mapping as src/lib/canon.ts DIR_TO_SLUG, inverted. Kept as a local
// copy so this file stays standalone-importable.
const BRANCH_SLUG_TO_DIR: Record<string, string> = {
  "mathematics":   "01-mathematics",
  "physics":       "02-physics",
  "chemistry":     "03-chemistry",
  "information":   "04-information",
  "biophysics":    "05-biophysics",
  "cosmology":     "06-cosmology",
  "mind":          "07-mind",
  "deep-history":  "08-deep-history",
  "art":           "09-art",
  "sacred-texts":  "09-sacred-texts",
  "earth":         "10-earth",
};

/** Return all claims for one branch (by canon route slug), grouped by concept. */
export function getClaimsForBranch(branchSlug: string): {
  total: number;
  concepts: { concept: string; claims: ClaimCard[] }[];
} {
  const dir = BRANCH_SLUG_TO_DIR[branchSlug];
  if (!dir) return { total: 0, concepts: [] };
  const all = getAllClaims().filter((c) => c.branch === dir);
  if (all.length === 0) return { total: 0, concepts: [] };
  const by: Record<string, ClaimCard[]> = {};
  for (const c of all) (by[c.concept] ||= []).push(c);
  const concepts = Object.entries(by)
    .map(([concept, claims]) => ({
      concept,
      claims: claims.sort((a, b) => b.score - a.score),
    }))
    .sort((a, b) => b.claims.length - a.claims.length);
  return { total: all.length, concepts };
}
