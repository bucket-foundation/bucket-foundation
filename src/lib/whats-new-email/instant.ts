import type { MarkStore } from "../download/marks";
import type { DocStore } from "../whats-new/store";
import { buildDigest, renderDigest, utcDay, type RawEntry } from "./digest";
import { sendOne, SEND_GAP_MS, Unreachable, type DigestConfig, type DigestLedger, type Recipient } from "./send";
import { unsubscribeUrl } from "./unsubscribe";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export const INSTANT_MARK = "instant";
const QUEUE = "digest/instant-queue-";

export interface InstantReport {
  id: string;
  recipients: number;
  sent: number;
  failed: number;
  pending: number;
  skipped?: "retracted" | "done" | "offline" | "mailed";
}

export async function queueInstant(store: DocStore, id: string, at: number): Promise<void> {
  await store.write(`${QUEUE}${id}.json`, JSON.stringify({ id, queued_at: new Date(at).toISOString() }));
}

export async function queuedInstant(store: DocStore): Promise<string[]> {
  const names = await store.list("digest");
  return names.filter((n) => n.startsWith("instant-queue-") && n.endsWith(".json")).map((n) => n.slice("instant-queue-".length, -".json".length)).sort();
}

async function dequeue(store: DocStore, id: string): Promise<void> {
  await store.remove(`${QUEUE}${id}.json`);
}

export async function sendInstant(opts: {
  id: string;
  entries: () => Promise<readonly (RawEntry & { published_at?: unknown })[]>;
  store: DocStore;
  ledger: DigestLedger;
  recipients: () => Promise<Recipient[]>;
  config: DigestConfig;
  progress: MarkStore;
  now: number;
  fetcher?: Fetch;
  deadline?: number;
  clock?: () => number;
  gapMs?: number;
}): Promise<InstantReport> {
  const { id, store, ledger, progress, config } = opts;
  const fetcher = opts.fetcher ?? fetch;
  const clock = opts.clock ?? Date.now;
  const base: InstantReport = { id, recipients: 0, sent: 0, failed: 0, pending: 0 };
  const entry = (await opts.entries()).find((e) => e.id === id && e.category === "production" && typeof e.published_at === "string");
  if (!entry) {
    await dequeue(store, id);
    return { ...base, skipped: "retracted" };
  }
  const mailed = await ledger.mailedOn(id);
  if (mailed !== null && mailed !== INSTANT_MARK) {
    await dequeue(store, id);
    return { ...base, skipped: "mailed" };
  }
  if ((await progress.get(`instant-done:${id}`)) !== null) {
    await dequeue(store, id);
    return { ...base, skipped: "done" };
  }
  const day = utcDay(opts.now);
  const digest = buildDigest([{ ...entry, date: day }], day);
  if (digest.count === 0) {
    await dequeue(store, id);
    return { ...base, skipped: "retracted" };
  }
  const subject = `New on Bucket: ${digest.groups[0].items[0].title}`;
  const recipients = await opts.recipients();
  const start = Math.min((await progress.get(`instant-cursor:${id}`)) ?? 0, recipients.length);
  const report: InstantReport = { ...base, recipients: recipients.length };
  const gap = opts.gapMs ?? SEND_GAP_MS;
  let marked = mailed === INSTANT_MARK;
  for (let i = start; i < recipients.length; i++) {
    if (opts.deadline !== undefined && clock() > opts.deadline) {
      report.pending = recipients.length - i;
      break;
    }
    const r = recipients[i];
    const unsub = unsubscribeUrl(r.email, config.secret);
    try {
      await sendOne(fetcher, config, r, `instant-${id}`, renderDigest(digest, unsub, config.postalAddress, subject), unsub);
      report.sent++;
      if (!marked) {
        await ledger.markMailed(id, INSTANT_MARK);
        marked = true;
      }
    } catch (err) {
      if (err instanceof Unreachable && report.sent === 0 && report.failed === 0) {
        console.error("[whats-new] mail API unreachable, the instant email stays queued:", err.message);
        return { ...report, pending: recipients.length - i, skipped: "offline" };
      }
      report.failed++;
      console.error(`[whats-new] instant send failed for ${r.key.slice(0, 12)}:`, err instanceof Error ? err.message : "unknown");
    }
    if (gap > 0 && i < recipients.length - 1) await new Promise((resolve) => setTimeout(resolve, gap));
  }
  if (!marked) await ledger.markMailed(id, INSTANT_MARK);
  if (report.pending === 0) {
    await progress.set(`instant-done:${id}`, clock());
    await dequeue(store, id);
  } else {
    await progress.set(`instant-cursor:${id}`, recipients.length - report.pending);
  }
  return report;
}
