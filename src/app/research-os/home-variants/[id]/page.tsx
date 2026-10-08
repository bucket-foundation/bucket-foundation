import { notFound } from "next/navigation";
import type { Metadata } from "next";
import HomeVariant from "@/components/research-os/HomeVariant";
import { HEADLINES, VARIANTS, findVariant } from "@/lib/research-os/home-variants";

export const dynamicParams = false;

export function generateStaticParams() {
  return VARIANTS.map((v) => ({ id: v.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const v = findVariant(params.id);
  const title = v ? HEADLINES[v.headline].title : "Research OS";
  return { title: `${title} · variant ${params.id}`, robots: { index: false } };
}

export default function HomeVariantPage({ params }: { params: { id: string } }) {
  const v = findVariant(params.id);
  if (!v) notFound();
  return <HomeVariant v={v} />;
}
