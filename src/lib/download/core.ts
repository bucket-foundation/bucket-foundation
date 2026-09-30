import { parseSignup, type SignupInput, type WaitlistEntry } from "../waitlist/core";

export const DOWNLOAD_PLATFORMS = ["linux-x64", "linux-arm64", "macos-arm64", "windows-x64"] as const;
export type DownloadPlatform = (typeof DOWNLOAD_PLATFORMS)[number];

export const CONSENT_VERSION = "download-consent-2026-09-29";
export const RETENTION_MONTHS = 12;
export const RETENTION_DAYS = 365;
const DAY_MS = 86_400_000;

export interface DownloadRequest {
  input: SignupInput;
  platform: DownloadPlatform | null;
}

export type ParsedDownload = { ok: true; request: DownloadRequest; suspect: boolean } | { ok: false; error: string };

export function parseDownload(body: unknown): ParsedDownload {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const parsed = parseSignup({ email: b.email, name: b.name, website: b.website, whats_new_daily: b.whats_new_daily });
  if (!parsed.ok) return parsed;
  if (b.consent !== true) return { ok: false, error: "Tick the box to agree before we store your email." };
  const platform = (DOWNLOAD_PLATFORMS as readonly unknown[]).includes(b.platform) ? (b.platform as DownloadPlatform) : null;
  const wanted = platform ? `/download?platform=${platform}` : null;
  return { ok: true, request: { input: { ...parsed.input, role: null, wanted, consent_version: CONSENT_VERSION }, platform }, suspect: parsed.suspect };
}

export function sentMessage(outcome: string): string {
  if (outcome === "sent") return "A download link that works for 24 hours is on its way to";
  if (outcome === "cooldown") return "We emailed a link within the last hour. Check your inbox at";
  return "Your request is saved. Downloads are not open yet; we will write when they are, to";
}

export function isExpired(entry: WaitlistEntry, now: Date, days = RETENTION_DAYS): boolean {
  const last = Date.parse(entry.updated_at);
  return Number.isFinite(last) && now.getTime() - last > days * DAY_MS;
}
