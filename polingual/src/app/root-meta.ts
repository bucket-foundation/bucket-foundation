import type { Metadata, Viewport } from "next";
import { APPLE_TOUCH_ICON, DEFAULT_OG_IMAGE, LOCALE, SITE_NAME, THEME_COLOR } from "@/lib/meta";

const description = "Polingual teaches several languages at once on iPhone and iPad. 29 languages, one spaced review queue, every word spoken aloud.";

export const ROOT_METADATA: Metadata = {
  title: { default: "Polingual", template: "%s · Polingual" },
  description,
  metadataBase: new URL("https://www.polingual.com"),
  alternates: { types: { "application/rss+xml": [{ url: "/feed.xml", title: "Polingual" }] } },
  applicationName: "Polingual",
  icons: { apple: [{ url: APPLE_TOUCH_ICON, sizes: "180x180" }] },
  openGraph: { type: "website", siteName: SITE_NAME, locale: LOCALE, title: SITE_NAME, description, images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: SITE_NAME, description, images: [{ url: DEFAULT_OG_IMAGE.url, alt: DEFAULT_OG_IMAGE.alt }] },
};

export const ROOT_VIEWPORT: Viewport = { themeColor: THEME_COLOR };
