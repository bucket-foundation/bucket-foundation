export const DEFAULT_SYNC_BASE = "https://bucket.foundation";
export const CANONICAL_HOSTS: Readonly<Record<string, string>> = { "bucket.foundation": "www.bucket.foundation" };

export function canonicalSyncBase(base: string): string {
  const u = new URL(base);
  const host = CANONICAL_HOSTS[u.hostname];
  if (host && u.protocol === "https:") u.hostname = host;
  return u.origin + u.pathname.replace(/\/$/, "");
}
