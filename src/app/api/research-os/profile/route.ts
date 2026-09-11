/**
 * /api/research-os/profile, the minimal learner profile form (bkt-ros
 * ros-07 follow-up, "consent gate wiring"). Backs the "no_profile" branch
 * of src/lib/research-os/consent.ts's requireConsent: a learner with no
 * graph.learner_profiles row is blocked from every gated write path until
 * they answer two questions here, role and a coarse birth-year bucket. See
 * src/app/research-os/profile/page.tsx for the page that calls this route.
 *
 * GET  -> { profile: { role, birthYearBucket, consentStatus, updatedAt } | null }
 *   The caller's own row, or null when none exists yet.
 *
 * POST { role, birthYearBucket } -> { profile: {...} }
 *   Creates or updates the caller's own row. Validated by
 *   src/lib/research-os/profile.ts's validateProfileInput. Deliberately
 *   accepts no consent_status field: this route never writes that column.
 *   An upsert only sets the columns present in its payload, so a
 *   consent_status already on file (set by the school/parent path,
 *   compliance/README.md part B item 2, still a TODO) survives a later
 *   profile edit untouched. role defaults the migration's own table
 *   default ('independent') when unset elsewhere, but this route always
 *   requires an explicit value, matching the "no birthdate, no name"
 *   minimality the page's own task item names.
 *
 * A learner may only ever read or write their OWN profile: no
 * reviewer-on-behalf-of path exists here (unlike POST /api/research-os/
 * privacy), since only the learner can answer the age question for
 * themselves.
 *
 * Auth: Authorization: Bearer <supabase access token>, required for both.
 * 401 unauthorized · 400 bad input · 503 not configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { validateProfileInput } from "@/lib/research-os/profile";
import { configured, graphService, verifyLearner } from "@/lib/research-os/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

interface LearnerProfileRow {
  role: string;
  birth_year_bucket: string | null;
  consent_status: string;
  updated_at: string;
}

function toResponseProfile(r: LearnerProfileRow) {
  return { role: r.role, birthYearBucket: r.birth_year_bucket, consentStatus: r.consent_status, updatedAt: r.updated_at };
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");

  const svc = graphService();
  const { data, error } = await svc
    .from("learner_profiles")
    .select("role,birth_year_bucket,consent_status,updated_at")
    .eq("learner_id", learnerId)
    .maybeSingle();
  if (error) return bad(500, "read_failed");

  return NextResponse.json(
    { profile: data ? toResponseProfile(data as LearnerProfileRow) : null },
    { headers: { "cache-control": "no-store" } },
  );
}

interface ProfileBody {
  role?: string;
  birthYearBucket?: string;
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");

  let body: ProfileBody;
  try {
    body = (await req.json()) as ProfileBody;
  } catch {
    return bad(400, "bad_request");
  }

  const validated = validateProfileInput(body);
  if (!validated.ok) return bad(400, validated.error);

  const svc = graphService();
  const { data, error } = await svc
    .from("learner_profiles")
    .upsert(
      { learner_id: learnerId, role: validated.value.role, birth_year_bucket: validated.value.birthYearBucket },
      { onConflict: "learner_id" },
    )
    .select("role,birth_year_bucket,consent_status,updated_at")
    .maybeSingle();
  if (error) return bad(500, "write_failed");

  return NextResponse.json(
    { profile: data ? toResponseProfile(data as LearnerProfileRow) : null },
    { headers: { "cache-control": "no-store" } },
  );
}
