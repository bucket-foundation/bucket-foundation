import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export const UI_BUDGET_BYTES = 8 * 1024 * 1024;
export const THREE_MARK = "WebGLRenderer";

export function dirBytes(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    total += s.isDirectory() ? dirBytes(p) : s.size;
  }
  return total;
}

if (import.meta.main) {
  const bytes = dirBytes(resolve(import.meta.dir, "../dist"));
  console.log(`bkt-ui dist: ${(bytes / 1024).toFixed(1)} KB of ${UI_BUDGET_BYTES / 1024 / 1024} MB`);
  if (bytes > UI_BUDGET_BYTES) process.exit(1);
  if (readFileSync(resolve(import.meta.dir, "../dist/assets/app.js"), "utf8").includes(THREE_MARK)) {
    console.error("the 3D library is in the entry script; it must stay in a chunk that loads on demand");
    process.exit(1);
  }
}
