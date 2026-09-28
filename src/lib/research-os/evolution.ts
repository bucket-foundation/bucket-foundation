import type { EdgeKind, NodeKind } from "./types";

export const EVOLUTION_NODE_KINDS = ["occupation", "task", "technology", "software", "discovery", "topic"] as const satisfies readonly NodeKind[];
export type EvolutionNodeKind = (typeof EVOLUTION_NODE_KINDS)[number];

export const EVOLUTION_EDGE_KINDS = [
  "performs",
  "uses",
  "automates",
  "enables",
  "replaces",
  "descends_from",
  "influences",
  "part_of",
  "maps_to",
] as const satisfies readonly EdgeKind[];
export type EvolutionEdgeKind = (typeof EVOLUTION_EDGE_KINDS)[number];

export const EVOLUTION_LEVELS: Record<EvolutionNodeKind, readonly string[]> = {
  occupation: ["onet", "isco_unit", "hisco_micro"],
  task: ["onet_task", "dwa", "iwa", "gwa", "factor"],
  technology: ["class", "artifact"],
  software: ["os", "language", "package", "application"],
  discovery: ["finding", "work"],
  topic: ["openalex_topic"],
};

export const EDGE_FACTOID_ROLES = ["began", "ended", "measured"] as const;

export const NODE_FACTOID_ROLES: Record<EvolutionNodeKind, readonly string[]> = {
  occupation: ["emerged", "declined"],
  task: ["emerged", "declined"],
  technology: ["invented", "adopted", "declined"],
  software: ["released", "adopted", "declined", "retired"],
  discovery: ["discovered", "published"],
  topic: ["emerged"],
};

export function isEvolutionNodeKind(kind: string): kind is EvolutionNodeKind {
  return (EVOLUTION_NODE_KINDS as readonly string[]).includes(kind);
}

export function isEvolutionEdgeKind(kind: string): kind is EvolutionEdgeKind {
  return (EVOLUTION_EDGE_KINDS as readonly string[]).includes(kind);
}

export function evolutionEdgeFits(kind: string, from: string, to: string): boolean {
  switch (kind) {
    case "performs":
      return from === "occupation" && to === "task";
    case "uses":
      return (from === "occupation" && (to === "task" || to === "software")) || ((from === "technology" || from === "software") && (to === "technology" || to === "software"));
    case "automates":
      return (from === "technology" || from === "software") && to === "task";
    case "enables":
      return (from === "discovery" || from === "technology") && (to === "technology" || to === "software");
    case "replaces":
      return from === to && isEvolutionNodeKind(from);
    case "descends_from":
      return from === to && (from === "software" || from === "technology");
    case "influences":
      return from === "software" && to === "software";
    case "part_of":
      return from === "task" && to === "task";
    case "maps_to":
      return (from === "occupation" && to === "occupation") || ((from === "discovery" || from === "technology") && (to === "topic" || to === "technology"));
    default:
      return true;
  }
}

export function edgeSubject(edgeId: string): string {
  return `edge:${edgeId}`;
}

export function parseEdgeSubject(subject: string): string | null {
  const m = /^edge:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(subject);
  return m ? m[1] : null;
}
