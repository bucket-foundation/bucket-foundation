import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const STAFF_FLAG = "BKT_INCLUDE_STAFF_DATA";
export const STAFF_FILES = { solvability: "solvability-atlas-data.json", software: "software-atlas-data.json", patents: "patents-design-data.json", similarity: "solvability-similarity-data.json", neighbors: "solvability-neighbors-data.json" } as const;

export function staffData(repo: string, env: Record<string, string | undefined> = process.env): Record<string, unknown> {
  if (env[STAFF_FLAG] !== "1") return {};
  const dir = join(repo, "src/lib/research-os");
  return Object.fromEntries(Object.entries(STAFF_FILES).map(([k, f]) => [k, JSON.parse(readFileSync(join(dir, f), "utf8"))]));
}

if (import.meta.main) {
  const repo = resolve(import.meta.dir, "../../../..");
  const out = resolve(import.meta.dir, "../../content");
  mkdirSync(out, { recursive: true });
  const data = staffData(repo);
  writeFileSync(join(out, "staff-ros.json"), JSON.stringify(data));
  console.log(`staff data: ${Object.keys(data).length ? Object.keys(data).join(", ") : "excluded"}`);
}
