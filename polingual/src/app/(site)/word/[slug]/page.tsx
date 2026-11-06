import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WordView } from "../views";
import { WORDS, word } from "@/lib/words";
import { wordMeta } from "@/lib/word-meta";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return WORDS.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = word((await params).slug);
  return w ? wordMeta("en", w) : {};
}

export default async function Page({ params }: Props) {
  const w = word((await params).slug);
  if (!w) notFound();
  return <WordView w={w} code="en" />;
}
