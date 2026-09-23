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
  /**
   * null when the connection read failed: unknown, and not zero.
   *
   * These nulls are the whole signal. A `connectionsUnavailable: true`
   * rode alongside them saying the same thing a second way, and every
   * reader here branched on the nulls, so nothing consumed it and the
   * two could drift apart without a test noticing.
   */
  held: number | null;
  bridges: number | null;
  nextBridge: { slug: string; title: string } | null;
}

export interface LoopResponse {
  access: { owned: number; imports: number; pendingRequests: number };
  awareness: { opened: number; atLeastAwareness: number };
  // null when the Academy read did not complete. Zero is the first-run
  // line, so an unknown count and a count of none stay distinguishable.
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

/** The headline for the Internalization column. */
export function internalizationState(internalization: LoopInternalization): string {
  if (internalization.held === null) return "connections unavailable";
  return `${internalization.held} ${internalization.held === 1 ? "connection" : "connections"} held`;
}

/**
 * The second line of that column.
 *
 * An unknown bridge count fell into the same branch as zero bridges, and
 * a learner with nothing internalized yet then read "0 internalized" off
 * a read that never completed: unknown rendered as none (Bucket critic
 * C46). A null count says so whenever there is no other number to show.
 */
export function internalizationDetail(internalization: LoopInternalization): string {
  if (internalization.bridges === null) {
    // Saying only what is known. Falling back to the node count read
    // identically to "no bridges", so the learner could not tell an
    // unfinished read from a frontier with nothing next to it
    // (Bucket critic C69).
    const known = internalization.nodes > 0 ? `${internalization.nodes} internalized · ` : "";
    return `${known}bridges unavailable`;
  }
  if (internalization.bridges > 0) return `${internalization.bridges} ${internalization.bridges === 1 ? "bridge" : "bridges"} one step away`;
  return `${internalization.nodes} internalized`;
}

/** Whether that column reads as lit, with an unknown count counting for nothing. */
export function internalizationLit(internalization: LoopInternalization): boolean {
  return (internalization.held ?? 0) > 0 || internalization.nodes > 0;
}
