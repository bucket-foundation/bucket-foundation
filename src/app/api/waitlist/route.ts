/**
 * The launch list.
 *
 * POST { email, name?, role?, wanted? } adds an address or updates its
 * record. The answer is the same for a new and a known address, so the form
 * never tells a visitor who else signed up. A filled honeypot field saves the
 * signup under suspect/ for review. 503 when no store is connected, so
 * nothing is accepted and then lost.
 *
 * GET with `Authorization: Bearer <WAITLIST_ADMIN_KEY>` returns every entry
 * and the suspects as JSON, or the list as a CSV download with `?format=csv`.
 * 404 without the key.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseSignup, toCsv } from "@/lib/waitlist/core";
import { adminKeyMatches, getWaitlistStore, listSignups, saveSignup } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Listing reads one object per signup; room for a few thousand.
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" };

// Best-effort burst guard per client address, in memory like the Research OS
// limiter: a cold start resets it. Ten signups a minute is far above what a
// person sends.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function limited(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (limited(clientIp(req))) return json({ error: "Too many signups from here. Wait a minute and try again." }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send the form as JSON." }, 400);
  }

  const parsed = parseSignup(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const store = getWaitlistStore(process.env, parsed.suspect ? "suspect" : "list");
  if (!store) {
    console.error("[waitlist] no Blob store connected; signup refused");
    return json({ error: "The launch list is closed for a moment. Try again later." }, 503);
  }

  if (parsed.suspect) console.warn("[waitlist] honeypot field filled; signup held under suspect/");
  try {
    await saveSignup(store, parsed.input);
  } catch (err) {
    console.error("[waitlist] save failed:", err instanceof Error ? err.message : err);
    return json({ error: "Your signup did not save. Try again in a minute." }, 502);
  }
  return json({ ok: true });
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
