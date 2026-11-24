import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RivalView } from "@/app/(site)/compare/views";
import { RIVALS, rival, rivalPath } from "@/lib/compare";
import { pageMeta } from "@/lib/meta";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return RIVALS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = rival((await params).slug);
  return r ? pageMeta({ path: rivalPath(r), title: r.title, documentTitle: `${r.title} | Polingual`, description: r.description, type: "article" }) : {};
}

export default async function Page({ params }: Props) {
  const r = rival((await params).slug);
  if (!r) notFound();
  return <RivalView r={r} />;
}
