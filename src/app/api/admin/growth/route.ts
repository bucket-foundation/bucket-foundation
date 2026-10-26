import type { NextRequest } from "next/server";
import { growthDeps } from "./deps";
import { handleGrowthReport } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleGrowthReport(req, growthDeps);
}
