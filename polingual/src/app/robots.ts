import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/d8/slide.html"] }, sitemap: "https://www.polingual.com/sitemap.xml" };
}
