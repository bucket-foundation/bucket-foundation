export const UNCONFIGURED = "research_os_unavailable";

export const TRANSIENT_CODES: ReadonlySet<string> = new Set([
  "busy",
  "node_read_failed",
  "profile_unavailable",
  "eligibility_unavailable",
  "access_unavailable",
  "class_read_failed",
  "consent_unavailable",
  "graph_read_failed",
  "loop_unavailable",
  "stage_read_failed",
  "corpus_read_failed",
  "graph_unavailable",
]);

export const PERMANENT_CODES: ReadonlySet<string> = new Set([UNCONFIGURED, "corpus_unavailable"]);

export const PERMANENT_MESSAGE = /enabled yet|credentials are invalid|not_configured/;

export const UNCONFIGURED_COPY = {
  title: "Research OS is unavailable on this deployment",
  body: "The graph database is not configured here.",
};

export const OUTAGE_COPY = {
  title: "That could not be read right now",
  body: "The server could not finish the read. Try again in a moment.",
};

export function isTransientOutage(status: number | null, code: string | null): boolean {
  if (status !== 503) return false;
  if (code === null || code === "") return true;
  if (TRANSIENT_CODES.has(code)) return true;
  if (PERMANENT_CODES.has(code) || PERMANENT_MESSAGE.test(code)) return false;
  return true;
}

export async function readErrorCode(res: Response): Promise<string | null> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? null;
}
