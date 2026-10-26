import { NextResponse, type NextRequest } from "next/server";
import type { RequestUser } from "@/lib/auth/verify";
import { JwsError, type VerifyOptions } from "@/lib/app-store/jws";
import { decodeNotification } from "@/lib/app-store/notifications";
import type { AppStoreEventStore } from "@/lib/app-store/store";

export const MAX_NOTIFICATION_BYTES = 65_536;
const NO_STORE = { "cache-control": "no-store" };

export interface NotificationDeps {
  store: () => AppStoreEventStore | null;
  bundleIds: () => string[];
  verify?: VerifyOptions;
}

function reply(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export const DEFAULT_BUNDLE_IDS = ["foundation.bucket.app", "com.polingual.app"] as const;

export function parseBundleIds(raw: string | undefined): string[] {
  const ids = (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length > 0 ? ids : [...DEFAULT_BUNDLE_IDS];
}

export async function handleNotification(req: NextRequest, deps: NotificationDeps): Promise<NextResponse> {
  const store = deps.store();
  if (!store) return reply({ error: "unavailable" }, 503);
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_NOTIFICATION_BYTES) return reply({ error: "too_large" }, 413);
  let signedPayload: unknown;
  try {
    signedPayload = (JSON.parse(text) as { signedPayload?: unknown } | null)?.signedPayload;
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  if (typeof signedPayload !== "string") return reply({ error: "bad_request" }, 400);
  let event;
  try {
    event = decodeNotification(signedPayload, deps.verify);
  } catch (err) {
    const reason = err instanceof JwsError ? err.message : err instanceof Error ? err.message : "invalid";
    console.warn("[app-store/notifications] rejected:", reason);
    return reply({ error: "invalid_payload" }, 400);
  }
  const allowed = deps.bundleIds();
  if (!event.bundleId || !allowed.includes(event.bundleId)) return reply({ outcome: "ignored" }, 200);
  try {
    const outcome = await store.save(event);
    return reply({ outcome }, 200);
  } catch (err) {
    console.error("[app-store/notifications] write failed:", err instanceof Error ? err.message : err);
    return reply({ error: "write_failed" }, 500);
  }
}

export interface TokenDeps {
  store: () => AppStoreEventStore | null;
  verifyUser: (req: NextRequest) => Promise<RequestUser | null>;
}

export async function handleAccountToken(req: NextRequest, deps: TokenDeps): Promise<NextResponse> {
  const store = deps.store();
  if (!store) return reply({ error: "unavailable" }, 503);
  const user = await deps.verifyUser(req);
  if (!user) return reply({ error: "unauthorized" }, 401);
  try {
    return reply({ app_account_token: await store.tokenFor(user.id) }, 200);
  } catch (err) {
    console.error("[app-store/account-token] failed:", err instanceof Error ? err.message : err);
    return reply({ error: "write_failed" }, 500);
  }
}
