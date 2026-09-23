export interface LoopInternalization {
  nodes: number;
  held: number | null;
  bridges: number | null;
  nextBridge: { slug: string; title: string } | null;
}

export interface LoopResponse {
  access: { owned: number; imports: number; pendingRequests: number };
  awareness: { opened: number; atLeastAwareness: number };
  understanding: { nodes: number; decksStarted: number | null };
  internalization: LoopInternalization;
  production: {
    drafts: number;
    submitted: number;
    accepted: number;
    returned: number;
    nodes: number;
    latest: { id: string; status: string; kind: string; claim: string | null } | null;
  };
  empty: boolean;
}

export function internalizationState(internalization: LoopInternalization): string {
  if (internalization.held === null) return "connections unavailable";
  return `${internalization.held} ${internalization.held === 1 ? "connection" : "connections"} held`;
}

export function internalizationDetail(internalization: LoopInternalization): string {
  if (internalization.bridges === null) {
    const known = internalization.nodes > 0 ? `${internalization.nodes} internalized · ` : "";
    return `${known}bridges unavailable`;
  }
  if (internalization.bridges > 0) return `${internalization.bridges} ${internalization.bridges === 1 ? "bridge" : "bridges"} one step away`;
  return `${internalization.nodes} internalized`;
}

export function internalizationLit(internalization: LoopInternalization): boolean {
  return (internalization.held ?? 0) > 0 || internalization.nodes > 0;
}
