import type { MarkStore } from "../download/marks";
import type { WaitlistEntry } from "../waitlist/core";
import { adminKeyMatches, listSignups, type WaitlistStore } from "../waitlist/store";
import { buildDigest, digestDay, renderDigest, type RawEntry } from "./digest";
import { optedOutAt, subscriberId, unsubscribeUrl } from "./unsubscribe";

type Env = Record<string, string | undefined>;
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export const DEFAULT_FROM = "Bucket Foundation <whats-new@bucket.foundation>";
export const SEND_GAP_MS = 600;
const RESEND_URL = "https://api.resend.com/emails";

export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  const auth = header ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  return adminKeyMatches(given, secret);
}

export interface DigestConfig {
  apiKey: string;
  secret: string;
  from: string;
  postalAddress: string;
}

export function digestConfig(env: Env, secret: string | null): DigestConfig | { missing: string[] } {
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const postalAddress = env.INVITE_POSTAL_ADDRESS?.trim() ?? "";
  const missing = [!apiKey && "RESEND_API_KEY", !secret && "WHATS_NEW_UNSUBSCRIBE_SECRET", !postalAddress && "INVITE_POSTAL_ADDRESS"].filter((m): m is string => !!m);
  if (missing.length || !secret) return { missing };
  return { apiKey, secret, from: env.WHATS_NEW_FROM?.trim() || DEFAULT_FROM, postalAddress };
}

export interface Recipient {
  key: string;
  email: string;
}

export async function optedInRecipients(stores: WaitlistStore[], optOuts: MarkStore, secret: string): Promise<Recipient[]> {
  const emails = new Set<string>();
  for (const store of stores) {
    const entries: WaitlistEntry[] = await listSignups(store);
    for (const e of entries) if (e.whats_new_daily === true) emails.add(e.email);
  }
  const out: Recipient[] = [];
  for (const email of Array.from(emails)) {
    const key = subscriberId(email, secret);
    if ((await optedOutAt(optOuts, key)) === null) out.push({ key, email });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

export interface SendReport {
  day: string;
  entries: number;
  recipients: number;
  sent: number;
  failed: number;
  pending: number;
  skipped?: "empty";
}

async function sendOne(fetcher: Fetch, config: DigestConfig, to: Recipient, day: string, email: { subject: string; html: string; text: string }, unsub: string): Promise<void> {
  const res = await fetcher(RESEND_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json", "idempotency-key": `whats-new/${day}/${to.key}` },
    body: JSON.stringify({
      from: config.from,
      to: to.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sendDailyDigest(opts: {
  entries: readonly RawEntry[];
  recipients: () => Promise<Recipient[]>;
  config: DigestConfig;
  now: number;
  fetcher?: Fetch;
  deadline?: number;
  clock?: () => number;
  gapMs?: number;
}): Promise<SendReport> {
  const { config, now } = opts;
  const fetcher = opts.fetcher ?? fetch;
  const clock = opts.clock ?? Date.now;
  const digest = buildDigest(opts.entries, digestDay(now));
  const base = { day: digest.day, entries: digest.count, recipients: 0, sent: 0, failed: 0, pending: 0 };
  if (digest.count === 0) return { ...base, skipped: "empty" };
  const recipients = await opts.recipients();
  const report: SendReport = { ...base, recipients: recipients.length };
  const gap = opts.gapMs ?? SEND_GAP_MS;
  for (let i = 0; i < recipients.length; i++) {
    if (opts.deadline !== undefined && clock() > opts.deadline) {
      report.pending = recipients.length - i;
      break;
    }
    const r = recipients[i];
    const unsub = unsubscribeUrl(r.email, config.secret);
    try {
      await sendOne(fetcher, config, r, digest.day, renderDigest(digest, unsub, config.postalAddress), unsub);
      report.sent++;
    } catch (err) {
      report.failed++;
      console.error(`[whats-new] send failed for ${r.key.slice(0, 12)}:`, err instanceof Error ? err.message : "unknown");
    }
    if (gap > 0 && i < recipients.length - 1) await pause(gap);
  }
  return report;
}
