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

export const UNCONFIGURED_COPY = {
  title: "Research OS is unavailable on this deployment",
  body: "The graph database is not configured here.",
};

export const OUTAGE_COPY = {
  title: "That could not be read right now",
  body: "The server could not finish the read. Try again in a moment.",
};

/** A 503 that a retry might clear. */
export function isTransientOutage(status: number | null, code: string | null): boolean {
  return status === 503 && Boolean(code) && code !== UNCONFIGURED;
}

/** The `error` code a failed Research OS response carries, if any. */
export async function readErrorCode(res: Response): Promise<string | null> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? null;
}
