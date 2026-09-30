import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "..");
const ENTRY = "src/app/canon/search/page.tsx";
const EXTRA_DIRS = ["src/app/api/canon/search"];
const EXTENSIONS = ["", ".ts", ".tsx", ".json", "/index.ts", "/index.tsx"];
const IMPORT = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;

function resolveSpecifier(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join("src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.normalize(path.join(path.dirname(from), spec));
  else return null;
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    const abs = path.join(ROOT, candidate);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return candidate;
  }
  return null;
}

function walk(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
}

export function importSet(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const m of Array.from(text.matchAll(IMPORT))) {
      const next = resolveSpecifier(file, m[1]);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

function canonSet(): Set<string> {
  return importSet([ENTRY, ...EXTRA_DIRS.flatMap(walk)]);
}

function changedFiles(): string[] | null {
  const base = spawnSync("git", ["rev-parse", "--verify", "--quiet", "origin/dev"], { cwd: ROOT });
  if (base.status !== 0) return null;
  const diff = spawnSync("git", ["diff", "--name-only", "origin/dev...HEAD"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(diff.status, 0, diff.stderr);
  const dirty = spawnSync("git", ["diff", "--name-only", "HEAD"], { cwd: ROOT, encoding: "utf8" });
  return [...diff.stdout.split("\n"), ...dirty.stdout.split("\n")].filter(Boolean);
}

test("the canon search import set covers the page, the mount, the globe and the route", () => {
  const set = canonSet();
  assert.ok(set.has("src/app/canon/search/page.tsx"));
  assert.ok(set.has("src/app/canon/CanonGlobeMount.tsx"));
  assert.ok(set.has("src/app/canon/useExplorerState.ts"));
  assert.ok(set.has("src/lib/canon-search.ts"));
  assert.ok(Array.from(set).some((f) => f.startsWith("src/components/canon-globe/")));
  assert.ok(Array.from(set).some((f) => f.startsWith("src/app/api/canon/search/")));
  assert.ok(set.size > 15);
});

test("the explorer files are not part of the canon search import set", () => {
  const set = canonSet();
  for (const f of ["src/app/explore/ExploreShell.tsx", "src/app/explore/ExploreClient.tsx", "src/lib/explore/space.ts", "src/components/explore/SpaceView.tsx"]) assert.ok(!set.has(f), f);
});

test("this branch changes no file in the canon search import set", () => {
  const changed = changedFiles();
  if (changed === null) {
    process.stdout.write("origin/dev is not available, skipping the diff check\n");
    return;
  }
  const set = canonSet();
  const touched = changed.filter((f) => set.has(f));
  assert.deepEqual(touched, []);
});
