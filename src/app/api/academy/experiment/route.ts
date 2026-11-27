import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyRequestUser } from "@/lib/auth/verify";
import { readAgeBand } from "@/lib/research-os/learn-gate";
import { bucketService } from "@/lib/academy/review-log-store";
import { createExperimentHandlers, rowToEnrolment } from "@/lib/academy/experiment-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = "experiment_enrolments";
const COLUMNS = "experiment,unit,arm,stratum,enrolled_at";

let svc: SupabaseClient | null = null;
const service = () => (svc ??= bucketService(SUPABASE_URL as string, SERVICE_ROLE_KEY as string));

const handlers = createExperimentHandlers({
  configured: () => Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY),
  verifyUser: async (req) => (await verifyRequestUser(req as NextRequest))?.id ?? null,
  adult: async (id) => {
    const r = await readAgeBand(id);
    return r.ok ? r.band === "18plus" : null;
  },
  load: async (id, experiment) => {
    const { data, error } = await service().from(TABLE).select(COLUMNS).eq("user_id", id).eq("experiment", experiment).maybeSingle();
    return error ? undefined : rowToEnrolment(data);
  },
  insertFirst: async (id, e) => {
    const { error } = await service()
      .from(TABLE)
      .upsert({ user_id: id, experiment: e.experiment, unit: e.key, arm: e.arm, stratum: e.stratum, enrolled_at: new Date(e.at).toISOString() }, { onConflict: "user_id,experiment", ignoreDuplicates: true });
    if (error) return null;
    const { data, error: readError } = await service().from(TABLE).select(COLUMNS).eq("user_id", id).eq("experiment", e.experiment).maybeSingle();
    return readError ? null : rowToEnrolment(data);
  },
  now: () => Date.now(),
});

export const GET = (req: NextRequest) => handlers.GET(req);
export const POST = (req: NextRequest) => handlers.POST(req);
