import { safeNextPath } from "../auth/paths";

export const WAITLIST_ROLES = ["student", "teacher", "researcher", "parent", "other"] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

export const NAME_MAX = 80;
export const RESEARCH_MAX = 160;

export interface OptIns {
  release_notes: boolean;
  daily_whats_new: boolean;
}
export const WANTED_MAX = 200;
const EMAIL_MAX = 254;

export interface WaitlistEntry {
  email: string;
  name: string | null;
  role: WaitlistRole | null;
  wanted: string | null;
  research?: string | null;
  optins?: OptIns;
  created_at: string;
  updated_at: string;
  signups: number;
  consent_at?: string;
  consent_version?: string;
}

export interface SignupInput {
  email: string;
  name: string | null;
  role: WaitlistRole | null;
  wanted: string | null;
  research?: string | null;
  optins?: OptIns;
  consent_version?: string;
}

export type ParsedSignup = { ok: true; input: SignupInput; suspect: boolean } | { ok: false; error: string };

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  let out = "";
  for (const ch of value) {
    const c = ch.charCodeAt(0);
    out += c < 32 || c === 127 ? " " : ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

export function normalizeEmail(raw: unknown): string | null {
  const email = clean(raw).toLowerCase();
  if (!email || email.length > EMAIL_MAX || email.includes(" ")) return null;
  const at = email.lastIndexOf("@");
  if (at < 1 || at > 64) return null;
  const domain = email.slice(at + 1);
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return null;
  if (domain.split(".").some((label) => !label || label.startsWith("-") || label.endsWith("-"))) return null;
  if (email.slice(0, at).includes("@")) return null;
  return email;
}

function normalizeWanted(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s || s.length > WANTED_MAX) return null;
  return safeNextPath(s) === s ? s : null;
}

export function parseSignup(body: unknown): ParsedSignup {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const suspect = clean(b.website) !== "";
  const email = normalizeEmail(b.email);
  if (!email) return { ok: false, error: "Enter a valid email address." };
  const name = clean(b.name).slice(0, NAME_MAX) || null;
  const roleRaw = clean(b.role).toLowerCase();
  const role = (WAITLIST_ROLES as readonly string[]).includes(roleRaw) ? (roleRaw as WaitlistRole) : null;
  return { ok: true, input: { email, name, role, wanted: normalizeWanted(b.wanted) }, suspect };
}

export function parseOptIns(raw: unknown): OptIns | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  return { release_notes: o.release_notes === true, daily_whats_new: o.daily_whats_new === true };
}

export function mergeEntry(existing: WaitlistEntry | null, input: SignupInput, now: string): WaitlistEntry {
  const { consent_version, ...fields } = input;
  const extra = {
    ...((input.research === undefined ? existing?.research : input.research) ? { research: input.research === undefined ? existing?.research : input.research } : {}),
    ...((input.optins ?? existing?.optins) ? { optins: input.optins ?? existing?.optins } : {}),
  };
  const consent = consent_version ? { consent_at: now, consent_version } : existing?.consent_version ? { consent_at: existing.consent_at, consent_version: existing.consent_version } : {};
  if (!existing) {
    return { ...fields, created_at: now, updated_at: now, signups: 1, ...consent };
  }
  return {
    email: existing.email,
    name: input.name ?? existing.name,
    role: input.role ?? existing.role,
    wanted: input.wanted ?? existing.wanted,
    created_at: existing.created_at,
    updated_at: now,
    signups: existing.signups + 1,
    ...extra,
    ...consent,
  };
}

export function parseEntry(raw: unknown): WaitlistEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const email = normalizeEmail(r.email);
  if (!email || typeof r.created_at !== "string") return null;
  const role = typeof r.role === "string" && (WAITLIST_ROLES as readonly string[]).includes(r.role) ? (r.role as WaitlistRole) : null;
  return {
    email,
    name: typeof r.name === "string" && r.name ? r.name : null,
    role,
    wanted: typeof r.wanted === "string" && r.wanted ? r.wanted : null,
    created_at: r.created_at,
    updated_at: typeof r.updated_at === "string" ? r.updated_at : r.created_at,
    signups: typeof r.signups === "number" && r.signups > 0 ? Math.floor(r.signups) : 1,
    ...(typeof r.research === "string" && r.research ? { research: r.research } : {}),
    ...(parseOptIns(r.optins) ? { optins: parseOptIns(r.optins) } : {}),
    ...(typeof r.consent_at === "string" && typeof r.consent_version === "string" ? { consent_at: r.consent_at, consent_version: r.consent_version } : {}),
  };
}

export function sortEntries(entries: WaitlistEntry[]): WaitlistEntry[] {
  return [...entries].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : a.email.localeCompare(b.email)));
}

export const CSV_COLUMNS = ["email", "name", "role", "wanted", "created_at", "updated_at", "signups"] as const;

export function csvCell(value: string | number | null): string {
  let s = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function toCsv(entries: WaitlistEntry[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const e of entries) lines.push(CSV_COLUMNS.map((c) => csvCell(e[c])).join(","));
  return lines.join("\r\n") + "\r\n";
}
