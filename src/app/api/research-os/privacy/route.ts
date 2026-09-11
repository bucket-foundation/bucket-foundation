/**
 * POST /api/research-os/privacy, the minors compliance pack's export and
 * delete route (bkt-ros ros-07, task item 2). Backs the two rights
 * _intake/research-os-k12/04-compliance-distribution.md names directly:
 * COPPA's deletion-on-parent-request obligation (section 1) and the
 * several state laws' parent/guardian right to inspect and delete data
 * (Illinois SOPPA, Texas Student Privacy Act, Colorado HB 16-1423, all
 * section 2).
 *
 * Request: { action: "export" | "delete", learnerId?: string, confirm?: string }
 *   learnerId is optional and self-defaulting: omit it to act on the
 *   caller's own data (self-gated). A different learnerId is honored only
 *   when the caller is on the reviewer allowlist (src/lib/research-os/
 *   reviewer.ts), the "reviewer- or self-gated" rule this route
 *   implements, e.g. a teacher or admin processing a parent's or
 *   district's request on a specific learner's behalf.
 *
 *   confirm is required for action "delete" and ignored for "export": it
 *   must equal src/lib/research-os/types.ts's DELETE_CONFIRM_TOKEN exactly
 *   (src/lib/research-os/privacy.ts's isDeleteConfirmed), checked in code
 *   before resolvePrivacyActor even runs, so no client path (a stale UI
 *   build, a hand-crafted request, a future caller of this route) can
 *   trigger an irreversible delete without the confirm step. Missing or
 *   mismatched -> 400 "confirm_required", nothing deleted.
 *
 * export -> 200 { learnerId, exportedAt, tables: { <table label>: [...] } }
 *   Every row across every table in learning/research-os/compliance/
 *   DATA-INVENTORY.md belonging to that learner, as JSON. See
 *   src/lib/research-os/privacy.ts's PRIVACY_TABLES for the exact table
 *   list and buildExportEnvelope for the scoping guarantee.
 *
 * delete -> 200 { learnerId, deletedAt, deleted: { <table label>: count } }
 *   Hard-deletes the same rows in one transaction (graph.
 *   privacy_delete_learner, a Postgres function, see this repo's migration
 *   20260910040000_research_os_privacy_consent.sql) and writes one audit
 *   row to graph.privacy_events (learner id hash only, never the raw id).
 *   Irreversible; there is no soft-delete or undo path in this route.
 *
 * Auth: Authorization: Bearer <supabase access token>, required for both
 * actions. See src/lib/research-os/privacy.ts's resolvePrivacyActor for
 * the exact self-vs-reviewer resolution rule. The resolved actor (not just
 * the target learner id) is passed into exportLearnerData/deleteLearnerData
 * below, so a reviewer-invoked call is always distinguishable in the
 * graph.privacy_events audit row from the learner's own self-request: a
 * reviewer cannot act on a learner's behalf without that fact being logged.
 */
import { NextRequest, NextResponse } from "next/server";
import { deleteLearnerData, exportLearnerData, isDeleteConfirmed, privacyConfigured, resolvePrivacyActor } from "@/lib/research-os/privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

interface PrivacyBody {
  action?: "export" | "delete";
  learnerId?: string;
  confirm?: string;
}

export async function POST(req: NextRequest) {
  if (!privacyConfigured()) return bad(503, "research_os_unavailable");

  let body: PrivacyBody;
  try {
    body = (await req.json()) as PrivacyBody;
  } catch {
    return bad(400, "bad_request");
  }
  if (body.action !== "export" && body.action !== "delete") {
    return bad(400, 'action must be "export" or "delete"');
  }

  // Checked before any auth resolution or DB call: an irreversible delete
  // requires the exact confirm token, in code, not only in whatever UI
  // happens to call this route (task item 2, "the confirm cannot be
  // skipped server-side"). See src/lib/research-os/privacy.ts's
  // isDeleteConfirmed.
  if (body.action === "delete" && !isDeleteConfirmed(body)) {
    return bad(400, "confirm_required");
  }

  // Resolved BEFORE dispatch: a caller may always act on their own id, and
  // may act on a different id only when they are a verified reviewer (see
  // resolvePrivacyActor's own doc comment). Any failure here is 401,
  // undifferentiated by design.
  const actor = await resolvePrivacyActor(req, body.learnerId);
  if (!actor) return bad(401, "unauthorized");

  if (body.action === "export") {
    const envelope = await exportLearnerData(actor);
    return NextResponse.json(envelope, { headers: { "cache-control": "no-store" } });
  }

  try {
    const result = await deleteLearnerData(actor);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch {
    return bad(500, "delete_failed");
  }
}
