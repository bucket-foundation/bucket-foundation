import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { decideConsent, readLearnerProfile, type LearnerProfile } from "@/lib/research-os/consent";
import { configured } from "@/lib/research-os/db";
import { parseProps, validArm, type LearnEvent, type LearnEventName, type LearnEventProps } from "./events";

export type WriteOutcome = "recorded" | "duplicate" | "refused";
export type GateReason = "no_profile" | "under_age" | "no_consent";
export type RecordOutcome = { recorded: boolean; outcome: WriteOutcome | GateReason };

export interface LearnEventRow {
  user_id: string;
  event_id: string;
  name: LearnEventName;
  props: LearnEventProps[LearnEventName];
  arm: string | null;
}

export interface LearnEventStore {
  readProfile: (userId: string) => Promise<LearnerProfile | null>;
  write: (row: LearnEventRow) => Promise<WriteOutcome>;
}

export type EventGate = { record: true } | { record: false; reason: GateReason };

export function learnEventGate(profile: LearnerProfile | null): EventGate {
  if (!profile) return { record: false, reason: "no_profile" };
  if (profile.birthYearBucket !== "18plus") return { record: false, reason: "under_age" };
  if (!decideConsent(profile, "learn_event").allowed) return { record: false, reason: "no_consent" };
  return { record: true };
}

export async function recordLearnEvent(store: LearnEventStore, userId: string, event: LearnEvent): Promise<RecordOutcome> {
  const props = parseProps(event.name, event.props);
  if (!props.ok) throw new Error(`recordLearnEvent: ${props.error}`);
  const gate = learnEventGate(await store.readProfile(userId));
  if (!gate.record) return { recorded: false, outcome: gate.reason };
  const outcome = await store.write({
    user_id: userId,
    event_id: event.id,
    name: event.name,
    props: props.value,
    arm: validArm(event.arm) ? event.arm : null,
  });
  return { recorded: outcome === "recorded", outcome };
}

let _bucket: SupabaseClient | null = null;
function bucketService(): SupabaseClient {
  if (_bucket) return _bucket;
  _bucket = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, ""), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _bucket;
}

export function supabaseEventStore(): LearnEventStore | null {
  if (!configured()) return null;
  return {
    readProfile: readLearnerProfile,
    write: async (row) => {
      const { data, error } = await bucketService().rpc("record_learn_event", {
        p_user_id: row.user_id,
        p_event_id: row.event_id,
        p_name: row.name,
        p_props: row.props,
        p_arm: row.arm,
      });
      if (error) throw new Error(`record_learn_event failed: ${error.message}`);
      if (data !== "recorded" && data !== "duplicate" && data !== "refused") throw new Error(`record_learn_event returned ${String(data)}`);
      return data;
    },
  };
}

export async function recordServerEvent<N extends LearnEventName>(
  userId: string,
  name: N,
  props: LearnEventProps[N],
  opts: { arm?: string | null; store?: LearnEventStore | null } = {},
): Promise<RecordOutcome | null> {
  const store = opts.store === undefined ? supabaseEventStore() : opts.store;
  if (!store) return null;
  try {
    return await recordLearnEvent(store, userId, { id: randomUUID(), name, props, arm: opts.arm ?? null });
  } catch (err) {
    console.error(`[academy/events] ${name} not recorded:`, err instanceof Error ? err.message : err);
    return null;
  }
}
