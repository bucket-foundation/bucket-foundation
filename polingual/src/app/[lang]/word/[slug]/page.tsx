import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WordView } from "../../../word/views";
import { WORDS, word } from "@/lib/words";
import { SITE_LANGS } from "@/lib/word-i18n";
import { wordMeta } from "@/lib/word-meta";

type Props = { params: Promise<{ lang: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SITE_LANGS.flatMap((lang) => WORDS.map((w) => ({ lang, slug: w.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const w = word(slug);
  return w && SITE_LANGS.includes(lang) ? wordMeta(lang, w) : {};
}

export default async function Page({ params }: Props) {
  const { lang, slug } = await params;
  const w = word(slug);
  if (!w || !SITE_LANGS.includes(lang)) notFound();
  return <WordView w={w} code={lang} />;
}
