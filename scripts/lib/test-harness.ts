import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { GraphEdge, GraphNode } from "../../src/lib/research-os/types";

const ROOT = path.join(__dirname, "..", "..");

export const TEST_DB =
  process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export const SEED_PATH = path.join(ROOT, "supabase", "seed", "research-os-sky-blue.json");

export interface SeedNode {
  slug: string;
  title: string;
  kind: GraphNode["kind"];
  tier: number;
  branch: string;
  summary: string;
}

export interface SeedEdge {
  from: string;
  to: string;
  kind: GraphEdge["kind"];
}

export interface Seed {
  target_slug: string;
  nodes: SeedNode[];
  edges: SeedEdge[];
}

export function loadSeed(): Seed {
  return JSON.parse(fs.readFileSync(SEED_PATH, "utf8")) as Seed;
}

export function loadLocalEnv(): void {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export function sql(statement: string): { status: number; out: string } {
  const run = spawnSync("psql", [TEST_DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" });
  return { status: run.status ?? 1, out: (run.stdout || "").trim() + (run.stderr || "") };
}

export function openLaunchScope(): () => void {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const scope = require("../../src/lib/research-os/launch-scope") as Record<string, unknown>;
  const closed = scope.inLaunchScope;
  scope.inLaunchScope = () => true;
  return () => {
    scope.inLaunchScope = closed;
  };
}
