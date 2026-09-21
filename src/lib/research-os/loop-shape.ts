/**
 * The shape `/api/research-os/loop` answers with, and the one piece of
 * copy that reads a nullable count.
 *
 * The route and the panel both import this. They used to declare the
 * shape twice, so making the connection counts nullable on the route
 * left the panel rendering the string "null connections held" to the
 * learner (Bucket critic C31). One declaration makes that a compile
 * error instead.
 */

export interface LoopInternalization {
  nodes: number;
  /** null when the connection read failed: unknown rather than zero. */
  held: number | null;
  bridges: number | null;
  nextBridge: { slug: string; title: string } | null;
  connectionsUnavailable?: boolean;
}

export interface LoopResponse {
  access: { owned: number; imports: number; pendingRequests: number };
  awareness: { opened: number; atLeastAwareness: number };
  understanding: { nodes: number; decksStarted: number };
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

/** The headline for the Internalization column. */
export function internalizationState(internalization: LoopInternalization): string {
  if (internalization.held === null) return "connections unavailable";
  return `${internalization.held} ${internalization.held === 1 ? "connection" : "connections"} held`;
}

/**
 * The second line of that column. An unknown bridge count used to fall
 * into the same branch as zero bridges, which is the point this file
 * exists to make (Bucket critic C46).
 */
export function internalizationDetail(internalization: LoopInternalization): string {
  if (internalization.bridges === null) return `${internalization.nodes} internalized`;
  if (internalization.bridges > 0) return `${internalization.bridges} ${internalization.bridges === 1 ? "bridge" : "bridges"} one step away`;
  return `${internalization.nodes} internalized`;
}

/** Whether that column reads as lit, with an unknown count counting for nothing. */
export function internalizationLit(internalization: LoopInternalization): boolean {
  return (internalization.held ?? 0) > 0 || internalization.nodes > 0;
}
