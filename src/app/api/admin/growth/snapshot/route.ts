import type { NextRequest } from "next/server";
import { growthDeps } from "../deps";
import { handleGrowthSnapshot } from "../handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleGrowthSnapshot(req, growthDeps);
}
