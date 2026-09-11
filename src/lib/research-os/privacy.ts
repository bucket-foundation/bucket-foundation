/**
 * Research OS for K-12, minors compliance pack part A (bkt-ros ros-07,
 * task item 2). Backs POST /api/research-os/privacy
 * (src/app/api/research-os/privacy/route.ts) and the two actions it
 * exposes: export (every row belonging to one learner, as JSON) and delete
 * (a hard, one-transaction delete of the same rows, with an audit row).
 *
 * See learning/research-os/compliance/DATA-INVENTORY.md for why each table
 * below is in scope and what legal basis it is collected under; this file
 * is the code that acts on that inventory. PRIVACY_TABLES is kept in sync
 * with DATA-INVENTORY.md's table list by scripts/test-research-os-
 * privacy.ts's own cross-check test.
 *
 * TESTING NOTE (read before changing PRIVACY_TABLES or the delete function
 * name): this repo has no live-database test harness, every test under
 * scripts/test-research-os-*.ts runs against plain fixture objects, no
 * network, matching src/lib/research-os/frontier.ts and engine-bridge.ts's
 * own convention. The functions below that touch Supabase
 * (exportLearnerData, deleteLearnerData) go untested directly here, the
 * same as every other DB-touching function in db.ts; they are thin,
 * and every non-trivial decision inside them (which tables, which column,
 * how a hash is computed, how rows get scoped to one learner) is factored
 * into the pure functions below instead, which ARE tested:
 * buildExportEnvelope, hashLearnerId, simulateLearnerDelete.
 * simulateLearnerDelete is a pure, in-memory mirror of graph.
 * privacy_delete_learner's table list and semantics, defined in
 * supabase/migrations/20260910040000_research_os_privacy_consent.sql and
 * extended (check_attempts, the 24-hour purge sweep) by
 * 20260910070000_research_os_check_attempts.sql, used to verify the table
 * list stays in sync and to exercise the "zero
 * rows left, one audit row, another learner untouched" behavior this
 * bead's task requires a test for, offline. The real delete always runs
 * through the RPC, which is the actual one-transaction guarantee (a
 * plpgsql function body is one Postgres transaction by construction; nothing
 * client-side can offer that over plain REST calls to more than one table).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { configured, graphService, verifyLearnerIdentity } from "./db";
import { verifyReviewer } from "./reviewer";
import { DELETE_CONFIRM_TOKEN } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _bucketSvc: SupabaseClient | null = null;
/** Service-role client bound to the private `bucket` schema (memoized),
 * the Academy tables' home (supabase/migrations/20260612000000_academy_
 * progress.sql, .../20260626000000_academy_credentials.sql). Not exported
 * from db.ts (that file is graph-schema-scoped by convention, see its own
 * header), kept local here since this is the one place Research OS code
 * legitimately reaches across into Academy's tables: a learner's data
 * footprint spans both surfaces under the same auth.users identity, and a
 * deletion or export request has to be complete across all of it or it is
 * not honoring the request. */
function bucketService(): SupabaseClient {
  if (_bucketSvc) return _bucketSvc;
  _bucketSvc = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _bucketSvc;
}

export type PrivacySchema = "graph" | "bucket";

export interface PrivacyTableConfig {
  schema: PrivacySchema;
  table: string;
  learnerColumn: string;
  /** Key this table's rows appear under in the export envelope and in the
   * fixture stores simulateLearnerDelete/buildExportEnvelope accept. */
  label: string;
}

