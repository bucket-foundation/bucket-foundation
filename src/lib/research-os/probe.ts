import type { GraphNode, LearnerNodeState } from "./types";

export const MIN_PROBE_QUESTIONS = 3;
export const MAX_PROBE_QUESTIONS = 5;

export function probeDue(ancestorIds: Set<string> | string[], states: LearnerNodeState[]): boolean {
  const ids = ancestorIds instanceof Set ? ancestorIds : new Set(ancestorIds);
  if (ids.size === 0) return false;
  return !states.some((s) => ids.has(s.nodeId));
}

export function selectProbeNodes(nodes: GraphNode[], ancestorIds: Set<string> | string[]): GraphNode[] {
  const ids = ancestorIds instanceof Set ? ancestorIds : new Set(ancestorIds);
  const candidates = nodes
    .filter((n) => ids.has(n.id))
    .sort((a, b) => a.tier - b.tier || a.slug.localeCompare(b.slug));

  if (candidates.length <= MAX_PROBE_QUESTIONS) return candidates;

  const picked: GraphNode[] = [];
  const seen = new Set<string>();
  const span = MAX_PROBE_QUESTIONS - 1;
  for (let i = 0; i < MAX_PROBE_QUESTIONS; i++) {
    const idx = Math.round((i * (candidates.length - 1)) / span);
    const node = candidates[idx];
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    picked.push(node);
  }
  return picked;
}

export interface ProbeQuestion {
  nodeId: string;
  nodeSlug: string;
  nodeTitle: string;
  tier: number;
  prompt: string;
}

export function probeQuestion(node: Pick<GraphNode, "id" | "slug" | "title" | "tier">): ProbeQuestion {
  return {
    nodeId: node.id,
    nodeSlug: node.slug,
    nodeTitle: node.title,
    tier: node.tier,
    prompt: `In your own words, what do you already know about "${node.title}"?`,
  };
}

export function buildProbe(
  nodes: GraphNode[],
  ancestorIds: Set<string> | string[],
  states: LearnerNodeState[],
): { due: boolean; questions: ProbeQuestion[] } {
  const due = probeDue(ancestorIds, states);
  if (!due) return { due, questions: [] };
  return { due, questions: selectProbeNodes(nodes, ancestorIds).map(probeQuestion) };
}
