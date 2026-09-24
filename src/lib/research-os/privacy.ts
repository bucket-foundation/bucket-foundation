import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { configured, graphService, verifyLearnerIdentity } from "./db";
import { verifyGraphReviewer } from "./reviewer";
import { DELETE_CONFIRM_TOKEN } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _bucketSvc: SupabaseClient | null = null;
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
  label: string;
}

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

export function hashLearnerId(learnerId: string): string {
  return createHash("sha256").update(learnerId).digest("hex");
}

export interface ExportEnvelope {
  learnerId: string;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

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
    await graphSvc.from("privacy_events").insert({
      learner_id_hash: hashLearnerId(targetLearnerId),
      action: "export",
      actor_id_hash: hashLearnerId(callerId),
      acting_as_reviewer: actingAsReviewer,
    });
  } catch {
  }

  return envelope;
}

export interface DeleteResult {
  learnerId: string;
  deletedAt: string;
  deleted: Record<string, number>;
}

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

export interface SimulatedActor {
  actorId: string;
  actingAsReviewer: boolean;
}

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

export interface PrivacyRequestActor {
  callerId: string;
  targetLearnerId: string;
  actingAsReviewer: boolean;
}

export async function resolvePrivacyActor(req: NextRequest, requestedLearnerId: string | undefined): Promise<PrivacyRequestActor | null> {
  const identity = await verifyLearnerIdentity(req);
  if (!identity) return null;

  const targetLearnerId = requestedLearnerId?.trim() || identity.id;
  if (targetLearnerId === identity.id) {
    return { callerId: identity.id, targetLearnerId, actingAsReviewer: false };
  }

  const reviewer = await verifyGraphReviewer(req);
  if (!reviewer) return null;
  return { callerId: identity.id, targetLearnerId, actingAsReviewer: true };
}

export function privacyConfigured(): boolean {
  return configured() && Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

export function isDeleteConfirmed(body: { confirm?: unknown }): boolean {
  return body.confirm === DELETE_CONFIRM_TOKEN;
}
