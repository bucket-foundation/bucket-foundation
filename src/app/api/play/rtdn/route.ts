import { jsonResponse } from "@/lib/academy/device-server";
import { googleKeys } from "@/lib/academy/google-token";
import { entitlementStoreConfigured } from "@/lib/billing/entitlement-store";
import { handleRtdn } from "@/lib/billing/play";
import { rtdnConfig, verifyPubSubToken } from "@/lib/billing/play-google";
import { playDeps } from "@/lib/billing/play-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  if (!entitlementStoreConfigured()) return jsonResponse({ error: "unavailable" }, 503);
  const cfg = rtdnConfig(process.env);
  if (!cfg) {
    console.error("play rtdn: PLAY_RTDN_AUDIENCE and PLAY_RTDN_SERVICE_ACCOUNT must be set");
    return jsonResponse({ error: "unavailable" }, 503);
  }
  try {
    const authorized = await verifyPubSubToken(req.headers.get("authorization"), {
      ...cfg,
      keys: googleKeys(),
      now: Date.now(),
    });
    const body = await req.json().catch(() => null);
    const r = await handleRtdn(playDeps(), authorized, body);
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("play rtdn", e);
    return jsonResponse({ error: "unavailable" }, 503);
  }
}
