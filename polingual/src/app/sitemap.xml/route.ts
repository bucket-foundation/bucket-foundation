import { sitemapIndexXml } from "@/lib/sitemap-index";

export const dynamic = "force-static";

export function GET() {
  return new Response(sitemapIndexXml(), { headers: { "content-type": "application/xml; charset=utf-8" } });
}
