import { NextResponse, type NextRequest } from "next/server";
import { graphService } from "@/lib/research-os/db";
import { hashContact } from "@/lib/research-os/consent-paths";
import { deleteLearnerData } from "@/lib/research-os/privacy";
import { verifyRequestUser } from "@/lib/auth/verify";
import { CONTACT_SALT, REVOKE_TTL_MS, consentSecret, emailConsentConfirmed, parentApprovalCheck, signParentToken, siteUrl, verifyParentToken } from "@/lib/research-os/parent-consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function done(state: string, token?: string): NextResponse {
  const t = token ? `&t=${encodeURIComponent(token)}` : "";
  return NextResponse.redirect(`${siteUrl()}/consent/parent?done=${state}${t}`, 303);
}

export async function POST(req: NextRequest) {
  const secret = consentSecret();
  if (!secret) return NextResponse.json({ error: "consent_unavailable" }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("t") ?? "");
  const decision = String(form?.get("decision") ?? "");
  const t = verifyParentToken(token, secret);
  if (!t) return done("expired");
  const svc = graphService();
  const { data, error } = await svc.from("consent_requests").select("id,learner_id,vendor,status,guardian_contact_hash").eq("id", t.requestId).maybeSingle();
  if (error) return done("error");
  const row = data as { id: string; learner_id: string; vendor: string; status: string; guardian_contact_hash: string | null } | null;
  const hash = await hashContact(t.email, CONTACT_SALT);
  if (!row || row.vendor !== "email" || row.guardian_contact_hash !== hash) return done("expired");
  const now = new Date().toISOString();

  if (t.action === "revoke") {
    if (decision !== "revoke" || row.status !== "verified") return done("expired");
    try {
      await deleteLearnerData({ callerId: row.learner_id, targetLearnerId: row.learner_id, actingAsReviewer: false });
    } catch (err) {
      console.error("[consent/parent] revoke delete failed:", err instanceof Error ? err.message : err);
      return done("error");
    }
    const { error: reqErr } = await svc.from("consent_requests").update({ status: "declined", decided_at: now }).eq("id", row.id);
    const { error: profErr } = await svc
      .from("learner_profiles")
      .upsert({ learner_id: row.learner_id, birth_year_bucket: "under13", consent_status: "none", consent_source: "parent revoked by email", updated_at: now }, { onConflict: "learner_id" });
    if (reqErr || profErr) return done("error");
    return done("revoked");
  }

  if (row.status !== "pending") return done("used");
  if (decision === "decline") {
    const { error: e } = await svc.from("consent_requests").update({ status: "declined", decided_at: now }).eq("id", row.id).eq("status", "pending");
    return done(e ? "error" : "declined");
  }
  if (decision !== "approve") return done("expired");

  const parent = await verifyRequestUser(req);
  let parentBand: string | null = null;
  if (parent) {
    const { data: p, error: pErr } = await svc.from("learner_profiles").select("birth_year_bucket").eq("learner_id", parent.id).maybeSingle();
    if (pErr) return done("error");
    parentBand = (p as { birth_year_bucket: string | null } | null)?.birth_year_bucket ?? null;
  }
  const check = parentApprovalCheck({ parent, invitedEmail: t.email, childId: row.learner_id, parentBand, declaresAdult: form?.get("adult") === "18plus" });
  if (check !== "ok") return done(check, token);
  if (parentBand === null && parent) {
    const { error: bandErr } = await svc.from("learner_profiles").upsert({ learner_id: parent.id, birth_year_bucket: "18plus", updated_at: now }, { onConflict: "learner_id" });
    if (bandErr) return done("error");
  }

  const { data: claimed, error: claimErr } = await svc
    .from("consent_requests")
    .update({ status: "verified", decided_at: now, parent_user_id: parent!.id })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id");
  if (claimErr) return done("error");
  if (!claimed || (claimed as unknown[]).length === 0) return done("used");
  const { data: prof, error: profErr } = await svc
    .from("learner_profiles")
    .upsert(
      { learner_id: row.learner_id, birth_year_bucket: "under13", consent_status: "parent", consent_source: `email plus ${row.id}`, guardian_contact_hash: hash, updated_at: now },
      { onConflict: "learner_id" },
    )
    .select("learner_id");
  if (profErr || !prof || (prof as unknown[]).length === 0) {
    console.error("[consent/parent] child profile write failed:", profErr?.message ?? "no row");
    return done("error");
  }
  try {
    await emailConsentConfirmed(t.email, signParentToken({ requestId: row.id, action: "revoke", email: t.email, expiresAt: Date.now() + REVOKE_TTL_MS }, secret));
  } catch (err) {
    console.error("[consent/parent] confirmation email failed:", err instanceof Error ? err.message : err);
  }
  return done("approved");
}
