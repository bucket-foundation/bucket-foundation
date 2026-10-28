import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { clientIp } from "@/lib/academy/session-server";
import { deckHandlerFor } from "@/lib/polingual/deck-store";
import { LOOKUP_IP_LIMIT, LOOKUP_MAX_INFLIGHT, LOOKUP_WINDOW_S, createGate, createMemoryRate, handleLookup, type LookupQuery } from "@/lib/polingual/lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = (process.env.POLINGUAL_API_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.POLINGUAL_TIMEOUT_MS ?? "4000");
const gate = createGate(LOOKUP_MAX_INFLIGHT);
const rateHit = createMemoryRate();

async function fetchJson(path: string, params: Record<string, string>): Promise<Record<string, unknown> | null> {
  if (!UPSTREAM) return null;
  const u = new URL(UPSTREAM + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  try {
    const res = await fetch(u, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/json" } });
    if (res.status >= 500) {
      console.error("polingual lookup upstream", path, res.status);
      return null;
    }
    return (await res.json()) as Record<string, unknown>;
  } catch (e) {
    console.error("polingual lookup upstream", path, e instanceof Error ? e.message : e);
    return null;
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : null);

async function run(req: NextRequest, q: LookupQuery): Promise<Response> {
  if (!(await rateHit(`lookup:ip:${clientIp(req.headers)}`, LOOKUP_IP_LIMIT, LOOKUP_WINDOW_S))) {
    return jsonResponse({ error: "too_many_requests" }, 429);
  }
  const deck = deckHandlerFor(req);
  try {
    const r = await gate(
      () =>
        handleLookup(
          {
            fetchJson,
            userId: async () => (await verifyRequestUser(req))?.id ?? null,
            addCard: async (_uid, card) => {
              const s = await deck.save(card);
              return { ok: s.status === 200 || s.status === 201, duplicate: s.status === 200 };
            },
          },
          q,
        ),
      () => ({ status: 503, body: { error: "busy" } }),
    );
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual lookup", e);
    return jsonResponse({ error: "lookup_failed" }, 502);
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  const sp = new URL(req.url).searchParams;
  return run(req, { surface: sp.get("surface") ?? "", from: sp.get("from") ?? "en", to: sp.get("to"), deck: null, save: false });
}

export async function POST(req: NextRequest): Promise<Response> {
  const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
  return run(req, { surface: str(b.surface) ?? "", from: str(b.from) ?? "en", to: str(b.to), deck: str(b.deck), save: b.save === true });
}
