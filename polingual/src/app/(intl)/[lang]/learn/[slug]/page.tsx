import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideView } from "@/app/(site)/learn/views";
import { guideMeta } from "@/lib/guide-meta";
import { LOCAL_GUIDES, localGuide } from "@/lib/guides";

type Props = { params: Promise<{ lang: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCAL_GUIDES.map((g) => ({ lang: g.lang, slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const g = localGuide(lang, slug);
  return g ? guideMeta(g) : {};
}

export default async function Page({ params }: Props) {
  const { lang, slug } = await params;
  const g = localGuide(lang, slug);
  if (!g) notFound();
  return <GuideView g={g} />;
}
