// canon-fs.ts — server-only filesystem scanner for bucket-canon/.
// The repo is the CMS. No DB. Read at build time from src/app server components.

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export type BranchStatus =
  | "not yet opened"
  | "intake"
  | "scaffolded"
  | "in progress"
  | "complete";

export type CanonRow = {
  // raw values pulled from a CANON_INDEX.md table row
  cells: string[];
  // best-guess title (first non-empty cell)
  title: string;
  // best-guess year (first 4-digit token)
  year: string | null;
  subfolder: string;
  branch: string;
  // a stable bibkey-ish slug
  bibkey: string;
};

export type Branch = {
  num: string;          // "01", "02", "03"…
  numeral: string;      // "I", "II"…
  slug: string;         // "mathematics"
  dir: string;          // "01-mathematics"
  name: string;         // display name
  exists: boolean;
  status: BranchStatus;
  entryCount: number;
  lastUpdated: string | null; // ISO date
  readme: string | null;
  topEntries: CanonRow[];
  subfolders: string[];
};

const ROMAN = ["", "I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

export const CANONICAL_BRANCHES: Array<{ num: string; slug: string; name: string }> = [
  { num: "01", slug: "mathematics",   name: "mathematics" },
  { num: "02", slug: "physics",       name: "physics" },
  { num: "03", slug: "chemistry",     name: "chemistry" },
  { num: "04", slug: "information",   name: "information" },
  { num: "05", slug: "biophysics",    name: "biophysics" },
  { num: "06", slug: "cosmology",     name: "cosmology" },
  { num: "07", slug: "mind",          name: "mind" },
  { num: "08", slug: "deep-history",  name: "deep history" },
  { num: "09", slug: "art",           name: "art" },
  { num: "09", slug: "sacred-texts",  name: "sacred texts" },
];

const REPO_ROOT = path.resolve(process.cwd());
const CANON_ROOT = path.join(REPO_ROOT, "bucket-canon");

function safeExists(p: string): boolean {
  try { return fs.existsSync(p); } catch { return false; }
}

function safeRead(p: string): string | null {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}

function listDirs(p: string): string[] {
  try {
    return fs.readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch { return []; }
}

// Parse markdown tables. Returns an array of tables, each table = rows of cells.
export function parseMarkdownTables(md: string): string[][][] {
  const lines = md.split(/\r?\n/);
  const tables: string[][][] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const tbl: string[][] = [splitRow(line)];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tbl.push(splitRow(lines[i]));
        i++;
      }
      tables.push(tbl);
    } else {
      i++;
    }
  }
  return tables;
}

function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, "").replace(/\|\s*$/, "");
  return t.split("|").map((c) => c.trim());
}

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[`*_[\]()<>]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extractRowsFromIndex(md: string, branchDir: string, subfolder: string): CanonRow[] {
  const tables = parseMarkdownTables(md);
  const rows: CanonRow[] = [];
  for (const t of tables) {
    if (t.length < 2) continue;
    // skip header
    for (let i = 1; i < t.length; i++) {
      const cells: string[] = t[i];
      if (cells.length < 2) continue;
      const firstReal = cells.find((c) => c.length > 0) || "";
      if (!firstReal) continue;
      // Heuristic: skip rows that are clearly not entries (e.g., "Sub-folder | Scope | Index" master list)
      const yearMatch = cells.join(" ").match(/\b(1[5-9]\d{2}|20\d{2})\b/);
      rows.push({
        cells,
        title: firstReal.replace(/`/g, "").trim(),
        year: yearMatch ? yearMatch[1] : null,
        subfolder,
        branch: branchDir,
        bibkey: slugify(firstReal) || "entry",
      });
    }
  }
  return rows;
}

