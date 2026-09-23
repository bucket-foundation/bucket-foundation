import { NextRequest, NextResponse } from "next/server";
import { validateProfileInput } from "@/lib/research-os/profile";
import { configured, graphService, verifyLearner } from "@/lib/research-os/db";
import { loadGame } from "@/lib/research-os/db";
import { summarize } from "@/lib/research-os/game";

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

  const game = await loadGame(learnerId);
  return NextResponse.json(
    { profile: data ? toResponseProfile(data as LearnerProfileRow) : null, game: game ? summarize(game) : null },
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
