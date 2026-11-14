import type { Metadata } from "next";
import { SITE } from "./facts";

export const OG_TITLE_MAX = 59;
export const OG_DESCRIPTION_MAX = 154;
export const OG_IMAGE_MAX_BYTES = 300_000;
export const THEME_COLOR = "#5B1A4A";
export const APPLE_TOUCH_ICON = "/d8/icon-180.png";
export const SITE_NAME = "Polingual";
export const LOCALE = "en_US";

export type OgImage = { url: string; width: number; height: number; type: string; alt: string };

export const DEFAULT_OG_IMAGE: OgImage = { url: `${SITE}/d8/og.png`, width: 1200, height: 630, type: "image/png", alt: "Polingual word tiles in six scripts" };

export function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const head = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${head.replace(/[\s,.;:·]+$/, "")}…`;
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageMetaInput = {
  path: string;
  title: string;
  description: string;
  documentTitle?: string;
  type?: "website" | "article";
  image?: OgImage | null;
  locale?: string;
  noindex?: boolean;
  languages?: Record<string, string>;
};

export function pageMeta(p: PageMetaInput): Metadata {
  const url = absoluteUrl(p.path);
  const title = clip(p.title, OG_TITLE_MAX);
  const description = clip(p.description, OG_DESCRIPTION_MAX);
  const image = p.image === undefined ? DEFAULT_OG_IMAGE : p.image;
  const images = image ? { images: [{ ...image, url: absoluteUrl(image.url) }] } : {};
  const twitterImages = image ? { images: [{ url: absoluteUrl(image.url), alt: image.alt }] } : {};
  return {
    title: { absolute: p.documentTitle ?? p.title },
    description,
    alternates: { canonical: url, ...(p.languages ? { languages: p.languages } : {}) },
    ...(p.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: p.type ?? "website", siteName: SITE_NAME, locale: p.locale ?? LOCALE, title, description, url, ...images },
    twitter: { card: "summary_large_image", title, description, ...twitterImages },
  };
}
