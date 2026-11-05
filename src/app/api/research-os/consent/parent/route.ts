import { NextResponse, type NextRequest } from "next/server";
import { graphService } from "@/lib/research-os/db";
import { hashContact } from "@/lib/research-os/consent-paths";
import { deleteLearnerData } from "@/lib/research-os/privacy";
import { CONTACT_SALT, REVOKE_TTL_MS, consentSecret, emailConsentConfirmed, signParentToken, siteUrl, verifyParentToken } from "@/lib/research-os/parent-consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function done(state: string): NextResponse {
  return NextResponse.redirect(`${siteUrl()}/consent/parent?done=${state}`, 303);
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("t") ?? "");
  const decision = String(form?.get("decision") ?? "");
  let secret: string;
  try {
    secret = consentSecret();
  } catch {
    return done("error");
  }
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
    await svc.from("consent_requests").update({ status: "declined", decided_at: now }).eq("id", row.id);
    await svc.from("learner_profiles").update({ consent_status: "none", consent_source: "parent revoked by email", updated_at: now }).eq("learner_id", row.learner_id);
    return done("revoked");
  }

  if (row.status !== "pending") return done("used");
  if (decision === "decline") {
    const { error: e } = await svc.from("consent_requests").update({ status: "declined", decided_at: now }).eq("id", row.id).eq("status", "pending");
    return done(e ? "error" : "declined");
  }
  if (decision !== "approve") return done("expired");
  const { data: claimed, error: claimErr } = await svc
    .from("consent_requests")
    .update({ status: "verified", decided_at: now })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id");
  if (claimErr) return done("error");
  if (!claimed || (claimed as unknown[]).length === 0) return done("used");
  const { error: profErr } = await svc
    .from("learner_profiles")
    .update({ consent_status: "parent", consent_source: `email plus ${row.id}`, guardian_contact_hash: hash, updated_at: now })
    .eq("learner_id", row.learner_id);
  if (profErr) return done("error");
  try {
    await emailConsentConfirmed(t.email, signParentToken({ requestId: row.id, action: "revoke", email: t.email, expiresAt: Date.now() + REVOKE_TTL_MS }, secret));
  } catch (err) {
    console.error("[consent/parent] confirmation email failed:", err instanceof Error ? err.message : err);
  }
  return done("approved");
}