/**
 * Every table graph.privacy_delete_learner deletes from, and every table
 * exportLearnerData reads from, in one place. Order here is cosmetic (the
 * SQL function's own statement order is what matters for FK-driven
 * cascades, e.g. productions before its outbox mirror); this array is a
 * lookup table, read in any order.
 *
 * DELIBERATELY EXCLUDED, both documented in DATA-INVENTORY.md:
 * - graph.nodes: `created_by` is a schema column no Phase 0 write path
 *   populates (verified by a full-codebase grep, see the inventory), so it
 *   never holds a real learner id today; a future writer of that column
 *   needs its own export/delete handling, never silently inherited from
 *   this list.
 * - public.research_os_productions_outbox: has no learner_id column at
 *   all, by design (see 20260910010000_research_os_engine_bridge.sql's own
 *   header), and cascades from graph.productions via its `id` foreign key,
 *   so deleting the production row already removes its outbox mirror.
 * - graph.classes: a reviewer's own roster object (name, reviewer_email),
 *   not a learner-keyed row; a learner's membership in it lives in
 *   graph.class_members below, which IS in scope.
 *
 * graph.check_attempts (migration 20260910070000_research_os_check_
 * attempts.sql) IS in scope, below: a held Check verdict carries the
 * learner's own explanation text, the same free-text-a-child-may-have-
 * written category learner_node_state.evidence already covers, so a
 * delete request must reach it too even though most rows are short-lived
 * (consumed on reveal, or swept by the 24-hour hard expiry, see that
 * migration's own header).
 */
export const PRIVACY_TABLES: PrivacyTableConfig[] = [
  { schema: "graph", table: "learner_node_state", learnerColumn: "learner_id", label: "learner_node_state" },
  { schema: "graph", table: "productions", learnerColumn: "learner_id", label: "productions" },
  { schema: "graph", table: "teacher_reviews", learnerColumn: "learner_id", label: "teacher_reviews" },
  { schema: "graph", table: "edge_flags", learnerColumn: "learner_id", label: "edge_flags" },
  { schema: "graph", table: "class_members", learnerColumn: "learner_id", label: "class_members" },
  { schema: "graph", table: "learner_profiles", learnerColumn: "learner_id", label: "learner_profile" },
  { schema: "graph", table: "check_attempts", learnerColumn: "learner_id", label: "check_attempts" },
  { schema: "bucket", table: "academy_progress", learnerColumn: "user_id", label: "academy_progress" },
  { schema: "bucket", table: "academy_profiles", learnerColumn: "user_id", label: "academy_profile" },
  { schema: "bucket", table: "academy_credentials", learnerColumn: "user_id", label: "academy_credentials" },
];

/** A one-way sha256 hex digest of a raw learner id. Used on both the SQL
 * side (graph.privacy_delete_learner's own `digest(..., 'sha256')` call,
 * pgcrypto) and here, so an export-action audit row and a delete-action
 * audit row are hashed the same way and a later query can never join a
 * privacy_events row back to a specific learner without already knowing
 * the id to check it against, matching this migration's own minimization
 * principle (see the migration's header). */
export function hashLearnerId(learnerId: string): string {
  return createHash("sha256").update(learnerId).digest("hex");
}

export interface ExportEnvelope {
  learnerId: string;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

/**
 * Assembles the export response from already-queried (but here re-checked)
 * per-table row arrays. The re-check, filtering every row to
 * row[learnerColumn] === learnerId before it ever reaches the response, is
 * a second, pure, independently-testable enforcement of "export returns
 * only the caller's rows" on top of the database query's own `.eq(...)`
 * filter, matching this repo's established defense-in-depth posture (RLS
 * plus application-code enforcement, see db.ts's own header comment). A
 * label missing from `rowsByLabel` (e.g. a table read failed) is treated
 * as an empty array, so the response shape always includes every
 * PRIVACY_TABLES label.
 */
export function buildExportEnvelope(
  rowsByLabel: Record<string, Record<string, unknown>[]>,
  learnerId: string,
  exportedAt: string,
): ExportEnvelope {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const cfg of PRIVACY_TABLES) {
    const rows = rowsByLabel[cfg.label] ?? [];
    tables[cfg.label] = rows.filter((r) => r[cfg.learnerColumn] === learnerId);
  }
  return { learnerId, exportedAt, tables };
}

/** Reads every PRIVACY_TABLES row for `learnerId` across both the `graph`
 * and `bucket` schemas and returns the assembled export envelope. Best-
 * effort per table: a single table's read failure (e.g. a table missing on
 * a fresh environment) yields an empty array for that label rather than
 * failing the whole export, since a partial export is more useful to a
 * learner exercising their access right than none at all; the response
 * still names every table so a caller can see what came back empty.
 * Writes one graph.privacy_events audit row, best effort: a logging
 * failure must never block a learner from getting their own data back. */
