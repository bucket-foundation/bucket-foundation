import { apnsConfig, sendPush, withBudget, type PushPayload } from "../academy/apns";
import { service } from "../academy/groups-server";
import { PUSH_BUDGET_MS, supabasePushStore } from "../academy/push-server";
import { MEETUP_TERMS_VERSION, toMeetup, type Meetup, type MeetupRow } from "./meetups";

export const MEETUP_COLS = "id,host_id,host_name,title,about,langs,starts_at,duration_min,mode,city,area,place_name,lat,lon,online_url,capacity,created_at,cancelled_at,taken_down_at";

export function adminIds(env: Record<string, string | undefined> = process.env): Set<string> {
  return new Set((env.MEETUP_ADMIN_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
}

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export async function blockedFor(uid: string | null): Promise<Set<string>> {
  if (!uid) return new Set();
  const rows = check(await service().from("meetup_blocks").select("user_id,blocked_id").or(`user_id.eq.${uid},blocked_id.eq.${uid}`), "blocks") as { user_id: string; blocked_id: string }[];
  return new Set(rows.map((r) => (r.user_id === uid ? r.blocked_id : r.user_id)));
}

export async function termsAccepted(uid: string): Promise<boolean> {
  const rows = check(await service().from("meetup_terms").select("version").eq("user_id", uid), "terms") as { version: number }[];
  return rows.some((r) => r.version >= MEETUP_TERMS_VERSION);
}

export async function acceptTerms(uid: string): Promise<void> {
  check(await service().from("meetup_terms").upsert({ user_id: uid, version: MEETUP_TERMS_VERSION, accepted_at: new Date().toISOString() }, { onConflict: "user_id" }), "accept terms");
}

export async function meetupById(id: string): Promise<MeetupRow | null> {
  const rows = check(await service().from("meetups").select(MEETUP_COLS).eq("id", id).limit(1), "meetup") as MeetupRow[];
  return rows[0] ?? null;
}

export async function rsvpStats(ids: string[], uid: string | null): Promise<Map<string, { count: number; viewerGoing: boolean }>> {
  const out = new Map(ids.map((id) => [id, { count: 0, viewerGoing: false }]));
  if (ids.length === 0) return out;
  const rows = check(await service().from("meetup_rsvps").select("meetup_id,user_id").in("meetup_id", ids), "rsvps") as { meetup_id: string; user_id: string }[];
  for (const r of rows) {
    const s = out.get(r.meetup_id);
    if (!s) continue;
    s.count += 1;
    if (r.user_id === uid) s.viewerGoing = true;
  }
  return out;
}

export async function countingReports(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (ids.length === 0) return out;
  const rows = check(await service().from("meetup_reports").select("meetup_id").in("meetup_id", ids).eq("counts", true).neq("status", "dismissed"), "reports") as { meetup_id: string }[];
  for (const r of rows) out.set(r.meetup_id, (out.get(r.meetup_id) ?? 0) + 1);
  return out;
}

export async function present(rows: MeetupRow[], uid: string | null): Promise<Meetup[]> {
  const ids = rows.map((r) => r.id);
  const [stats, reports] = await Promise.all([rsvpStats(ids, uid), countingReports(ids)]);
  return rows.map((r) => toMeetup(r, uid, stats.get(r.id) ?? { count: 0, viewerGoing: false }, reports.get(r.id) ?? 0));
}

export async function goingIds(meetupId: string): Promise<string[]> {
  const rows = check(await service().from("meetup_rsvps").select("user_id").eq("meetup_id", meetupId), "going") as { user_id: string }[];
  return rows.map((r) => r.user_id);
}

export async function pushText(userIds: string[], body: string, meetupId: string): Promise<void> {
  const cfg = apnsConfig();
  if (!cfg || userIds.length === 0) return;
  const payload: PushPayload = { aps: { alert: { body }, sound: "default", "thread-id": `meetup-${meetupId}` }, meetup: meetupId };
  await withBudget(
    (async () => {
      for (const uid of userIds.slice(0, 200)) {
        const devices = await supabasePushStore.devices(uid).catch(() => []);
        await sendPush(devices, payload, { cfg, prune: supabasePushStore.prune, setEnv: supabasePushStore.setEnv }).catch(() => null);
      }
    })(),
    PUSH_BUDGET_MS,
  );
}
