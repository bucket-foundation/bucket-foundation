import { NextRequest, NextResponse } from "next/server";
import { toCsv } from "@/lib/waitlist/core";
import { captureRequest } from "@/lib/capture/server";
import { adminKeyMatches, getWaitlistStore, listSignups } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" };

function clientIp(req: NextRequest): string {
  return req.ip || req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send the form as JSON." }, 400);
  }
  const result = await captureRequest({ ...(body && typeof body === "object" ? body : {}), source: "wall" }, clientIp(req));
  return json(result.body, result.status);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!adminKeyMatches(given, process.env.WAITLIST_ADMIN_KEY)) {
    return new NextResponse("Not Found", { status: 404, headers: { ...NO_STORE, "content-type": "text/plain; charset=utf-8" } });
  }

  const store = getWaitlistStore();
  if (!store) return json({ error: "No Blob store is connected to this deployment." }, 503);

  const suspectStore = getWaitlistStore(process.env, "suspect");
  let entries;
  let suspects;
  try {
    [entries, suspects] = await Promise.all([listSignups(store), suspectStore ? listSignups(suspectStore) : []]);
  } catch (err) {
    console.error("[waitlist] list failed:", err instanceof Error ? err.message : err);
    return json({ error: "The list did not load. Try again in a minute." }, 502);
  }

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const day = new Date().toISOString().slice(0, 10);
    return new NextResponse(toCsv(entries), {
      headers: {
        ...NO_STORE,
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="bucket-launch-list-${day}.csv"`,
      },
    });
  }
  return json({ store: store.kind, prefix: store.prefix, count: entries.length, entries, suspects });
}