export async function exportLearnerData(actor: PrivacyRequestActor): Promise<ExportEnvelope> {
  const { targetLearnerId, callerId, actingAsReviewer } = actor;
  const graphSvc = graphService();
  const bucketSvc = bucketService();
  const rowsByLabel: Record<string, Record<string, unknown>[]> = {};

  await Promise.all(
    PRIVACY_TABLES.map(async (cfg) => {
      const svc = cfg.schema === "graph" ? graphSvc : bucketSvc;
      try {
        const { data, error } = await svc.from(cfg.table).select("*").eq(cfg.learnerColumn, targetLearnerId);
        rowsByLabel[cfg.label] = error ? [] : ((data as Record<string, unknown>[]) ?? []);
      } catch {
        rowsByLabel[cfg.label] = [];
      }
    }),
  );

  const envelope = buildExportEnvelope(rowsByLabel, targetLearnerId, new Date().toISOString());

  try {
    // actor_id_hash equals learner_id_hash on a self-request; on a
    // reviewer-invoked export it differs and acting_as_reviewer is true,
    // so the audit row records WHO acted, not just that an export
    // happened, see resolvePrivacyActor's own doc comment.
    await graphSvc.from("privacy_events").insert({
      learner_id_hash: hashLearnerId(targetLearnerId),
      action: "export",
      actor_id_hash: hashLearnerId(callerId),
      acting_as_reviewer: actingAsReviewer,
    });
  } catch {
    // best effort, see doc comment above
  }

  return envelope;
}

export interface DeleteResult {
  learnerId: string;
  deletedAt: string;
  deleted: Record<string, number>;
}

/**
 * Calls graph.privacy_delete_learner (the one-transaction hard delete) via
 * RPC. The RPC itself writes the audit row as part of the same
 * transaction, so a delete that throws here never leaves a partial
 * deletion with no audit trail, and an audit row is never written for a
 * delete that did not happen, both hold together or neither does. Passes
 * the actor through to the RPC so a reviewer-invoked delete's audit row
 * carries a hashed actor id distinct from the learner's own, and
 * acting_as_reviewer true, matching exportLearnerData's own accountability
 * guarantee above.
 */
export async function deleteLearnerData(actor: PrivacyRequestActor): Promise<DeleteResult> {
  const { targetLearnerId, callerId, actingAsReviewer } = actor;
  const svc = graphService();
  const { data, error } = await svc.rpc("privacy_delete_learner", {
    p_learner_id: targetLearnerId,
    p_actor_id: callerId,
    p_acting_as_reviewer: actingAsReviewer,
  });
  if (error) throw new Error(`deleteLearnerData: rpc failed: ${error.message}`);
  return { learnerId: targetLearnerId, deletedAt: new Date().toISOString(), deleted: (data as Record<string, number>) ?? {} };
}

// ---------------------------------------------------------------------------
// Pure, offline-testable mirror of graph.privacy_delete_learner, used only
// by scripts/test-research-os-privacy.ts. See this file's header for why
// this exists alongside the real RPC-backed deleteLearnerData above.
// ---------------------------------------------------------------------------

/** A fixture store shaped like the tables in PRIVACY_TABLES plus the audit
 * log, keyed by label. Every row is a plain object with at least the
 * table's learnerColumn field, matching what a real Supabase `.select("*")`
 * would return. */
export type FixtureStore = Record<string, Record<string, unknown>[]> & {
  privacy_events?: {
    learner_id_hash: string;
    action: string;
    actorIdHash?: string;
    actingAsReviewer?: boolean;
  }[];
};

export interface SimulatedDeleteResult {
  deleted: Record<string, number>;
  auditRowsWritten: number;
}

/** Who invoked the simulated delete, mirroring privacy_delete_learner's
 * p_actor_id/p_acting_as_reviewer RPC params. Omit for a self-request:
 * the audit row then hashes learnerId as its own actor, matching a real
 * self-request's identical actor_id_hash and learner_id_hash. */
