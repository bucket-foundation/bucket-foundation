import { NextResponse } from "next/server";
import { graphService, verifyLearnerIdentity } from "@/lib/research-os/db";
import { verifyClassStaff } from "@/lib/research-os/class-db";
import { consentPathFor, hashContact, type ConsentRequestRecord } from "@/lib/research-os/consent-paths";
import { resolveConsentPaths, type BirthYearBucket, type ConsentStatus, type LearnerProfile } from "@/lib/research-os/consent";
import { vendorByName } from "@/lib/research-os/consent-vendor";
import { CONTACT_SALT, DECIDE_TTL_MS, MAX_PENDING_PER_DAY, consentSecret, emailConsentRequest, isEmail, sameEmail, signParentToken } from "@/lib/research-os/parent-consent";
import { NO_STORE, bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SALT = CONTACT_SALT;

async function loadProfile(learnerId: string): Promise<LearnerProfile | null> {
  const { data, error } = await graphService().from("learner_profiles").select("*").eq("learner_id", learnerId).maybeSingle();
  if (error) throw new Error(`learner_profiles read failed: ${error.message}`);
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

export const GET = withResearchOsRoute({ auth: "required" }, async (req, { learnerId }) => {
  let effective;
  let profile: LearnerProfile | null;
  try {
    profile = await loadProfile(learnerId);
    effective = profile ? await resolveConsentPaths(learnerId, profile) : { status: "none" as const, source: null, path: "none" as const };
  } catch (err) {
    console.error("[research-os/consent] path read failed:", err instanceof Error ? err.message : err);
    return bad(503, "consent_unavailable");
  }
  const { data: reqs, error: reqsErr } = await graphService()
    .from("consent_requests")
    .select("id,vendor,status,vendor_ref,created_at,decided_at")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });
  if (reqsErr) return bad(503, "consent_unavailable");
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
});

type Body =
  | { action: "request"; vendor: string; guardianContact?: string }
  | { action: "record"; classId: string; learnerId: string; requestId?: string; status: "verified" | "declined"; vendorRef?: string }
  | { action: "class_basis"; classId: string; basis: "none" | "school"; document?: string };

export const POST = withResearchOsRoute({ auth: "none" }, async (req) => {
  const read = await readAnyJson(req, "bad_json");
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as Body;
  const svc = graphService();

  if (body.action === "request") {
    const identity = await verifyLearnerIdentity(req);
    if (!identity) return bad(401, "unauthorized");
    const learnerId = identity.id;
    const vendor = vendorByName(body.vendor || "");
    if (!vendor) return bad(400, "bad_vendor");
    const parentEmail = body.guardianContact?.trim().toLowerCase() ?? "";
    const secret = consentSecret();
    if (vendor.name === "email") {
      if (!isEmail(parentEmail)) return bad(400, "bad_email");
      if (sameEmail(parentEmail, identity.email)) return bad(400, "parent_email_is_yours");
      if (!secret) return bad(503, "consent_unavailable");
      const { count, error: countErr } = await svc
        .from("consent_requests")
        .select("id", { count: "exact", head: true })
        .eq("learner_id", learnerId)
        .eq("vendor", "email")
        .eq("status", "pending")
        .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
      if (countErr) return bad(503, "consent_unavailable");
      if ((count ?? 0) >= MAX_PENDING_PER_DAY) return bad(409, "too_many_requests");
    }
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
    if (vendor.name === "email") {
      try {
        const token = signParentToken({ requestId: (data as { id: string }).id, action: "decide", email: parentEmail, expiresAt: Date.now() + DECIDE_TTL_MS }, secret as string);
        await emailConsentRequest(parentEmail, token);
      } catch (err) {
        console.error("[research-os/consent] parent email failed:", err instanceof Error ? err.message : err);
        return bad(503, "email_failed");
      }
    }
    return NextResponse.json({ requestId: (data as { id: string }).id, vendorRef: started.vendorRef, url: started.url }, NO_STORE);
  }

  if (body.action === "record" || body.action === "class_basis") {
    if (!body.classId) return bad(400, "class_required");
    const staffCheck = await verifyClassStaff(req, body.classId);
    if (!staffCheck.ok) return bad(503, "class_read_failed");
    const staff = staffCheck.staff;
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
    const { data: member, error: memberErr } = await svc.from("class_members").select("learner_id").eq("class_id", body.classId).eq("learner_id", body.learnerId).maybeSingle();
    if (memberErr) return bad(503, "class_read_failed");
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
});
