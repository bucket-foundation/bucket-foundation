import type { MarkStore } from "../download/marks";
import type { WaitlistEntry } from "../waitlist/core";
import { adminKeyMatches, listSignups, type WaitlistStore } from "../waitlist/store";
import type { DocStore } from "../whats-new/store";
import { buildDigest, digestDay, renderDigest, type RawEntry } from "./digest";
import { optedOutAt, subscriberId, unsubscribeUrl } from "./unsubscribe";

type Env = Record<string, string | undefined>;
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export const DEFAULT_FROM = "Bucket Foundation <whats-new@bucket.foundation>";
export const SEND_GAP_MS = 600;
export const CURSOR_EVERY = 10;
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
  skipped?: "empty" | "done" | "offline";
  resumedAt: number;
}

export interface DigestLedger {
  frozen(day: string): Promise<string[] | null>;
  freeze(day: string, ids: string[]): Promise<void>;
  mailedOn(id: string): Promise<string | null>;
  markMailed(id: string, day: string): Promise<void>;
}

export function digestLedger(store: DocStore): DigestLedger {
  return {
    async frozen(day) {
      const text = await store.read(`digest/freeze-${day}.json`);
      if (text === null) return null;
      const ids = (JSON.parse(text) as { ids?: unknown }).ids;
      if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) throw new Error("freeze record is unreadable");
      return ids as string[];
    },
    async freeze(day, ids) {
      await store.create(`digest/freeze-${day}.json`, JSON.stringify({ key: `freeze:${day}`, ids }));
    },
    async mailedOn(id) {
      const text = await store.read(`digest/mailed-${id}.json`);
      if (text === null) return null;
      const day = (JSON.parse(text) as { day?: unknown }).day;
      if (typeof day !== "string") throw new Error("mailed record is unreadable");
      return day;
    },
    async markMailed(id, day) {
      await store.create(`digest/mailed-${id}.json`, JSON.stringify({ day }));
    },
  };
}

export class Unreachable extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, Unreachable.prototype);
  }
}

type Published = RawEntry & { published_at?: unknown };

export function mailedInstantly(e: RawEntry & { published_at?: unknown }): boolean {
  return e.category === "production" && typeof e.published_at === "string";
}

async function frozenEntries(all: readonly Published[], day: string, ledger: DigestLedger | undefined): Promise<{ entries: Published[]; frozen: boolean }> {
  const frozen = ledger ? await ledger.frozen(day) : null;
  if (frozen) return { entries: all.filter((e) => typeof e.id === "string" && frozen.includes(e.id)), frozen: true };
  const entries: Published[] = [];
  for (const e of all) {
    if (e.date !== day || typeof e.id !== "string") continue;
    if (ledger && typeof e.published_at === "string") {
      const mailed = await ledger.mailedOn(e.id);
      if (mailed !== null && mailed !== day) continue;
    }
    entries.push(e);
  }
  return { entries, frozen: false };
}

export async function sendOne(fetcher: Fetch, config: DigestConfig, to: Recipient, day: string, email: { subject: string; html: string; text: string }, unsub: string): Promise<void> {
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
  }).catch((err: unknown) => {
    throw new Unreachable(err instanceof Error ? err.message : "fetch failed");
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sendDailyDigest(opts: {
  entries: readonly RawEntry[] | (() => Promise<readonly RawEntry[]>);
  ledger?: DigestLedger;
  recipients: () => Promise<Recipient[]>;
  config: DigestConfig;
  now: number;
  fetcher?: Fetch;
  deadline?: number;
  clock?: () => number;
  gapMs?: number;
  progress?: MarkStore;
  instant?: (e: Published) => boolean;
}): Promise<SendReport> {
  const { config, now } = opts;
  const fetcher = opts.fetcher ?? fetch;
  const clock = opts.clock ?? Date.now;
  const day = digestDay(now);
  const loaded: readonly Published[] = typeof opts.entries === "function" ? await opts.entries() : opts.entries;
  const all = opts.instant ? loaded.filter((e) => !opts.instant?.(e)) : loaded;
  const ledger = opts.ledger;
  const picked = await frozenEntries(all, day, ledger);
  let digest = buildDigest(picked.entries, day);
  const published = new Set(picked.entries.filter((e) => typeof e.published_at === "string").map((e) => e.id as string));
  let recorded = picked.frozen || !ledger;
  const record = async () => {
    if (recorded || !ledger) return;
    const ids = digest.groups.flatMap((g) => g.items.map((i) => i.id));
    await ledger.freeze(day, ids);
    const kept = (await ledger.frozen(day)) ?? ids;
    if (kept.length !== ids.length || kept.some((id) => !ids.includes(id))) digest = buildDigest(picked.entries.filter((e) => kept.includes(e.id as string)), day);
    for (const id of kept) if (published.has(id)) await ledger.markMailed(id, day);
    recorded = true;
  };
  const base = { day: digest.day, entries: digest.count, recipients: 0, sent: 0, failed: 0, pending: 0, resumedAt: 0 };
  if (digest.count === 0) return { ...base, skipped: "empty" };
  const progress = opts.progress;
  if (progress && (await progress.get(`done:${digest.day}`)) !== null) return { ...base, skipped: "done" };
  const recipients = await opts.recipients();
  const start = Math.min(progress ? ((await progress.get(`cursor:${digest.day}`)) ?? 0) : 0, recipients.length);
  const report: SendReport = { ...base, recipients: recipients.length, resumedAt: start };
  const gap = opts.gapMs ?? SEND_GAP_MS;
  for (let i = start; i < recipients.length; i++) {
    if (opts.deadline !== undefined && clock() > opts.deadline) {
      report.pending = recipients.length - i;
      break;
    }
    const r = recipients[i];
    if (digest.count === 0) {
      report.pending = recipients.length - i;
      break;
    }
    const unsub = unsubscribeUrl(r.email, config.secret);
    try {
      await sendOne(fetcher, config, r, digest.day, renderDigest(digest, unsub, config.postalAddress), unsub);
      report.sent++;
      await record();
    } catch (err) {
      if (err instanceof Unreachable && report.sent === 0 && report.failed === 0) {
        console.error("[whats-new] mail API unreachable, nothing recorded:", err.message);
        return { ...report, pending: recipients.length - i, skipped: "offline" };
      }
      report.failed++;
      console.error(`[whats-new] send failed for ${r.key.slice(0, 12)}:`, err instanceof Error ? err.message : "unknown");
    }
    if (progress && (i + 1 - start) % CURSOR_EVERY === 0) await progress.set(`cursor:${digest.day}`, i + 1);
    if (gap > 0 && i < recipients.length - 1) await pause(gap);
  }
  await record();
  if (progress) {
    if (report.pending === 0) await progress.set(`done:${digest.day}`, clock());
    else await progress.set(`cursor:${digest.day}`, recipients.length - report.pending);
  }
  return report;
}
