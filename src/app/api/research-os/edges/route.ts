/**
 * /api/research-os/edges, the proposed-edge review queue: lexical
 * inference (scripts/research-os/ingest/infer-edges-llm.ts) and the
 * decompose-further queue (scripts/research-os/decompose-further.ts,
 * learning/research-os/PRIMES.md). The work lives in
 * src/lib/research-os/inference/review-actions.ts; this route adds the
 * reviewer gate and the JSON response.
 *
 * GET  ?source=inferred_llm|prime_decompose_llm (optional)
 *   -> { proposals }: every pending row, highest priority first. Priority
 *   weighs how uncertain the models were by how many idea nodes rest on the
 *   target, counted now (graph.idea_dependents).
 *
 * POST { id, decision: "approved" | "rejected", kind?, reason? }
 *   kind is "prerequisite" (learning order, feeds K-12 routing) or
 *   "derives_from" (the target rests on the factor). Decomposition
 *   proposals default to derives_from, lexical ones to prerequisite. An
 *   approval writes the edge at confidence 0.95, source "teacher", with
 *   provenance naming the proposal; a prerequisite approval rebuilds the
 *   ancestor closure of every branch it touches.
 *
 * Auth: Authorization: Bearer <supabase access token>, checked by
 * src/lib/research-os/reviewer.ts. 403 not a reviewer (also an unset
 * allowlist, fail closed) · 400 bad input · 404 proposal or node not found
 * · 409 approving would close a cycle (the proposal stays pending) · 500 a
 * read or write failed (the proposal stays pending) · 503 not configured.
 * Deciding an already-decided proposal returns alreadyDecided and writes
 * nothing.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService } from "@/lib/research-os/db";
import { verifyReviewer } from "@/lib/research-os/reviewer";
import { decideEdge, KINDS, listEdgeProposals } from "@/lib/research-os/inference/review-actions";
import type { ApprovedKind } from "@/lib/research-os/inference/decide";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (r: { status: number; body: Record<string, unknown> }) =>
  NextResponse.json(r.body, { status: r.status, headers: { "cache-control": "no-store" } });

export async function GET(req: NextRequest) {
  if (!configured()) return reply({ status: 503, body: { error: "research_os_unavailable" } });
  if (!(await verifyReviewer(req))) return reply({ status: 403, body: { error: "forbidden" } });
  return reply(await listEdgeProposals(graphService(), req.nextUrl.searchParams.get("source")));
}

interface Body {
  id?: string;
  decision?: "approved" | "rejected";
  kind?: string;
  reason?: string;
}

export async function POST(req: NextRequest) {
  if (!configured()) return reply({ status: 503, body: { error: "research_os_unavailable" } });
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return reply({ status: 403, body: { error: "forbidden" } });
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return reply({ status: 400, body: { error: "bad_request" } });
  }
  const id = (body.id || "").trim();
  if (!id) return reply({ status: 400, body: { error: "id is required" } });
  if (body.decision !== "approved" && body.decision !== "rejected") return reply({ status: 400, body: { error: "decision must be approved or rejected" } });
  if (body.kind !== undefined && !KINDS.has(body.kind as ApprovedKind)) return reply({ status: 400, body: { error: "kind must be prerequisite or derives_from" } });
  return reply(
    await decideEdge(graphService(), {
      id,
      decision: body.decision,
      kind: body.kind as ApprovedKind | undefined,
      reason: (body.reason || "").trim() || null,
      reviewerId: reviewer.id,
    }),
  );
}
