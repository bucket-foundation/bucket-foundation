import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyRequestUser } from "@/lib/auth/verify";
import { syncAcademyMastery } from "@/lib/research-os/learn-sync";
import { readAgeBand } from "@/lib/research-os/learn-gate";
import type { Atom } from "@/lib/academy/engine";
import { loadCorpusForBranch } from "@/lib/academy/corpus";
import { DEFAULT_ORIGINS, corpusAtomsVersion, createReviewLogHandlers } from "@/lib/academy/review-log-server";
import { bucketService, reviewLogStore } from "@/lib/academy/review-log-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let svc: SupabaseClient | null = null;
const service = () => (svc ??= bucketService(SUPABASE_URL as string, SERVICE_ROLE_KEY as string));

const extraOrigins = (process.env.ACADEMY_SYNC_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const handlers = createReviewLogHandlers({
  enabled: () => process.env.ACADEMY_REVIEW_LOG === "on",
  configured: () => Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY),
  origins: () => [...DEFAULT_ORIGINS, ...extraOrigins],
  now: () => Date.now(),
  verifyUser: async (req) => (await verifyRequestUser(req as NextRequest))?.id ?? null,
  readAgeBand,
  ...reviewLogStore(service),
  syncMastery: syncAcademyMastery,
  atoms: (branch) => {
    const atoms = loadCorpusForBranch(branch)?.atoms;
    return atoms ? { [corpusAtomsVersion(branch)]: atoms as unknown as Atom[] } : {};
  },
});

export const OPTIONS = (req: NextRequest) => handlers.OPTIONS(req);
export const GET = (req: NextRequest) => handlers.GET(req);
export const POST = (req: NextRequest) => handlers.POST(req);
