import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { configured } from "@/lib/research-os/db";
import type { BetaApp, BetaEvent, BetaEventName, PropValue } from "./events";

export interface BetaTester {
  userId: string;
  cohort: string;
  firstApp: BetaApp;
  optedOut: boolean;
  enrolledAt: string;
}

export interface StoredBetaEvent {
  userId: string;
  app: BetaApp;
  name: BetaEventName;
  sessionId: string | null;
  ts: string;
  props: Record<string, PropValue>;
}

export type InsertOutcome = { outcome: "recorded"; accepted: number } | { outcome: "rate_limited" | "opted_out"; accepted: 0 };

export interface EventPage {
  rows: StoredBetaEvent[];
  truncated: boolean;
}

export interface BetaStore {
  tester: (userId: string, app: BetaApp) => Promise<BetaTester>;
  insert: (userId: string, app: BetaApp, events: BetaEvent[], cap: number) => Promise<InsertOutcome>;
  setOptOut: (userId: string, optedOut: boolean) => Promise<void>;
  testers: () => Promise<BetaTester[]>;
  events: (sinceIso: string) => Promise<EventPage>;
  setCohort: (userId: string, cohort: string) => Promise<boolean>;
}

const PAGE = 1000;
const MAX_ROWS = 100_000;

let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, ""), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _client;
}

interface TesterRow {
  user_id: string;
  cohort: string;
  first_app: BetaApp;
  opted_out: boolean;
  enrolled_at: string;
}

function toTester(r: TesterRow): BetaTester {
  return { userId: r.user_id, cohort: r.cohort, firstApp: r.first_app, optedOut: r.opted_out, enrolledAt: r.enrolled_at };
}

export function supabaseBetaStore(): BetaStore | null {
  if (!configured()) return null;
  return {
    tester: async (userId, app) => {
      const db = client();
      const { error: insErr } = await db.from("beta_testers").upsert({ user_id: userId, first_app: app }, { onConflict: "user_id", ignoreDuplicates: true });
      if (insErr) throw new Error(`beta_testers upsert failed: ${insErr.message}`);
      const { data, error } = await db.from("beta_testers").select("user_id, cohort, first_app, opted_out, enrolled_at").eq("user_id", userId).single();
      if (error || !data) throw new Error(`beta_testers read failed: ${error?.message ?? "no row"}`);
      return toTester(data as TesterRow);
    },
    insert: async (userId, app, events, cap) => {
      const payload = events.map((e) => ({ id: e.id, name: e.name, session_id: e.sessionId, ts: e.ts, props: e.props }));
      const { data, error } = await client().rpc("record_beta_events", { p_user_id: userId, p_app: app, p_events: payload, p_cap: cap });
      if (error) throw new Error(`record_beta_events failed: ${error.message}`);
      const out = data as { outcome?: string; accepted?: number } | null;
      if (out?.outcome === "recorded" && typeof out.accepted === "number") return { outcome: "recorded", accepted: out.accepted };
      if (out?.outcome === "rate_limited" || out?.outcome === "opted_out") return { outcome: out.outcome, accepted: 0 };
      throw new Error(`record_beta_events returned ${JSON.stringify(data)}`);
    },
    setOptOut: async (userId, optedOut) => {
      const db = client();
      const { error } = await db.from("beta_testers").upsert({ user_id: userId, first_app: "web", opted_out: optedOut }, { onConflict: "user_id" });
      if (error) throw new Error(`beta_testers opt-out failed: ${error.message}`);
      if (!optedOut) return;
      const { error: delErr } = await db.from("beta_events").delete().eq("user_id", userId);
      if (delErr) throw new Error(`beta_events delete failed: ${delErr.message}`);
    },
    testers: async () => {
      const { data, error } = await client().from("beta_testers").select("user_id, cohort, first_app, opted_out, enrolled_at").order("enrolled_at");
      if (error) throw new Error(`beta_testers list failed: ${error.message}`);
      return (data as TesterRow[]).map(toTester);
    },
    events: async (sinceIso) => {
      const out: StoredBetaEvent[] = [];
      let cursor: { ts: string; id: string } | null = null;
      while (out.length < MAX_ROWS) {
        let q = client()
          .from("beta_events")
          .select("event_id, user_id, app, name, session_id, client_ts, props")
          .gte("client_ts", sinceIso)
          .order("client_ts")
          .order("event_id")
          .limit(PAGE);
        if (cursor) q = q.or(`client_ts.gt.${cursor.ts},and(client_ts.eq.${cursor.ts},event_id.gt.${cursor.id})`);
        const { data, error } = await q;
        if (error) throw new Error(`beta_events list failed: ${error.message}`);
        const rows = data as { event_id: string; user_id: string; app: BetaApp; name: BetaEventName; session_id: string | null; client_ts: string; props: Record<string, PropValue> }[];
        for (const r of rows) out.push({ userId: r.user_id, app: r.app, name: r.name, sessionId: r.session_id, ts: r.client_ts, props: r.props });
        if (rows.length < PAGE) return { rows: out, truncated: false };
        const last = rows[rows.length - 1];
        cursor = { ts: last.client_ts, id: last.event_id };
      }
      return { rows: out, truncated: true };
    },
    setCohort: async (userId, cohort) => {
      const { data, error } = await client().from("beta_testers").update({ cohort }).eq("user_id", userId).select("user_id");
      if (error) throw new Error(`beta_testers update failed: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },
  };
}
