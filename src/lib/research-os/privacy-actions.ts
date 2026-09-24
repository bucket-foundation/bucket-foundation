import { DELETE_CONFIRM_TOKEN } from "./types";
import { OUTAGE_COPY, isTransientOutage } from "./outage";

export const PRIVACY_ENDPOINT = "/api/research-os/privacy";

export type PrivacyOutcome = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

async function call(token: string, body: Record<string, unknown>, fallback: string, fetcher: Fetch): Promise<PrivacyOutcome> {
  try {
    const res = await fetcher(PRIVACY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const code = typeof data.error === "string" && data.error ? data.error : null;
    if (!res.ok) return { ok: false, error: isTransientOutage(res.status, code) ? OUTAGE_COPY.body : code ?? fallback };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "network_error" };
  }
}

export function deleteConfirmed(typed: string): boolean {
  return typed.trim() === DELETE_CONFIRM_TOKEN;
}

export function requestExport(token: string, fetcher: Fetch = fetch): Promise<PrivacyOutcome> {
  return call(token, { action: "export" }, "export_failed", fetcher);
}

export async function requestDelete(token: string, typed: string, fetcher: Fetch = fetch): Promise<PrivacyOutcome> {
  if (!deleteConfirmed(typed)) return { ok: false, error: "confirm_required" };
  return call(token, { action: "delete", confirm: DELETE_CONFIRM_TOKEN }, "delete_failed", fetcher);
}

export function exportFileName(now: Date): string {
  return `research-os-export-${now.toISOString().slice(0, 10)}.json`;
}
