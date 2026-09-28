import type { NextRequest } from "next/server";
import { answer, clientAddress, readJson, unavailable } from "@/lib/research-os/advisors/gate";
import { OPENALEX_ID, ORCID_ID, requestOptOut } from "@/lib/research-os/advisors/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { openalexId?: unknown; orcid?: unknown; contact?: unknown; reason?: unknown; website?: unknown };

function normalizeOpenAlex(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const id = v.trim().replace(/^https?:\/\/(www\.)?openalex\.org\//i, "").toUpperCase();
  return OPENALEX_ID.test(id) ? id : "invalid";
}

function normalizeOrcid(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const id = v.trim().replace(/^https?:\/\/(www\.)?orcid\.org\//i, "").toUpperCase();
  return ORCID_ID.test(id) ? id : "invalid";
}

export async function POST(req: NextRequest) {
  const parsed = await readJson<Body>(req, 4096);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body ?? {};
  if (typeof body.website === "string" && body.website.trim()) return answer(200, { received: true });
  const openalexId = normalizeOpenAlex(body.openalexId);
  const orcid = normalizeOrcid(body.orcid);
  if (openalexId === "invalid" || orcid === "invalid") return answer(400, { error: "invalid_request", message: "Check the OpenAlex id or ORCID." });
  if (!openalexId && !orcid) return answer(400, { error: "invalid_request", message: "Give an OpenAlex id or an ORCID." });
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  if (contact.length < 3 || contact.length > 320) return answer(400, { error: "invalid_request", message: "Give a way to reach you." });
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  try {
    const outcome = await requestOptOut({ openalexId, orcid, contact, reason, source: clientAddress(req) });
    if (outcome === "rate_limited") return answer(429, { error: "rate_limited", message: "Too many requests from here. Try again in an hour." });
    return answer(200, { received: true, hidden: outcome === "hidden" });
  } catch (e) {
    return unavailable("optout", e);
  }
}
