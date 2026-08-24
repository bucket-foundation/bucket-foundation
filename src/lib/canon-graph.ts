// canon-graph.ts, server-only loader for the canon collaboration graph.

import fs from "fs";
import path from "path";

export type GraphNode = { id: string; name: string; group: string; centrality: number; edges: number };
export type GraphEdge = { source: string; target: string; weight: number };
export type CanonGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

const REPO_ROOT = path.resolve(process.cwd());

export function getCanonGraph(): CanonGraph {
  const graphPath = path.join(REPO_ROOT, "_intake", "connections", "graph.json");
  const centPath = path.join(REPO_ROOT, "_intake", "connections", "centrality.json");
  if (!fs.existsSync(graphPath)) return { nodes: [], edges: [] };

  const graph = JSON.parse(fs.readFileSync(graphPath, "utf-8")) as {
    nodes: { id: string; name: string; group: string }[];
    edges: { source: string; target: string; weight: number }[];
  };
  const cent = fs.existsSync(centPath)
    ? (JSON.parse(fs.readFileSync(centPath, "utf-8")) as { degree: Record<string, number>; weighted: Record<string, number> })
    : { degree: {}, weighted: {} };

  // Filter nodes to only those that participate in edges
  const inEdge = new Set<string>();
  for (const e of graph.edges) {
    inEdge.add(e.source);
    inEdge.add(e.target);
  }

  const nodes: GraphNode[] = graph.nodes
    .filter((n) => inEdge.has(n.id))
    .map((n) => ({
      id: n.id,
      name: n.name,
      group: n.group,
      centrality: cent.weighted[n.id] || 0,
      edges: cent.degree[n.id] || 0,
    }));

  return { nodes, edges: graph.edges };
}