function gitLastUpdated(absPath: string): string | null {
  try {
    const out = execSync(`git log -1 --format=%aI -- "${absPath}"`, {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim();
    return out || null;
  } catch { return null; }
}

function computeStatus(branchAbs: string, subfolders: string[]): BranchStatus {
  if (!safeExists(branchAbs)) return "not yet opened";
  const readme = safeExists(path.join(branchAbs, "README.md"));
  const masterIndex = safeExists(path.join(branchAbs, "CANON_INDEX.md"));
  if (!readme && !masterIndex) return "intake";
  const realSubs = subfolders.filter((s) => !s.startsWith("_"));
  if (realSubs.length === 0) return readme ? "scaffolded" : "intake";
  let withIndex = 0;
  let nonEmpty = 0;
  for (const s of realSubs) {
    const sub = path.join(branchAbs, s);
    if (safeExists(path.join(sub, "CANON_INDEX.md"))) withIndex++;
    const files = (() => { try { return fs.readdirSync(sub); } catch { return []; } })();
    if (files.length > 0) nonEmpty++;
  }
  if (withIndex === 0 && nonEmpty === 0) return "scaffolded";
  if (withIndex < realSubs.length) return "in progress";
  if (nonEmpty < realSubs.length) return "in progress";
  return "complete";
}

function discoverBranchDirs(): string[] {
  if (!safeExists(CANON_ROOT)) return [];
  return fs.readdirSync(CANON_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
    .map((d) => d.name)
    .sort();
}

export function getBranches(): Branch[] {
  const onDisk = discoverBranchDirs();
  const seen = new Set<string>();
  const result: Branch[] = [];

  // First, every disk branch
  for (const dir of onDisk) {
    const num = dir.slice(0, 2);
    const slug = dir.slice(3);
    seen.add(dir);
    result.push(buildBranch(num, slug, dir));
  }

  // Then any canonical branches not on disk
  for (const c of CANONICAL_BRANCHES) {
    const dir = `${c.num}-${c.slug}`;
    if (seen.has(dir)) continue;
    result.push({
      num: c.num,
      numeral: ROMAN[parseInt(c.num, 10)] || c.num,
      slug: c.slug,
      dir,
      name: c.name,
      exists: false,
      status: "not yet opened",
      entryCount: 0,
      lastUpdated: null,
      readme: null,
      topEntries: [],
      subfolders: [],
    });
  }

  // Sort by num then slug
  result.sort((a, b) => a.num.localeCompare(b.num) || a.slug.localeCompare(b.slug));
  return result;
}

function buildBranch(num: string, slug: string, dir: string): Branch {
  const abs = path.join(CANON_ROOT, dir);
  const subs = listDirs(abs);
  const realSubs = subs.filter((s) => !s.startsWith("_") && !s.startsWith("."));
  const status = computeStatus(abs, subs);
  const readme = safeRead(path.join(abs, "README.md"));
  const lastUpdated = gitLastUpdated(abs);

  // Walk every CANON_INDEX.md across sub-folders to count entries and grab top-3
  const allRows: CanonRow[] = [];
  const masterIdx = safeRead(path.join(abs, "CANON_INDEX.md"));
  if (masterIdx) {
    allRows.push(...extractRowsFromIndex(masterIdx, dir, ""));
  }
  for (const s of realSubs) {
    const subIdx = safeRead(path.join(abs, s, "CANON_INDEX.md"));
    if (subIdx) {
      allRows.push(...extractRowsFromIndex(subIdx, dir, s));
    }
  }

  // Heuristic: drop rows whose first cell looks like a sub-folder pointer
  // (master CANON_INDEX has a "Sub-folder | Scope | Index" table)
  const filtered = allRows.filter((r) => !/^[`]?[a-z0-9_-]+\/[`]?$/i.test(r.title));

  // Display name: prefer slug→title-case
  const displayName = slug.replace(/-/g, " ");

  return {
    num,
    numeral: ROMAN[parseInt(num, 10)] || num,
    slug,
    dir,
    name: displayName,
    exists: true,
    status,
    entryCount: filtered.length,
    lastUpdated,
    readme,
    topEntries: filtered.slice(0, 3),
    subfolders: realSubs,
  };
}

export function getBranch(slug: string): Branch | undefined {
  return getBranches().find((b) => b.slug === slug);
}

export function getBranchEntries(slug: string): CanonRow[] {
  const b = getBranch(slug);
  if (!b || !b.exists) return [];
  const abs = path.join(CANON_ROOT, b.dir);
  const all: CanonRow[] = [];
  const master = safeRead(path.join(abs, "CANON_INDEX.md"));
  if (master) all.push(...extractRowsFromIndex(master, b.dir, ""));
  for (const s of b.subfolders) {
    const sub = safeRead(path.join(abs, s, "CANON_INDEX.md"));
    if (sub) all.push(...extractRowsFromIndex(sub, b.dir, s));
  }
  return all.filter((r) => !/^[`]?[a-z0-9_-]+\/[`]?$/i.test(r.title));
}
