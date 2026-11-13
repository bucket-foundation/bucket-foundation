import { buildLearnIndex } from "@/lib/lobby/learn-index";
import { WORDS } from "@/lib/words";

export const dynamic = "force-static";

export function GET() {
  return Response.json(buildLearnIndex(WORDS), { headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
