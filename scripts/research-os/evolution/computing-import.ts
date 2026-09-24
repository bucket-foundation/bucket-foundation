import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RightsPolicy } from "../../../src/lib/research-os/evidence/rights";
import { planEvolution, type EdgeRef, type EvolutionPlan, type EvolutionSource, type NodeRef } from "../../../src/lib/evolution/importer";
import { endoflifeRecords, endoflifeSeries, ENDOFLIFE_RULE } from "../../../src/lib/evolution/endoflife";
import { softwareLineage, softwareRecords, softwareReleaseSeries, WIKIDATA_SOFTWARE_RULE } from "../../../src/lib/evolution/wikidata-software";
import { graphClient } from "../ingest/lib/medallion-shadow";
import { loadPolicy, ROOT } from "../medallion/lib/repo-io";
import { applyEvolution, readGraph, type EvolutionReport } from "./lib/apply";

export const LABEL = "evolution-computing-import";
export const PREFIX = "_intake/evolution/";
export const PRIOR = 0.8;

export type Feed = "wikidata" | "endoflife";

export interface StagedFile {
  repoPath: string;
  abs: string;
  feed: Feed;
}

export type Mismatch = { repoPath: string; reason: "no_manifest" | "sha256" | "missing_file" };

export function evolutionData(env: Record<string, string | undefined> = process.env): string {
  return env.EVOLUTION_DATA || path.join(ROOT, "_intake", "evolution");
}

export function feedOf(repoPath: string): Feed | null {
  if (/^_intake\/evolution\/wikidata\/software\/[^/]+\.jsonl$/.test(repoPath)) return "wikidata";
  if (/^_intake\/evolution\/endoflife\/products\/[a-z0-9][a-z0-9._+-]{0,99}\.json$/.test(repoPath)) return "endoflife";
  return null;
}

export function stagedFiles(data: string, requested: string[]): StagedFile[] {
  const paths = requested.length
    ? requested
    : [
        ...list(path.join(data, "wikidata", "software")).filter((f) => f.endsWith(".jsonl")).map((f) => `${PREFIX}wikidata/software/${f}`),
        ...list(path.join(data, "endoflife", "products")).filter((f) => f.endsWith(".json")).map((f) => `${PREFIX}endoflife/products/${f}`),
      ];
  return Array.from(new Set(paths))
    .sort()
    .map((repoPath) => {
      const feed = feedOf(repoPath);
      if (!feed) throw new Error(`${repoPath} is not a staged computing feed file`);
      return { repoPath, feed, abs: path.join(data, repoPath.slice(PREFIX.length)) };
    });
}

function list(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}

export function manifestShas(data: string): Map<string, string> {
  const dir = path.join(data, "live", "runs");
  const out = new Map<string, string>();
  for (const name of list(dir).filter((f) => f.endsWith(".json"))) {
    const doc = JSON.parse(readFileSync(path.join(dir, name), "utf8")) as { feeds?: Record<string, { changed?: { path: string; sha256: string }[] }> };
    for (const feed of Object.values(doc.feeds ?? {})) for (const c of feed.changed ?? []) out.set(c.path, c.sha256);
  }
  return out;
}

export function checkManifests(data: string, files: StagedFile[]): Mismatch[] {
  const shas = manifestShas(data);
  const out: Mismatch[] = [];
  for (const f of files) {
    if (!existsSync(f.abs)) {
      out.push({ repoPath: f.repoPath, reason: "missing_file" });
      continue;
    }
    const want = shas.get(f.repoPath);
    if (!want) out.push({ repoPath: f.repoPath, reason: "no_manifest" });
    else if (createHash("sha256").update(readFileSync(f.abs)).digest("hex") !== want) out.push({ repoPath: f.repoPath, reason: "sha256" });
  }
  return out;
}

export interface Graph {
  nodes: NodeRef[];
  edges: EdgeRef[];
  eolToSlug: Map<string, string>;
}

export function planFeeds(files: StagedFile[], graph: Graph, policy: RightsPolicy): Record<Feed, EvolutionPlan | null> {
  const plan = (feed: Feed): EvolutionPlan | null => {
    const mine = files.filter((f) => f.feed === feed);
    if (!mine.length) return null;
    const rule = feed === "wikidata" ? WIKIDATA_SOFTWARE_RULE : ENDOFLIFE_RULE;
    const sources: EvolutionSource[] = mine.map((f) => ({ repoPath: f.repoPath, rule, prior: PRIOR }));
    const texts = new Map(mine.map((f) => [f.repoPath, readFileSync(f.abs)]));
    const base = { sources, files: texts, policy, nodes: graph.nodes, edges: graph.edges };
    const built =
      feed === "wikidata"
        ? planEvolution({ ...base, records: softwareRecords, edgeCandidates: softwareLineage, series: softwareReleaseSeries })
        : planEvolution({ ...base, records: endoflifeRecords(graph.eolToSlug), series: endoflifeSeries(graph.eolToSlug) });
    return { ...built, promotions: [] };
  };
  return { wikidata: plan("wikidata"), endoflife: plan("endoflife") };
}

export interface ImportReport {
  apply: boolean;
  files: number;
  plans: Partial<Record<Feed, Record<string, number>>>;
  applied: Partial<Record<Feed, EvolutionReport>>;
}

export async function runComputingImport(
  svc: SupabaseClient,
  options: { apply: boolean; paths: string[]; data?: string; policy?: { policy: RightsPolicy; sha256: string } },
): Promise<ImportReport | { mismatches: Mismatch[] }> {
  const data = options.data ?? evolutionData();
  const files = stagedFiles(data, options.paths);
  const mismatches = checkManifests(data, files);
  if (mismatches.length) return { mismatches };
  const { policy, sha256 } = options.policy ?? loadPolicy();
  const graph = await readGraph(svc);
  const plans = planFeeds(files, graph, policy);
  const report: ImportReport = { apply: options.apply, files: files.length, plans: {}, applied: {} };
  for (const feed of ["wikidata", "endoflife"] as const) {
    const p = plans[feed];
    if (!p) continue;
    report.plans[feed] = { ...p.counts, promotions: p.promotions.length };
    if (options.apply) report.applied[feed] = await applyEvolution(svc, p, { sha256, status: policy.status });
  }
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const paths = args.filter((a) => !a.startsWith("--"));
  const data = evolutionData();
  const mismatches = checkManifests(data, stagedFiles(data, paths));
  if (mismatches.length) {
    console.error(`[${LABEL}] manifest mismatch, nothing written: ${mismatches.map((m) => `${m.repoPath} (${m.reason})`).join("; ")}`);
    process.exit(2);
  }
  const out = await runComputingImport(graphClient(LABEL), { apply, paths, data });
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[${LABEL}] FAILED:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
