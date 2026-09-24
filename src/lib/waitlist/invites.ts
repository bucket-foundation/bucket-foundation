import { promises as fs } from "node:fs";
import path from "node:path";
import { get, list, put } from "@vercel/blob";
import { safeNextPath } from "../auth/paths";
import { normalizeEmail, parseEntry, type WaitlistEntry, type WaitlistRole } from "./core";
import { emailKey, waitlistPrefix } from "./store";

type Env = Record<string, string | undefined>;

export const WAVE_SIZE = 50;
export const SITE_URL = "https://www.bucket.foundation";
export const FIRST_ROUTE = "/research-os/learn";

export type InviteStatus = "pending" | "sent" | "failed" | "unsubscribed" | "bounced";

export interface InviteRecord {
  key: string;
  status: InviteStatus;
  wave: number | null;
  updated_at: string;
  invited_at: string | null;
  provider: string | null;
  message_id: string | null;
  error: string | null;
}

export interface InviteStore {
  kind: "blob" | "file" | "memory";
  read(key: string): Promise<InviteRecord | null>;
  create(key: string, record: InviteRecord): Promise<boolean>;
  write(key: string, record: InviteRecord): Promise<void>;
  keys(): Promise<string[]>;
}

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  name: string;
  send(email: OutboundEmail): Promise<{ id: string }>;
}

export type SkipReason = "already_invited" | "suppressed" | "role_held" | "wave_full";

export interface Candidate {
  key: string;
  entry: WaitlistEntry;
  retry: boolean;
}

export interface WavePlan {
  wave: number;
  picked: Candidate[];
  skipped: Record<SkipReason, number>;
}

const HELD_ROLES: readonly (WaitlistRole | null)[] = ["teacher", "parent"];
const LATER_ROLES: readonly (WaitlistRole | null)[] = ["researcher"];
const BLOCKING: readonly InviteStatus[] = ["pending", "sent"];
const SUPPRESSING: readonly InviteStatus[] = ["unsubscribed", "bounced"];

export function roleEligible(role: WaitlistRole | null, wave: number): boolean {
  if (HELD_ROLES.includes(role)) return false;
  if (LATER_ROLES.includes(role)) return wave >= 2;
  return true;
}

export function planWave(entries: WaitlistEntry[], invites: Map<string, InviteRecord>, wave: number, size = WAVE_SIZE): WavePlan {
  if (!Number.isInteger(wave) || wave < 1) throw new Error("wave must be a whole number from 1");
  const cap = Math.min(Math.max(1, Math.floor(size)), WAVE_SIZE);
  const skipped: Record<SkipReason, number> = { already_invited: 0, suppressed: 0, role_held: 0, wave_full: 0 };
  const picked: Candidate[] = [];
  const seen = new Set<string>();
  const ordered = [...entries].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.email.localeCompare(b.email)));
  for (const entry of ordered) {
    const key = emailKey(entry.email);
    if (seen.has(key)) continue;
    seen.add(key);
    const record = invites.get(key);
    if (record && SUPPRESSING.includes(record.status)) skipped.suppressed++;
    else if (record && BLOCKING.includes(record.status)) skipped.already_invited++;
    else if (!roleEligible(entry.role, wave)) skipped.role_held++;
    else if (picked.length >= cap) skipped.wave_full++;
    else picked.push({ key, entry, retry: record?.status === "failed" });
  }
  return { wave, picked, skipped };
}

export function inviteLink(entry: Pick<WaitlistEntry, "wanted">): string {
  const next = entry.wanted ? safeNextPath(entry.wanted) : FIRST_ROUTE;
  return `${SITE_URL}/sign-in?next=${encodeURIComponent(next)}`;
}

