/**
 * One HTTP answer for a failed evidence append, so every route that writes
 * a learner's evidence log says the same thing about the same failure.
 *
 * graph.append_evidence bounds its lock wait, so a contended row raises a
 * retryable error rather than holding the request. Five routes let that
 * reach Next's default handler as a bare 500, which tells a caller a wait
 * is a permanent failure (Bucket critic ROS194-27).
 */
import { NextResponse } from "next/server";
import { EvidenceAppendError } from "./db";

const NO_STORE = { "cache-control": "no-store" } as const;

/**
 * The response for an evidence-append failure, or null when the error came
 * from somewhere else and the caller should keep throwing.
 */
export function evidenceErrorResponse(err: unknown): NextResponse | null {
  if (!(err instanceof EvidenceAppendError)) return null;
  if (err.code === "LEARNER_DELETED") {
    return NextResponse.json({ error: "learner_deleted" }, { status: 410, headers: NO_STORE });
  }
  if (err.retryable) {
    return NextResponse.json(
      { error: "busy" },
      { status: 503, headers: { ...NO_STORE, "retry-after": "1" } },
    );
  }
  // A missing function names the migration to apply, and the shaped
  // response cannot carry it, so the server log does.
  console.error(`[research-os] evidence append failed (${err.code ?? "unknown"}): ${err.message}`);
  return NextResponse.json({ error: "evidence_write_failed" }, { status: 500, headers: NO_STORE });
}
