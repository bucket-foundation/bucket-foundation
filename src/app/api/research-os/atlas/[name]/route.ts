import { NextResponse, type NextRequest } from "next/server";
import patents from "@/lib/research-os/patents-design-data.json";
import software from "@/lib/research-os/software-atlas-data.json";
import solvability from "@/lib/research-os/solvability-atlas-data.json";
import { staffOnlyAtLaunch } from "@/lib/research-os/launch-gate";
import { NO_STORE } from "@/lib/research-os/route";

export const runtime = "nodejs";

const ATLASES: Record<string, unknown> = { solvability, software, patents };

export const GET = staffOnlyAtLaunch(async (_req: NextRequest, { params }: { params: { name: string } }): Promise<Response> => {
  const body = Object.hasOwn(ATLASES, params.name) ? ATLASES[params.name] : null;
  return body ? NextResponse.json(body, NO_STORE) : NextResponse.json({ error: "unknown_atlas" }, { status: 404, ...NO_STORE });
});
