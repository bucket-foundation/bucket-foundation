/**
 * Research OS, consent paths (ros-32).
 *
 * GET  /api/research-os/consent
 *   learner: { profile: {birthYearBucket, consentStatus}, effective: {status, source, path},
 *              pathNeeded: none_needed | school | vendor | ask_age, requests: [...] }
 * POST /api/research-os/consent
 *   { action: "request", vendor: "privo" | "kid" | "manual", guardianContact?: string }
 *     learner starts verified parental consent; the contact is hashed, never stored.
 *   { action: "record", classId, learnerId, requestId?, status: "verified" | "declined", vendorRef? }
 *     class staff records a consent they verified out of band (the manual path).
 *   { action: "class_basis", classId, basis: "none" | "school", document?: string }
 *     class staff sets the school-exception basis on a class.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService, verifyLearner } from "@/lib/research-os/db";
import { verifyClassStaff } from "@/lib/research-os/class-db";
import { consentPathFor, hashContact, type ConsentRequestRecord } from "@/lib/research-os/consent-paths";
import { resolveConsentPaths, type BirthYearBucket, type ConsentStatus, type LearnerProfile } from "@/lib/research-os/consent";
import { vendorByName } from "@/lib/research-os/consent-vendor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status, ...NO_STORE });
}
const SALT = process.env.RESEARCH_OS_HASH_SALT || process.env.NEXT_PUBLIC_SUPABASE_URL || "bucket";

async function loadProfile(learnerId: string): Promise<LearnerProfile | null> {
  const { data } = await graphService().from("learner_profiles").select("*").eq("learner_id", learnerId).maybeSingle();
  if (!data) return null;
  const r = data as { learner_id: string; role: string; birth_year_bucket: string | null; consent_status: string; consent_source: string | null; updated_at: string };
  return {
    learnerId: r.learner_id,
    role: r.role as LearnerProfile["role"],
    birthYearBucket: (r.birth_year_bucket as BirthYearBucket | null) ?? null,
    consentStatus: r.consent_status as ConsentStatus,
    consentSource: r.consent_source,
    updatedAt: r.updated_at,
  };
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");
  const profile = await loadProfile(learnerId);
  const effective = profile ? await resolveConsentPaths(learnerId, profile) : { status: "none" as const, source: null, path: "none" as const };
  const { data: reqs } = await graphService()
    .from("consent_requests")
    .select("id,vendor,status,vendor_ref,created_at,decided_at")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });
  const requests = ((reqs as { id: string; vendor: ConsentRequestRecord["vendor"]; status: ConsentRequestRecord["status"]; vendor_ref: string | null; created_at: string }[]) || []).map((r) => ({
    id: r.id,
    vendor: r.vendor,
    status: r.status,
    vendorRef: r.vendor_ref,
    createdAt: r.created_at,
  }));
  return NextResponse.json(
    {
      profile: profile ? { birthYearBucket: profile.birthYearBucket, consentStatus: profile.consentStatus } : null,
      effective,
      pathNeeded: consentPathFor(profile?.birthYearBucket ?? null, effective.path === "school"),
      requests,
    },
    NO_STORE
  );
}

type Body =
  | { action: "request"; vendor: string; guardianContact?: string }
  | { action: "record"; classId: string; learnerId: string; requestId?: string; status: "verified" | "declined"; vendorRef?: string }
  | { action: "class_basis"; classId: string; basis: "none" | "school"; document?: string };

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad(400, "bad_json");
  }
  const svc = graphService();

  if (body.action === "request") {
    const learnerId = await verifyLearner(req);
    if (!learnerId) return bad(401, "unauthorized");
    const vendor = vendorByName(body.vendor || "");
    if (!vendor) return bad(400, "bad_vendor");
    const contactHash = body.guardianContact?.trim() ? await hashContact(body.guardianContact, SALT) : null;
    let started: { vendorRef: string; url: string | null };
    try {
      started = await vendor.start({ learnerId, guardianContactHash: contactHash });
    } catch {
      return bad(503, "vendor_not_configured");
    }
    const { data, error } = await svc
      .from("consent_requests")
      .insert({ learner_id: learnerId, vendor: vendor.name, vendor_ref: started.vendorRef, guardian_contact_hash: contactHash })
      .select("id")
      .single();
    if (error || !data) return bad(500, "write_failed");
    return NextResponse.json({ requestId: (data as { id: string }).id, vendorRef: started.vendorRef, url: started.url }, NO_STORE);
  }

  if (body.action === "record" || body.action === "class_basis") {
    if (!body.classId) return bad(400, "class_required");
    const staff = await verifyClassStaff(req, body.classId);
    if (!staff || !staff.roles.some((r) => r === "teacher" || r === "librarian")) return bad(403, "forbidden");

    if (body.action === "class_basis") {
      if (body.basis !== "none" && body.basis !== "school") return bad(400, "bad_basis");
      const { error } = await svc
        .from("classes")
        .update({ consent_basis: body.basis, consent_document: body.document?.trim().slice(0, 300) || null })
        .eq("id", body.classId);
      return error ? bad(500, "write_failed") : NextResponse.json({ ok: true }, NO_STORE);
    }

    if (!body.learnerId || (body.status !== "verified" && body.status !== "declined")) return bad(400, "learner_and_status_required");
    const { data: member } = await svc.from("class_members").select("learner_id").eq("class_id", body.classId).eq("learner_id", body.learnerId).maybeSingle();
    if (!member) return bad(404, "not_a_member");
    const now = new Date().toISOString();
    if (body.requestId) {
      const { error } = await svc
        .from("consent_requests")
        .update({ status: body.status, recorded_by: staff.id, decided_at: now, vendor_ref: body.vendorRef ?? undefined })
        .eq("id", body.requestId)
        .eq("learner_id", body.learnerId);
      if (error) return bad(500, "write_failed");
    } else {
      const { error } = await svc
        .from("consent_requests")
        .insert({ learner_id: body.learnerId, vendor: "manual", vendor_ref: body.vendorRef ?? null, status: body.status, recorded_by: staff.id, decided_at: now });
      if (error) return bad(500, "write_failed");
    }
    if (body.status === "verified") {
      await svc
        .from("learner_profiles")
        .update({ consent_status: "parent", consent_source: `manual${body.vendorRef ? ` ${body.vendorRef}` : ""} recorded by staff`, updated_at: now })
        .eq("learner_id", body.learnerId);
    }
    return NextResponse.json({ ok: true }, NO_STORE);
  }

  return bad(400, "unknown_action");
}
