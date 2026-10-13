import { NextRequest } from "next/server";
import { allowedSets, availableSets, localSpaceEnabled, readPublicDataset, registryPath, resolveSpaceFile, spaceDir } from "@/lib/explore/space-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound() {
  return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function GET(req: NextRequest) {
  if (!localSpaceEnabled()) return notFound();
  const allowed = allowedSets(registryPath());
  const dir = spaceDir();
  const id = new URL(req.url).searchParams.get("id");
  if (id === null) return ok({ datasets: availableSets(allowed, dir) });
  const file = resolveSpaceFile(id, allowed, dir);
  if (!file) return notFound();
  const data = readPublicDataset(file);
  return data ? ok(data) : notFound();
}
