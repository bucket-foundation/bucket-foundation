import { createHmac, timingSafeEqual } from "node:crypto";
import { escapeHtml, SITE_URL } from "../whats-new-email/digest";
import { dayKey } from "./engine";
import { shiftDay, studyStats, uuidOrNull, validTimeZone, type BranchRow } from "./groups";
import type { StoredEngineState } from "./mastery";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export const MIN_STREAK = 2;
export const EVENING_START_HOUR = 19;
export const EVENING_END_HOUR = 22;
export const SEND_GAP_MS = 600;
export const BATCH_SIZE = 50;
export const DEFAULT_REMINDER_FROM = "Bucket Foundation <streaks@bucket.foundation>";
export const STREAK_UNSUBSCRIBE_PATH = "/api/academy/streak-reminder/unsubscribe";
export const STUDY_URL = `${SITE_URL}/learn`;
const SECRET_MIN = 32;
const RESEND_URL = "https://api.resend.com/emails";

export interface Subscriber {
  user_id: string;
  tz: string;
  last_sent_day: string | null;
}

export interface Account {
  email: string | null;
  banned: boolean;
}

export interface ReminderEmail {
  userId: string;
  email: string;
  day: string;
  streak: number;
}

export interface ReminderDeps {
  subscribers(): Promise<Subscriber[]>;
  progress(userIds: string[]): Promise<Map<string, BranchRow[]>>;
  adult(userId: string): Promise<boolean>;
  account(userId: string): Promise<Account | null>;
  claim(userId: string, day: string): Promise<boolean>;
  release(userId: string, day: string, previous: string | null): Promise<void>;
  sendEmail(message: ReminderEmail): Promise<void>;
  push(userId: string, streak: number): Promise<number>;
}

export interface ReminderReport {
  subscribers: number;
  due: number;
  emailed: number;
  pushed: number;
  failed: number;
  pending: number;
}

export interface ReminderMailConfig {
  apiKey: string;
  secret: string;
  from: string;
  postalAddress: string;
}

export function localHour(now: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).formatToParts(new Date(now));
  return Number(parts.find((p) => p.type === "hour")?.value);
}

export function dueDay(s: Subscriber, now: number): string | null {
  const tz = validTimeZone(s.tz);
  if (!tz) return null;
  const hour = localHour(now, tz);
  if (hour < EVENING_START_HOUR || hour >= EVENING_END_HOUR) return null;
  const day = dayKey(now, tz);
  return s.last_sent_day === day ? null : day;
}

export function atRiskStreak(stats: readonly StoredEngineState["stats"][], today: string): number {
  const yesterday = shiftDay(today, -1);
  let best = 0;
  for (const s of stats) {
    if (s?.lastStudyDay === today) return 0;
    if (s?.lastStudyDay === yesterday) best = Math.max(best, s.streak || 0);
  }
  return best >= MIN_STREAK ? best : 0;
}

function sign(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`streak-reminder-unsubscribe:v1:${userId}`).digest("base64url");
}

export function streakUnsubscribeUrl(userId: string, secret: string, origin = SITE_URL): string {
  return `${origin}${STREAK_UNSUBSCRIBE_PATH}?u=${userId}&s=${sign(userId, secret)}`;
}

export function verifyStreakUnsubscribe(u: string | null, s: string | null, secret: string | null | undefined): string | null {
  const userId = uuidOrNull(u);
  if (!secret || secret.length < SECRET_MIN || !userId || !s) return null;
  const want = Buffer.from(sign(userId, secret));
  const got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got) ? userId : null;
}

export function renderReminder(streak: number, unsub: string, postalAddress: string): { subject: string; html: string; text: string } {
  const subject = `Your ${streak}-day streak ends tonight`;
  const line = `You have studied ${streak} days in a row. One review today keeps it going.`;
  const why = "You get this because you turned on streak reminders in Bucket settings.";
  const text = [line, "", `Study now: ${STUDY_URL}`, "", why, `Stop these reminders: ${unsub}`, postalAddress].join("\n");
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f4efe6;color:#1d1a16;font:16px/1.6 Georgia,serif"><div style="max-width:520px;margin:0 auto;padding:32px 16px">
<p>${escapeHtml(line)}</p>
<p><a href="${escapeHtml(STUDY_URL)}" style="color:#1d1a16">Study now</a></p>
<p style="font-size:13px;color:#5c554b">${escapeHtml(why)} <a href="${escapeHtml(unsub)}" style="color:#5c554b">Stop these reminders</a>.<br>${escapeHtml(postalAddress)}</p>
</div></body></html>`;
  return { subject, html, text };
}

export async function sendReminderEmail(fetcher: Fetch, config: ReminderMailConfig, m: ReminderEmail): Promise<void> {
  const unsub = streakUnsubscribeUrl(m.userId, config.secret);
  const res = await fetcher(RESEND_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json", "idempotency-key": `streak-reminder/${m.day}/${m.userId}` },
    body: JSON.stringify({
      from: config.from,
      to: m.email,
      ...renderReminder(m.streak, unsub, config.postalAddress),
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runStreakReminders(
  deps: ReminderDeps,
  opts: { now: number; deadline?: number; clock?: () => number; gapMs?: number },
): Promise<ReminderReport> {
  const clock = opts.clock ?? Date.now;
  const gap = opts.gapMs ?? SEND_GAP_MS;
  const subscribers = await deps.subscribers();
  const due = subscribers.flatMap((s) => {
    const day = dueDay(s, opts.now);
    return day ? [{ ...s, day }] : [];
  });
  const report: ReminderReport = { subscribers: subscribers.length, due: due.length, emailed: 0, pushed: 0, failed: 0, pending: 0 };
  const late = () => opts.deadline !== undefined && clock() > opts.deadline;

  for (let i = 0; i < due.length; i += BATCH_SIZE) {
    if (late()) {
      report.pending = due.length - i;
      return report;
    }
    const batch = due.slice(i, i + BATCH_SIZE);
    const rows = await deps.progress(batch.map((s) => s.user_id));
    for (let j = 0; j < batch.length; j++) {
      const s = batch[j];
      if (late()) {
        report.pending = due.length - i - j;
        return report;
      }
      const streak = atRiskStreak(studyStats(rows.get(s.user_id) ?? []), s.day);
      if (!streak || !(await deps.adult(s.user_id))) continue;
      const account = await deps.account(s.user_id);
      if (!account || account.banned) continue;
      if (!(await deps.claim(s.user_id, s.day))) continue;

      let emailed = false;
      if (account.email) {
        try {
          await deps.sendEmail({ userId: s.user_id, email: account.email, day: s.day, streak });
          emailed = true;
          report.emailed++;
        } catch (err) {
          console.error(`[streak-reminder] email failed for ${s.user_id.slice(0, 8)}:`, err instanceof Error ? err.message : "unknown");
        }
      }
      const pushed = await deps.push(s.user_id, streak).catch(() => 0);
      report.pushed += pushed;
      if (!emailed && pushed === 0) {
        report.failed++;
        await deps.release(s.user_id, s.day, s.last_sent_day);
      }
      if (gap > 0) await pause(gap);
    }
  }
  return report;
}
