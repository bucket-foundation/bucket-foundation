import { appSiteAssociation } from "@/lib/share";

export const dynamic = "force-static";

export function GET() {
  return Response.json(appSiteAssociation(), { headers: { "content-type": "application/json" } });
}
