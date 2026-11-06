import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WordIndexView } from "../../word/views";
import { SITE_LANGS } from "@/lib/word-i18n";
import { wordIndexMeta } from "@/lib/word-meta";

type Props = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SITE_LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return SITE_LANGS.includes(lang) ? wordIndexMeta(lang) : {};
}

export default async function Page({ params }: Props) {
  const { lang } = await params;
  if (!SITE_LANGS.includes(lang)) notFound();
  return <WordIndexView code={lang} />;
}
