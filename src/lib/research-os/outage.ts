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
 * The 503 codes a retry might clear, each one emitted by a route in this
 * tree.
 *
 * The first version of this rule said the opposite: any 503 whose code
 * was not `research_os_unavailable` was transient. Every other 503 in
 * the tree is a permanent misconfiguration, and each would have rendered
 * "Try again in a moment" with a retry button for a state no retry
 * clears. Naming what is transient fails safe. Naming what is permanent
 * fails toward a button that does nothing.
 *
 * The second version named six codes and four of them were emitted by
 * nothing. They were written for routes on branches that have not
 * landed, so the effective rule on most clients was "a 503 with no
 * body", and `busy`, the one live retryable code, reached five clients
 * that consulted no rule at all. The set holds what ships:
 *
 *   busy              a Postgres lock wait, sent with retry-after: 1 by
 *                     override/route.ts, review/route.ts and
 *                     evidence-errors.ts, which probe, production, state
 *                     and review all answer through.
 *   node_read_failed  node/route.ts, a failed read of one node.
 *
 * `scripts/test-research-os-outage.ts` checks the set against the tree
 * in both directions, so a code a route emits and nobody classified
 * fails, and so does an entry here that no route emits.
 */
export const TRANSIENT_CODES: ReadonlySet<string> = new Set([
  "busy",
  "node_read_failed",
  // ros-ai-find. Both say a read did not complete this minute and the
  // search is off until it does.
  "profile_unavailable",
  "eligibility_unavailable",
  // A corpus file that could not be read this minute. The corpus that was
  // never built is corpus_unavailable, below, and that one stays.
  "corpus_read_failed",
]);

/**
 * Codes that name a state of the deployment rather than of this minute.
 * `research_os_unavailable` is the original; `corpus_unavailable` says
 * the evidence corpus was never built on this server, which no retry
 * builds. A code here is refused a retry the same way the permanent
 * message bodies are.
 */
export const PERMANENT_CODES: ReadonlySet<string> = new Set([UNCONFIGURED, "corpus_unavailable"]);

/** The 503 bodies that name a key or a vendor nobody configured. Each is
 * a sentence, and no retry clears any of them. */
export const PERMANENT_MESSAGE = /enabled yet|credentials are invalid|not_configured/;

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
  if (TRANSIENT_CODES.has(code)) return true;
  if (PERMANENT_CODES.has(code) || PERMANENT_MESSAGE.test(code)) return false;
  // A code nobody classified. Falling to the permanent copy here tells a
  // reader their install has no graph, which is a statement about the
  // deployment drawn from a code no one has looked at. Offering a retry
  // costs one request and says only what is known.
  //
  // The gate keeps this branch unreachable for routes in this tree: a
  // 503 code a route emits and the set does not name fails
  // scripts/test-research-os-outage.ts. It stays for a proxy, a newer
  // deployment, or a route on a branch that has not landed.
  return true;
}

/** The `error` code a failed Research OS response carries, if any. */
export async function readErrorCode(res: Response): Promise<string | null> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? null;
}