export function renderInvite(entry: Pick<WaitlistEntry, "email" | "name" | "wanted">, wave: number): OutboundEmail {
  const first = entry.name?.split(" ")[0]?.replace(/[<>&"\\/:;@(){}[\]]/g, "") ?? "";
  const text = [
    first ? `Hi ${first},` : "Hello,",
    "",
    `You joined the Bucket launch list, and your place in wave ${wave} has come up. Research OS is open for you today.`,
    "",
    `Sign in with this email address at ${inviteLink(entry)}`,
    "We email you a one-time code to type in, and you are in.",
    "",
    "This first wave is open to adults, 18 and over. The first screen asks your age.",
    "Learn is the part to start with: pick a deck, answer a short placement, then study today's route.",
    "",
    "To stop these emails, reply with the word stop and we take you off the list.",
    "",
    "Bucket Foundation",
    SITE_URL,
    "",
  ].join("\n");
  return { to: entry.email, subject: "Research OS is open for you", text };
}

export function logId(key: string): string {
  return key.slice(0, 12);
}

export function scrubEmails(message: string): string {
  return message.replace(/[^\s<>"'@]+@[^\s<>"'@]+/g, "[email]").slice(0, 300);
}

function record(key: string, status: InviteStatus, now: string, extra: Partial<InviteRecord> = {}): InviteRecord {
  return { key, status, wave: null, updated_at: now, invited_at: null, provider: null, message_id: null, error: null, ...extra };
}

export interface SendResult {
  sent: string[];
  failed: string[];
  lost: string[];
}

export async function sendWave(plan: WavePlan, store: InviteStore, provider: EmailProvider, now: () => string = () => new Date().toISOString()): Promise<SendResult> {
  const out: SendResult = { sent: [], failed: [], lost: [] };
  for (const c of plan.picked) {
    const claim = record(c.key, "pending", now(), { wave: plan.wave, provider: provider.name });
    if (c.retry) {
      const current = await store.read(c.key);
      if (current?.status !== "failed") {
        out.lost.push(logId(c.key));
        continue;
      }
      await store.write(c.key, claim);
    } else if (!(await store.create(c.key, claim))) {
      out.lost.push(logId(c.key));
      continue;
    }
    try {
      const { id } = await provider.send(renderInvite(c.entry, plan.wave));
      const at = now();
      await store.write(c.key, { ...claim, status: "sent", updated_at: at, invited_at: at, message_id: id });
      out.sent.push(logId(c.key));
    } catch (err) {
      const message = scrubEmails(err instanceof Error ? err.message : String(err));
      await store.write(c.key, { ...claim, status: "failed", updated_at: now(), error: message });
      out.failed.push(logId(c.key));
    }
  }
  return out;
}

export async function suppress(store: InviteStore, rawEmail: string, status: "unsubscribed" | "bounced", now = new Date().toISOString()): Promise<string> {
  const email = normalizeEmail(rawEmail);
  if (!email) throw new Error("not a valid email address");
  const key = emailKey(email);
  const prior = await store.read(key);
  await store.write(key, { ...(prior ?? record(key, status, now)), status, updated_at: now });
  return logId(key);
}

export async function loadInvites(store: InviteStore): Promise<Map<string, InviteRecord>> {
  const out = new Map<string, InviteRecord>();
  for (const key of await store.keys()) {
    const r = await store.read(key);
    if (r) out.set(key, r);
  }
  return out;
}

export function parseInvite(raw: unknown): InviteRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const statuses: InviteStatus[] = ["pending", "sent", "failed", "unsubscribed", "bounced"];
  if (typeof r.key !== "string" || !/^[0-9a-f]{64}$/.test(r.key) || !statuses.includes(r.status as InviteStatus)) return null;
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    key: r.key,
    status: r.status as InviteStatus,
    wave: typeof r.wave === "number" ? r.wave : null,
    updated_at: str(r.updated_at) ?? "",
    invited_at: str(r.invited_at),
    provider: str(r.provider),
    message_id: str(r.message_id),
    error: str(r.error),
  };
}

function parseJson(text: string): InviteRecord | null {
  try {
    return parseInvite(JSON.parse(text));
  } catch {
    return null;
  }
}

export function invitePrefix(env: Env = process.env): string {
  return waitlistPrefix(env) + "invites/";
}

function keyFromName(name: string, prefix: string): string | null {
  const m = name.slice(prefix.length).match(/^([0-9a-f]{64})\.json$/);
  return name.startsWith(prefix) && m ? m[1] : null;
}

export function fileInviteStore(root: string, prefix: string): InviteStore {
  const dir = path.join(root, prefix);
  const file = (key: string) => path.join(dir, `${key}.json`);
  return {
    kind: "file",
    async read(key) {
      try {
        return parseJson(await fs.readFile(file(key), "utf8"));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
    async create(key, value) {
      await fs.mkdir(dir, { recursive: true });
      try {
        await fs.writeFile(file(key), JSON.stringify(value), { encoding: "utf8", flag: "wx" });
        return true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
        throw err;
      }
    },
    async write(key, value) {
      await fs.mkdir(dir, { recursive: true });
      const tmp = `${file(key)}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(value), "utf8");
      await fs.rename(tmp, file(key));
    },
    async keys() {
      try {
        return (await fs.readdir(dir)).map((n) => keyFromName(prefix + n, prefix)).filter((k): k is string => k !== null);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw err;
      }
    },
  };
}

export function blobInviteStore(prefix: string): InviteStore {
  const put_ = (key: string, value: InviteRecord, allowOverwrite: boolean) =>
    put(`${prefix}${key}.json`, JSON.stringify(value), { access: "private", addRandomSuffix: false, allowOverwrite, contentType: "application/json" });
  const store: InviteStore = {
    kind: "blob",
    async read(key) {
      const res = await get(`${prefix}${key}.json`, { access: "private", useCache: false }).catch((err: unknown) => {
        if (err instanceof Error && err.name === "BlobNotFoundError") return null;
        throw err;
      });
      if (!res || res.statusCode !== 200) return null;
      return parseJson(await new Response(res.stream).text());
    },
    async create(key, value) {
      try {
        await put_(key, value, false);
        return true;
      } catch (err) {
        if ((await store.read(key)) !== null) return false;
        throw err;
      }
    },
    async write(key, value) {
      await put_(key, value, true);
    },
    async keys() {
      const out: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        for (const b of page.blobs) {
          const k = keyFromName(b.pathname, prefix);
          if (k) out.push(k);
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out;
    },
  };
  return store;
}

export function getInviteStore(env: Env = process.env, root = process.cwd()): InviteStore | null {
  const prefix = invitePrefix(env);
  if (env.BLOB_READ_WRITE_TOKEN?.trim() || env.BLOB_STORE_ID?.trim()) return blobInviteStore(prefix);
  if (!env.VERCEL_ENV && !env.VERCEL) return fileInviteStore(path.join(root, ".data"), prefix);
  return null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export function entriesFromCsv(text: string): WaitlistEntry[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const col = (name: string) => header.indexOf(name);
  if (col("email") < 0 || col("created_at") < 0) throw new Error("the CSV needs email and created_at columns");
  const unguard = (s: string) => (/^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s);
  const out: WaitlistEntry[] = [];
  for (const r of rows) {
    const obj: Record<string, unknown> = {};
    header.forEach((h, i) => {
      const v = unguard(r[i] ?? "");
      obj[h] = h === "signups" ? Number(v) : v;
    });
    const entry = parseEntry(obj);
    if (entry) out.push(entry);
  }
  return out;
}