export interface SimulatedActor {
  actorId: string;
  actingAsReviewer: boolean;
}

/**
 * Removes every row belonging to `learnerId` from every PRIVACY_TABLES
 * label in `store` (mutating the arrays in place, matching how a caller
 * would inspect the same fixture object afterward), appends one
 * `privacy_events` row with the hashed id, and returns per-table deleted
 * counts. Never touches a row whose learnerColumn does not match, so
 * another learner's rows in the same fixture store are untouched, the
 * exact property scripts/test-research-os-privacy.ts asserts. The audit
 * row records who acted: a reviewer-invoked delete (actor passed, with
 * actingAsReviewer true) hashes a different id into actorIdHash than
 * learner_id_hash, mirroring the real RPC's own accountability guarantee.
 */
export function simulateLearnerDelete(store: FixtureStore, learnerId: string, actor?: SimulatedActor): SimulatedDeleteResult {
  const deleted: Record<string, number> = {};
  for (const cfg of PRIVACY_TABLES) {
    const rows = store[cfg.label] ?? [];
    const kept = rows.filter((r) => r[cfg.learnerColumn] !== learnerId);
    deleted[cfg.label] = rows.length - kept.length;
    store[cfg.label] = kept;
  }
  const events = store.privacy_events ?? [];
  events.push({
    learner_id_hash: hashLearnerId(learnerId),
    action: "delete",
    actorIdHash: hashLearnerId(actor?.actorId ?? learnerId),
    actingAsReviewer: actor?.actingAsReviewer ?? false,
  });
  store.privacy_events = events;
  return { deleted, auditRowsWritten: 1 };
}

// ---------------------------------------------------------------------------
// Auth resolution shared by the API route.
// ---------------------------------------------------------------------------

export interface PrivacyRequestActor {
  /** The verified caller's own id (never client-supplied). */
  callerId: string;
  /** The learner id this request acts on: the caller's own id for a
   * self-request, or a reviewer-supplied target for a reviewer request. */
  targetLearnerId: string;
  actingAsReviewer: boolean;
}

/**
 * Resolves who is calling and who they may act on: a verified caller
 * always may act on their OWN id (self-gated); acting on a DIFFERENT id
 * additionally requires the caller to be on the reviewer allowlist
 * (src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS), the
 * "reviewer- or self-gated" rule this bead's task names. Returns null on
 * any failure: no verified caller at all, OR a verified but non-reviewer
 * caller naming a different learnerId. The API route maps every null to
 * 401, one undifferentiated outcome for "not signed in" and "signed in but
 * not allowed to act on that id," matching reviewer.ts's own documented
 * posture (verifyReviewer's header: "the caller cannot distinguish which,
 * by design, matching every other research-os route's 401-for-anything-
 * unverified posture").
 */
export async function resolvePrivacyActor(req: NextRequest, requestedLearnerId: string | undefined): Promise<PrivacyRequestActor | null> {
  const identity = await verifyLearnerIdentity(req);
  if (!identity) return null;

  const targetLearnerId = requestedLearnerId?.trim() || identity.id;
  if (targetLearnerId === identity.id) {
    return { callerId: identity.id, targetLearnerId, actingAsReviewer: false };
  }

  const reviewer = await verifyReviewer(req);
  if (!reviewer) return null;
  return { callerId: identity.id, targetLearnerId, actingAsReviewer: true };
}

export function privacyConfigured(): boolean {
  return configured() && Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

/**
 * True only when `body.confirm` is exactly DELETE_CONFIRM_TOKEN
 * (bkt-ros ros-07 follow-up, task item 2: "the confirm cannot be skipped
 * server-side"). Pure, so the route's own confirm gate is unit-testable
 * without a live Supabase call, matching this file's decideConsent-style
 * convention (see consent.ts). Anything other than an exact string match,
 * including a boolean true, an empty string, or the field being absent
 * entirely, fails closed.
 */
export function isDeleteConfirmed(body: { confirm?: unknown }): boolean {
  return body.confirm === DELETE_CONFIRM_TOKEN;
}
