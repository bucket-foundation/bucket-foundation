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

export interface BetaStore {
  tester: (userId: string, app: BetaApp) => Promise<BetaTester>;
  countToday: (userId: string) => Promise<number>;
  insert: (userId: string, app: BetaApp, events: BetaEvent[]) => Promise<number>;
  testers: () => Promise<BetaTester[]>;
  events: (sinceIso: string) => Promise<StoredBetaEvent[]>;
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
    countToday: async (userId) => {
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      const { count, error } = await client().from("beta_events").select("event_id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", day.toISOString());
      if (error) throw new Error(`beta_events count failed: ${error.message}`);
      return count ?? 0;
    },
    insert: async (userId, app, events) => {
      const rows = events.map((e) => ({ user_id: userId, event_id: e.id, app, name: e.name, session_id: e.sessionId, client_ts: e.ts, props: e.props }));
      const { data, error } = await client().from("beta_events").upsert(rows, { onConflict: "user_id,event_id", ignoreDuplicates: true }).select("event_id");
      if (error) throw new Error(`beta_events insert failed: ${error.message}`);
      return data?.length ?? 0;
    },
    testers: async () => {
      const { data, error } = await client().from("beta_testers").select("user_id, cohort, first_app, opted_out, enrolled_at").order("enrolled_at");
      if (error) throw new Error(`beta_testers list failed: ${error.message}`);
      return (data as TesterRow[]).map(toTester);
    },
    events: async (sinceIso) => {
      const out: StoredBetaEvent[] = [];
      for (let from = 0; from < MAX_ROWS; from += PAGE) {
        const { data, error } = await client()
          .from("beta_events")
          .select("user_id, app, name, session_id, client_ts, props")
          .gte("client_ts", sinceIso)
          .order("client_ts")
          .range(from, from + PAGE - 1);
        if (error) throw new Error(`beta_events list failed: ${error.message}`);
        for (const r of data as { user_id: string; app: BetaApp; name: BetaEventName; session_id: string | null; client_ts: string; props: Record<string, PropValue> }[]) {
          out.push({ userId: r.user_id, app: r.app, name: r.name, sessionId: r.session_id, ts: r.client_ts, props: r.props });
        }
        if (data.length < PAGE) break;
      }
      return out;
    },
    setCohort: async (userId, cohort) => {
      const { data, error } = await client().from("beta_testers").update({ cohort }).eq("user_id", userId).select("user_id");
      if (error) throw new Error(`beta_testers update failed: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },
  };
}
