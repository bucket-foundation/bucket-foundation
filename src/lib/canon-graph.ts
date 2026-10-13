import fs from "fs";
import path from "path";
import { buildCanonGraph, NO_CENTRALITY, type CanonGraph, type Centrality, type RawGraph } from "./canon-graph-core";

export type { CanonGraph, GraphEdge, GraphNode } from "./canon-graph-core";

export const GRAPH_FILE = path.join("_intake", "connections", "graph.json");
export const CENTRALITY_FILE = path.join("_intake", "connections", "centrality.json");

export function readCanonGraphInputs(root: string): { graph: RawGraph; centrality: Centrality } | null {
  const graphPath = path.join(root, GRAPH_FILE);
  if (!fs.existsSync(graphPath)) return null;
  const centPath = path.join(root, CENTRALITY_FILE);
  return {
    graph: JSON.parse(fs.readFileSync(graphPath, "utf-8")) as RawGraph,
    centrality: fs.existsSync(centPath) ? (JSON.parse(fs.readFileSync(centPath, "utf-8")) as Centrality) : NO_CENTRALITY,
  };
}

export function getCanonGraph(root: string = process.cwd()): CanonGraph {
  const inputs = readCanonGraphInputs(root);
  return inputs ? buildCanonGraph(inputs.graph, inputs.centrality) : { nodes: [], edges: [] };
}
