import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideView } from "@/app/(site)/learn/views";
import { guideMeta } from "@/lib/guide-meta";
import { GUIDES, guide } from "@/lib/guides";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = guide((await params).slug);
  return g ? guideMeta(g) : {};
}

export default async function Page({ params }: Props) {
  const g = guide((await params).slug);
  if (!g) notFound();
  return <GuideView g={g} />;
}
