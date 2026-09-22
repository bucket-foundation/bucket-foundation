/**
 * Telling a transient outage apart from a deployment with no graph
 * behind it.
 *
 * Every Research OS route answers 503 for both. `research_os_unavailable`
 * means this deployment was never configured and no retry will help;
 * every other code at 503 means a read failed this minute. A client that
 * reads only the status renders the permanent copy for both, so a
 * learner is told their install is broken and offered nothing to do
 * (Bucket critic C44, C59, C73).
 *
 * The rule lived in two clients and four more had the defect. It lives
 * here now, and `scripts/test-research-os-outage.ts` asserts every
 * client that renders a 503 reads a code.
 */

/** The one code that means the deployment has no graph behind it. */
export const UNCONFIGURED = "research_os_unavailable";

/**
 * The 503 codes a retry might clear, named one by one.
 *
 * The first version of this rule said the opposite: any 503 whose code
 * was not `research_os_unavailable` was transient. Every other 503 in
 * the tree is a permanent misconfiguration, six of them, and each would
 * have rendered "Try again in a moment" with a retry button for a state
 * no retry clears. Naming what is transient fails safe; naming what is
 * permanent fails toward a button that does nothing.
 */
export const TRANSIENT_CODES: ReadonlySet<string> = new Set([
  "busy",
  "access_unavailable",
  "loop_unavailable",
  "graph_read_failed",
  "node_read_failed",
  "consent_unavailable",
]);

export const UNCONFIGURED_COPY = {
  title: "Research OS is unavailable on this deployment",
  body: "The graph database is not configured here.",
};

export const OUTAGE_COPY = {
  title: "That could not be read right now",
  body: "The server could not finish the read. Try again in a moment.",
};

/**
 * A 503 that a retry might clear.
 *
 * A 503 with no code at all comes from a gateway, a CDN or the platform
 * rather than from a route, and those pass. Requiring a code made every
 * one of them render as an install that was never configured.
 */
export function isTransientOutage(status: number | null, code: string | null): boolean {
  if (status !== 503) return false;
  if (code === null || code === "") return true;
  return TRANSIENT_CODES.has(code);
}

/** The `error` code a failed Research OS response carries, if any. */
export async function readErrorCode(res: Response): Promise<string | null> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? null;
}
