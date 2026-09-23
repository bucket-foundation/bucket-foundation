import { NextResponse } from "next/server";
import { EvidenceAppendError } from "./db";

const NO_STORE = { "cache-control": "no-store" } as const;

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
  console.error(`[research-os] evidence append failed (${err.code ?? "unknown"}): ${err.message}`);
  return NextResponse.json({ error: "evidence_write_failed" }, { status: 500, headers: NO_STORE });
}
