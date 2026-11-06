import type { MetadataRoute } from "next";
import SITE_LANGS from "@/lib/site-langs.json";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/d8/slide.html", "/d8/landing.html", "/d8/mobile.html", ...SITE_LANGS.map((l) => `/d8/${l}.html`)] }, sitemap: "https://www.polingual.com/sitemap.xml" };
}
