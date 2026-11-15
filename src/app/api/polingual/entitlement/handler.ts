import { NextResponse, type NextRequest } from "next/server";
import type { RequestUser } from "@/lib/auth/verify";
import type { EntitlementStore } from "@/lib/polingual/entitlement";

const NO_STORE = { "cache-control": "no-store" };

export interface EntitlementDeps {
  verifyUser: (req: NextRequest) => Promise<RequestUser | null>;
  store: () => EntitlementStore | null;
}

function reply(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function handleEntitlement(req: NextRequest, deps: EntitlementDeps): Promise<NextResponse> {
  const store = deps.store();
  if (!store) return reply({ error: "entitlement_unavailable" }, 503);
  const user = await deps.verifyUser(req);
  if (!user) return reply({ error: "unauthorized" }, 401);
  try {
    return reply({ founding: await store.isFoundingTester(user.id) }, 200);
  } catch (err) {
    console.error("[polingual/entitlement] read failed:", err instanceof Error ? err.message : err);
    return reply({ error: "entitlement_failed" }, 500);
  }
}
