/**
 * Research OS, the payee (ros-32). A contributor under 18 is paid through a
 * guardian or a custodial account; the guardian sees every payment.
 *
 * GET  /api/research-os/payee  -> { payeeType, hasGuardianContact, visibility, decision }
 * POST /api/research-os/payee  { payeeType: "self" | "guardian" | "custodial", guardianContact?: string, visibility?: boolean }
 *   The contact is hashed with RESEARCH_OS_HASH_SALT and never stored in clear.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService, verifyLearner } from "@/lib/research-os/db";
import { hashContact, payeeFor, type PayeeType } from "@/lib/research-os/consent-paths";
import type { BirthYearBucket } from "@/lib/research-os/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status, ...NO_STORE });
}
const SALT = process.env.RESEARCH_OS_HASH_SALT || process.env.NEXT_PUBLIC_SUPABASE_URL || "bucket";

type Row = { birth_year_bucket: string | null; payee_type: PayeeType | null; guardian_contact_hash: string | null; payee_visibility: boolean | null };

async function load(learnerId: string): Promise<Row | null> {
  const { data } = await graphService().from("learner_profiles").select("birth_year_bucket,payee_type,guardian_contact_hash,payee_visibility").eq("learner_id", learnerId).maybeSingle();
  return (data as Row | null) ?? null;
}

function shape(row: Row | null) {
  const decision = payeeFor({
    birthYearBucket: (row?.birth_year_bucket as BirthYearBucket | null) ?? null,
    payeeType: row?.payee_type ?? null,
    guardianContactHash: row?.guardian_contact_hash ?? null,
  });
  return { payeeType: row?.payee_type ?? null, hasGuardianContact: Boolean(row?.guardian_contact_hash), visibility: row?.payee_visibility ?? true, decision };
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");
  return NextResponse.json(shape(await load(learnerId)), NO_STORE);
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");
  let body: { payeeType?: string; guardianContact?: string; visibility?: boolean };
  try {
    body = await req.json();
  } catch {
    return bad(400, "bad_json");
  }
  if (!["self", "guardian", "custodial"].includes(body.payeeType || "")) return bad(400, "bad_payee_type");
  const existing = await load(learnerId);
  if (!existing) return bad(404, "no_profile");
  const update: Record<string, unknown> = { payee_type: body.payeeType, updated_at: new Date().toISOString() };
  if (typeof body.visibility === "boolean") update.payee_visibility = body.visibility;
  if (body.guardianContact?.trim()) update.guardian_contact_hash = await hashContact(body.guardianContact, SALT);
  const { error } = await graphService().from("learner_profiles").update(update).eq("learner_id", learnerId);
  if (error) return bad(500, "write_failed");
  return NextResponse.json(shape(await load(learnerId)), NO_STORE);
}
