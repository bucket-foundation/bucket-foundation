import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import { ROOT_METADATA, ROOT_VIEWPORT } from "@/app/root-meta";
import { SITE_LANGS, localeInfo } from "@/lib/word-i18n";

type Props = { children: React.ReactNode; params: Promise<{ lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SITE_LANGS.map((lang) => ({ lang }));
}

export const metadata: Metadata = ROOT_METADATA;

export const viewport: Viewport = ROOT_VIEWPORT;

export default async function LocaleLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!SITE_LANGS.includes(lang)) notFound();
  const info = localeInfo(lang);
  return (
    <html lang={info.hreflang} dir={info.rtl ? "rtl" : "ltr"}>
      <body>{children}</body>
    </html>
  );
}
