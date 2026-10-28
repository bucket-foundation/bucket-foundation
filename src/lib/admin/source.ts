import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revokeForAccountDelete } from "@/lib/academy/apple-token";
import { appleTokenDeps } from "@/lib/academy/apple-token-store";
import { PERSONAL_TABLES } from "@/lib/academy/delete-account";
import { supabaseBetaStore, type BetaStore } from "@/lib/beta/store";
import { supabaseSnapshotStore, type SnapshotStore } from "@/lib/growth/store";
import { configured } from "@/lib/research-os/db";
import type { WaitlistEntry } from "@/lib/waitlist/core";
import { getWaitlistStore, listSignups } from "@/lib/waitlist/store";
import type { ActionDeps, AuditRow } from "./actions";
import { fixtureSource } from "./fixtures";
import { fixturesEnabled } from "./gate";
import { toRevenueRow, type RevenueEventRow, type StoredRevenueRow } from "./revenue";
import type { OverviewRow, UserQuery } from "./users";

export interface AdminSource {
  users: (q: UserQuery, limit: number) => Promise<OverviewRow[]>;
  user: (id: string) => Promise<OverviewRow | null>;
  revenueEvents: (sinceIso: string) => Promise<RevenueEventRow[]>;
  audit: (limit: number, targetUserId?: string) => Promise<AuditRow[]>;
  beta: BetaStore;
  snapshots: SnapshotStore;
  waitlist: () => Promise<WaitlistEntry[] | null>;
  actions: ActionDeps;
}

const OVERVIEW_COLUMNS =
  "user_id, email, created_at, last_sign_in_at, banned_until, first_app, cohort, streak_days, last_active_day, languages, last_event_at, plan_product, plan_kind, plan_bundle, plan_expires_at, placement";

let _bucket: SupabaseClient | null = null;
let _auth: SupabaseClient | null = null;
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const bucket = () => (_bucket ??= createClient(url(), process.env.SUPABASE_SERVICE_ROLE_KEY!, { ...opts, db: { schema: "bucket" } }) as unknown as SupabaseClient);
const authAdmin = () => (_auth ??= createClient(url(), process.env.SUPABASE_SERVICE_ROLE_KEY!, opts));

function must<T>(label: string, r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  return r.data as T;
}

interface AuditDbRow {
  id: number;
  actor_id: string | null;
  actor_email: string;
  action: AuditRow["action"];
  target_user_id: string;
  target_email: string | null;
  reason: string;
  outcome: AuditRow["outcome"];
  detail: string | null;
  created_at: string;
}

function supabaseSource(): AdminSource | null {
  if (!configured()) return null;
  const appleTokens = appleTokenDeps();
  const beta = supabaseBetaStore();
  const snapshots = supabaseSnapshotStore();
  if (!beta || !snapshots) return null;
  return {
    users: async (q, limit) => {
      let query = bucket().from("admin_user_overview").select(OVERVIEW_COLUMNS).order("created_at", { ascending: false }).limit(limit);
      if (q.kind === "id") query = query.eq("user_id", q.id);
      if (q.kind === "email") query = query.ilike("email", `%${q.text}%`);
      return must<OverviewRow[]>("admin_user_overview list", await query);
    },
    user: async (id) => must<OverviewRow | null>("admin_user_overview read", await bucket().from("admin_user_overview").select(OVERVIEW_COLUMNS).eq("user_id", id).maybeSingle()),
    revenueEvents: async (sinceIso) =>
      must<StoredRevenueRow[]>(
        "app_store_events list",
        await bucket()
          .from("app_store_events")
          .select("kind, product_id, bundle_id, environment, original_transaction_id, signed_at, expires_at, transaction_info, renewal_info")
          .gte("signed_at", sinceIso)
          .order("signed_at")
          .limit(50_000),
      ).map(toRevenueRow),
    audit: async (limit, targetUserId) => {
      let query = bucket().from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
      if (targetUserId) query = query.eq("target_user_id", targetUserId);
      return must<AuditDbRow[]>("admin_audit_log list", await query).map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        actorId: r.actor_id ?? "",
        actorEmail: r.actor_email,
        action: r.action,
        targetUserId: r.target_user_id,
        targetEmail: r.target_email,
        reason: r.reason,
        outcome: r.outcome,
        detail: r.detail,
      }));
    },
    beta,
    snapshots,
    waitlist: async () => {
      const store = getWaitlistStore();
      return store ? listSignups(store) : null;
    },
    actions: {
      lookup: async (id) => {
        const { data, error } = await authAdmin().auth.admin.getUserById(id);
        if (error && error.status === 404) return null;
        if (error) throw new Error(`auth lookup: ${error.message}`);
        return data.user ? { email: data.user.email ?? null } : null;
      },
      setDisabled: async (id, disabled) => {
        const { error } = await authAdmin().auth.admin.updateUserById(id, { ban_duration: disabled ? "876000h" : "none" });
        if (error) throw new Error(`auth ban: ${error.message}`);
      },
      revokeApple: (id) => revokeForAccountDelete(appleTokens, id),
      deleteUser: async (id) => {
        for (const table of PERSONAL_TABLES) must("delete " + table, await bucket().from(table).delete().eq("user_id", id));
        const { error } = await authAdmin().auth.admin.deleteUser(id);
        if (error) throw new Error(`auth delete: ${error.message}`);
      },
      audit: async (e) => {
        must(
          "admin_audit_log insert",
          await bucket().from("admin_audit_log").insert({
            actor_id: e.actorId,
            actor_email: e.actorEmail,
            action: e.action,
            target_user_id: e.targetUserId,
            target_email: e.targetEmail,
            reason: e.reason,
            outcome: e.outcome,
            detail: e.detail,
          }),
        );
      },
    },
  };
}

export function adminSource(): AdminSource | null {
  return fixturesEnabled() ? fixtureSource() : supabaseSource();
}
