import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { entitlementStoreConfigured, markTrialUsed } from "@/lib/billing/entitlement-store";
import { trialSources } from "@/lib/billing/trial-sources";
import { giftMailConfig } from "@/lib/billing/polingual-gift";
import { handleTrialUsedGet, handleTrialUsedPost, type TrialUsedDeps } from "@/lib/billing/trial-used";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function deps(req: NextRequest): TrialUsedDeps {
  const user = verifyRequestUser(req);
  return {
    userId: async () => (await user)?.id ?? null,
    sources: trialSources,
    mark: markTrialUsed,
    reminderEmail: async () => giftMailConfig(process.env) !== null && Boolean((await user)?.email),
  };
}

export async function GET(req: NextRequest): Promise<Response> {
  if (!entitlementStoreConfigured()) return jsonResponse({ error: "unavailable" }, 503);
  try {
    const r = await handleTrialUsedGet(deps(req));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual trial-used", e);
    return jsonResponse({ error: "unavailable" }, 503);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!entitlementStoreConfigured()) return jsonResponse({ error: "unavailable" }, 503);
  try {
    const r = await handleTrialUsedPost(deps(req), await readJson(req));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual trial-used", e);
    return jsonResponse({ error: "unavailable" }, 503);
  }
}
