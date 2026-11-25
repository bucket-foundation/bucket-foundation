import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { syncAcademyMastery } from "@/lib/research-os/learn-sync";
import { decideLearnWrite, readAgeBand } from "@/lib/research-os/learn-gate";
import { serverVerifyDevice } from "@/lib/academy/device-server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let svc: SupabaseClient | null = null;

export const progressDeps = {
  configured: (): boolean => Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY),
  service: (): Pick<SupabaseClient, "from" | "rpc"> => {
    svc ??= createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
      db: { schema: "bucket" },
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as SupabaseClient;
    return svc;
  },
  verifyUser: async (req: NextRequest): Promise<string | null> => (await verifyRequestUser(req))?.id ?? null,
  verifyDevice: serverVerifyDevice,
  readAgeBand,
  decideLearnWrite,
  syncMastery: syncAcademyMastery,
};

export type ProgressWrite = { written: string[]; refused: string[]; stale: string[] };

export async function writeProgress(uid: string, updates: Record<string, unknown>, reset: boolean, versions: Record<string, string | null> = {}): Promise<ProgressWrite | null> {
  const rows = Object.keys(updates).map((branch) => (branch in versions ? { branch, data: updates[branch] ?? {}, version: versions[branch] } : { branch, data: updates[branch] ?? {} }));
  const { data, error } = await progressDeps.service().rpc("academy_progress_write", { p_user: uid, p_rows: rows, p_reset: reset });
  if (error) {
    console.error("[academy/progress] write failed:", error.message);
    return null;
  }
  if (!data) {
    console.error("[academy/progress] write returned no result");
    return null;
  }
  const d = data as { written?: unknown; refused?: unknown; stale?: unknown };
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return { written: list(d.written), refused: list(d.refused), stale: list(d.stale) };
}
