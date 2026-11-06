import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { supabaseTranslationReportStore } from "@/lib/academy/translation-report-server";
import { handleTranslationReport } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleTranslationReport(req, { verifyUser: verifyRequestUser, store: supabaseTranslationReportStore });
}
