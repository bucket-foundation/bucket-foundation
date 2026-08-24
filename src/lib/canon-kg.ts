// canon-kg.ts, server-only loader for the full canon knowledge graph
// summary (1,133 nodes: 599 claims + 105 concepts + 27 bridges +
// 402 authors). Powers /canon/graph (full KG view).

import fs from "fs";
import path from "path";

export type KGNode = {
  id: string;
  kind: "claim" | "concept" | "bridge" | "author";
  // claim
  branch?: string;
  concept?: string;
  slug?: string;
  title?: string;
  predicted_tier?: string;
  confidence_nucleus?: number;
  // bridge
  cluster_id?: number;
  branches?: string[];
  size?: number;
  exemplar?: string;
  // author
  display_name?: string;
  cited_by_count?: number;
  works_count?: number;
  h_index?: number;
};

export type KGSummary = {
  n_nodes: number;
  by_kind: Record<string, number>;
  top_authors_by_citations: KGNode[];
  concepts: KGNode[];
  bridges: KGNode[];
};

const REPO_ROOT = path.resolve(process.cwd());
const SUMMARY_PATH = path.join(REPO_ROOT, "_intake", "training", "kg-summary.json");
const CENTRALITY_PATH = path.join(REPO_ROOT, "_intake", "training", "kg-centrality.md");

let cached: KGSummary | null = null;

export function getKGSummary(): KGSummary {
  if (cached) return cached;
  if (!fs.existsSync(SUMMARY_PATH)) {
    cached = { n_nodes: 0, by_kind: {}, top_authors_by_citations: [], concepts: [], bridges: [] };
    return cached;
  }
  cached = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf-8")) as KGSummary;
  return cached;
}

// Centrality markdown was emitted by agf-build-knowledge-graph;
// parse top-15 author entries by PageRank for the "intellectual hubs" panel.
export function getCentralityTopAuthors(): { name: string; pagerank: number; hIndex: number; citedBy: number }[] {
  if (!fs.existsSync(CENTRALITY_PATH)) return [];
  const raw = fs.readFileSync(CENTRALITY_PATH, "utf-8");
  const section = raw.split("## Top 15 author nodes")[1];
  if (!section) return [];
  const out: { name: string; pagerank: number; hIndex: number; citedBy: number }[] = [];
  for (const line of section.split("\n")) {
    const m = line.match(/\|\s*\d+\s*\|\s*`([^`]+)`\s*\|\s*([\d.]+)\s*\|\s*(.+?)\s*\|/);
    if (!m) continue;
    const detail = m[3];
    const dm = detail.match(/^(.+?)\s*\(h=(\d+),\s*cited=(\d+)\)/);
    if (!dm) continue;
    out.push({
      name: dm[1].trim(),
      pagerank: parseFloat(m[2]),
      hIndex: parseInt(dm[2], 10),
      citedBy: parseInt(dm[3], 10),
    });
  }
  return out;
}

export function getCentralityTopConcepts(): { branch: string; concept: string; pagerank: number }[] {
  if (!fs.existsSync(CENTRALITY_PATH)) return [];
  const raw = fs.readFileSync(CENTRALITY_PATH, "utf-8");
  const section = raw.split("## Top 15 concept nodes")[1];
  if (!section) return [];
  const out: { branch: string; concept: string; pagerank: number }[] = [];
  for (const line of section.split("\n")) {
    const m = line.match(/\|\s*\d+\s*\|\s*`concept:([^/]+)\/([^`]+)`\s*\|\s*([\d.]+)/);
    if (!m) continue;
    out.push({ branch: m[1], concept: m[2], pagerank: parseFloat(m[3]) });
  }
  return out;
}
