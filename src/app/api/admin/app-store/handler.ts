import { NextResponse, type NextRequest } from "next/server";
import { summarizeStoreEvents, type AppStoreEventStore } from "@/lib/app-store/store";
import { adminKeyMatches } from "@/lib/waitlist/store";

const NO_STORE = { "cache-control": "no-store" };
export const STORE_WINDOW_DAYS = 90;

export interface StoreAdminDeps {
  adminKey: () => string | undefined;
  store: () => AppStoreEventStore | null;
  now?: () => Date;
}

export async function handleStoreSummary(req: NextRequest, deps: StoreAdminDeps): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!adminKeyMatches(given, deps.adminKey())) {
    return new NextResponse("Not Found", { status: 404, headers: { ...NO_STORE, "content-type": "text/plain; charset=utf-8" } });
  }
  const store = deps.store();
  if (!store) return NextResponse.json({ error: "store_unavailable" }, { status: 503, headers: NO_STORE });
  const now = deps.now?.() ?? new Date();
  try {
    const rows = await store.since(new Date(now.getTime() - STORE_WINDOW_DAYS * 86_400_000).toISOString());
    const includeSandbox = req.nextUrl.searchParams.get("sandbox") === "include";
    return NextResponse.json(summarizeStoreEvents(rows, STORE_WINDOW_DAYS, includeSandbox), { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/app-store] summary failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "summary_failed" }, { status: 502, headers: NO_STORE });
  }
}
