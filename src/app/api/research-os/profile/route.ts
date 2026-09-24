import { validateProfileInput } from "@/lib/research-os/profile";
import { graphService, loadGame } from "@/lib/research-os/db";
import { bad, readAnyJson, withResearchOsRoute } from "@/lib/research-os/route";
import { summarize } from "@/lib/research-os/game";
import { recordServerEvent } from "@/lib/academy/events-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LearnerProfileRow {
  role: string;
  birth_year_bucket: string | null;
  consent_status: string;
  updated_at: string;
}

function toResponseProfile(r: LearnerProfileRow) {
  return { role: r.role, birthYearBucket: r.birth_year_bucket, consentStatus: r.consent_status, updatedAt: r.updated_at };
}

export const GET = withResearchOsRoute({ auth: "required" }, async (_req, { learnerId }) => {
  const svc = graphService();
  const { data, error } = await svc
    .from("learner_profiles")
    .select("role,birth_year_bucket,consent_status,updated_at")
    .eq("learner_id", learnerId)
    .maybeSingle();
  if (error) return bad(500, "read_failed");

  const game = await loadGame(learnerId);
  return { profile: data ? toResponseProfile(data as LearnerProfileRow) : null, game: game ? summarize(game) : null };
});

interface ProfileBody {
  role?: string;
  birthYearBucket?: string;
}

export const POST = withResearchOsRoute({ auth: "required" }, async (req, { learnerId }) => {
  const read = await readAnyJson(req, "bad_request");
  if (!read.ok) return read.res;
  const body = (read.value ?? {}) as ProfileBody;

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

  const saved = data as LearnerProfileRow | null;
  if (saved?.birth_year_bucket === "under13" || saved?.birth_year_bucket === "13to17" || saved?.birth_year_bucket === "18plus") {
    await recordServerEvent(learnerId, "age_band_set", { band: saved.birth_year_bucket });
  }

  return { profile: saved ? toResponseProfile(saved) : null };
});
