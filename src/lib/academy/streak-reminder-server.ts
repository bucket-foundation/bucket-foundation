import { createClient } from "@supabase/supabase-js";
import { digestConfig } from "../whats-new-email/send";
import { unsubscribeSecret } from "../whats-new-email/unsubscribe";
import { readAgeBand } from "../research-os/learn-gate";
import type { BranchRow } from "./groups";
import { progressRows, service } from "./groups-server";
import { pushStreakToDevices } from "./push-server";
import { DEFAULT_REMINDER_FROM, sendReminderEmail, type ReminderDeps, type ReminderMailConfig, type Subscriber } from "./streak-reminder";

export const REMINDERS = "streak_reminders";

type Env = Record<string, string | undefined>;

export function reminderMailConfig(env: Env = process.env): ReminderMailConfig | { missing: string[] } {
  const config = digestConfig(env, unsubscribeSecret(env));
  if ("missing" in config) return config;
  return { ...config, from: env.STREAK_EMAIL_FROM?.trim() || DEFAULT_REMINDER_FROM };
}

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export async function isAdult(userId: string): Promise<boolean> {
  const band = await readAgeBand(userId);
  return band.ok && band.band === "18plus";
}

export async function reminderStatus(userId: string): Promise<{ enabled: boolean; tz: string | null }> {
  const res = await service().from(REMINDERS).select("tz,opted_out_at").eq("user_id", userId).maybeSingle();
  const row = check(res, "reminder read") as { tz: string; opted_out_at: string | null } | null;
  return { enabled: !!row && row.opted_out_at === null, tz: row?.tz ?? null };
}

export async function enableReminders(userId: string, tz: string): Promise<void> {
  const current = await reminderStatus(userId);
  const res = current.enabled
    ? await service().from(REMINDERS).update({ tz }).eq("user_id", userId)
    : await service().from(REMINDERS).upsert({ user_id: userId, tz, opted_in_at: new Date().toISOString(), opted_out_at: null }, { onConflict: "user_id" });
  check(res, "reminder enable");
}

export async function disableReminders(userId: string): Promise<void> {
  check(await service().from(REMINDERS).update({ opted_out_at: new Date().toISOString() }).eq("user_id", userId), "reminder disable");
}

const PAGE = 1000;

async function activeSubscribers(): Promise<Subscriber[]> {
  const out: Subscriber[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await service().from(REMINDERS).select("user_id,tz,last_sent_day").is("opted_out_at", null).order("user_id").range(from, from + PAGE - 1);
    const rows = (check(res, "reminder list") ?? []) as Subscriber[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

async function rowsByUser(userIds: string[]): Promise<Map<string, BranchRow[]>> {
  const out = new Map<string, BranchRow[]>();
  for (const row of await progressRows(userIds)) out.set(row.user_id, [...(out.get(row.user_id) ?? []), row]);
  return out;
}

export function reminderDeps(config: ReminderMailConfig): ReminderDeps {
  const authAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    subscribers: activeSubscribers,
    progress: rowsByUser,
    adult: isAdult,
    async account(userId) {
      const { data, error } = await authAdmin.auth.admin.getUserById(userId);
      if (error || !data.user) return null;
      const until = (data.user as { banned_until?: string | null }).banned_until;
      return { email: data.user.email ?? null, banned: !!until && new Date(until).getTime() > Date.now() };
    },
    async claim(userId, day) {
      const res = await service()
        .from(REMINDERS)
        .update({ last_sent_day: day })
        .eq("user_id", userId)
        .is("opted_out_at", null)
        .or(`last_sent_day.is.null,last_sent_day.neq.${day}`)
        .select("user_id");
      return ((check(res, "reminder claim") ?? []) as unknown[]).length === 1;
    },
    async release(userId, day, previous) {
      check(await service().from(REMINDERS).update({ last_sent_day: previous }).eq("user_id", userId).eq("last_sent_day", day), "reminder release");
    },
    sendEmail: (message) => sendReminderEmail(fetch, config, message),
    push: async (userId, streak) => (await pushStreakToDevices(userId, streak))?.sent ?? 0,
  };
}
