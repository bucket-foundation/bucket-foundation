import { graphService } from "@/lib/research-os/db";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";
import { hashContact, payeeFor, type PayeeType } from "@/lib/research-os/consent-paths";
import type { BirthYearBucket } from "@/lib/research-os/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SALT = process.env.RESEARCH_OS_HASH_SALT || process.env.NEXT_PUBLIC_SUPABASE_URL || "bucket";

type Row = { birth_year_bucket: string | null; payee_type: PayeeType | null; guardian_contact_hash: string | null; payee_visibility: boolean | null };

type Loaded = { ok: true; row: Row | null } | { ok: false };

async function load(learnerId: string): Promise<Loaded> {
  const { data, error } = await graphService().from("learner_profiles").select("birth_year_bucket,payee_type,guardian_contact_hash,payee_visibility").eq("learner_id", learnerId).maybeSingle();
  if (error) {
    console.error("[research-os/payee] learner_profiles read failed:", error.message);
    return { ok: false };
  }
  return { ok: true, row: (data as Row | null) ?? null };
}

const unavailable = () => bad(503, "profile_unavailable");

function shape(row: Row | null) {
  const decision = payeeFor({
    birthYearBucket: (row?.birth_year_bucket as BirthYearBucket | null) ?? null,
    payeeType: row?.payee_type ?? null,
    guardianContactHash: row?.guardian_contact_hash ?? null,
  });
  return { payeeType: row?.payee_type ?? null, hasGuardianContact: Boolean(row?.guardian_contact_hash), visibility: row?.payee_visibility ?? true, decision };
}

export const GET = withResearchOsRoute({ auth: "required" }, async (_req, { learnerId }) => {
  const loaded = await load(learnerId);
  return loaded.ok ? shape(loaded.row) : unavailable();
});

export const POST = withResearchOsRoute({ auth: "required" }, async (req, { learnerId }) => {
  const read = await readAnyJson(req);
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as { payeeType?: string; guardianContact?: string; visibility?: boolean };
  if (!["self", "guardian", "custodial"].includes(body.payeeType || "")) return bad(400, "bad_payee_type");
  const existing = await load(learnerId);
  if (!existing.ok) return unavailable();
  if (!existing.row) return bad(404, "no_profile");
  const update: Record<string, unknown> = { payee_type: body.payeeType, updated_at: new Date().toISOString() };
  if (typeof body.visibility === "boolean") update.payee_visibility = body.visibility;
  if (body.guardianContact?.trim()) update.guardian_contact_hash = await hashContact(body.guardianContact, SALT);
  const { error } = await graphService().from("learner_profiles").update(update).eq("learner_id", learnerId);
  if (error) return bad(500, "write_failed");
  const saved = await load(learnerId);
  return saved.ok ? shape(saved.row) : unavailable();
});
