import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { jsonResponse } from "@/lib/academy/device-server";
import { deckHandlerFor } from "@/lib/polingual/deck-store";
import { handleLookup } from "@/lib/polingual/lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = (process.env.POLINGUAL_API_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.POLINGUAL_TIMEOUT_MS ?? "4000");

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

export async function GET(req: NextRequest): Promise<Response> {
  const sp = new URL(req.url).searchParams;
  const deck = deckHandlerFor(req);
  try {
    const r = await handleLookup(
      {
        fetchJson,
        userId: async () => (req.headers.get("authorization") ? ((await verifyRequestUser(req))?.id ?? null) : null),
        addCard: async (_uid, card) => {
          const s = await deck.save(card);
          return { ok: s.status === 200 || s.status === 201, duplicate: s.status === 200 };
        },
      },
      { surface: sp.get("surface") ?? "", from: sp.get("from") ?? "en", to: sp.get("to"), deck: sp.get("deck") },
    );
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual lookup", e);
    return jsonResponse({ error: "lookup_failed" }, 502);
  }
}
