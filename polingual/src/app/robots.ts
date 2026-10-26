import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/d8/slide.html", "/d8/landing.html", "/d8/mobile.html", "/d8/es.html"] }, sitemap: "https://www.polingual.com/sitemap.xml" };
}
