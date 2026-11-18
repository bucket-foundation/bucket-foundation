import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GiftView } from "@/app/(site)/gift/views";
import { giftMeta } from "@/lib/gift";

type Props = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return (await params).lang === "es" ? giftMeta("es", "") : {};
}

export default async function Page({ params }: Props) {
  if ((await params).lang !== "es") notFound();
  return <GiftView lang="es" />;
}
