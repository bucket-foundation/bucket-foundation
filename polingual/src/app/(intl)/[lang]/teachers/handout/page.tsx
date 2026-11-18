import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HandoutView } from "@/app/(site)/teachers/views";
import { teachersMeta } from "@/lib/teachers-meta";

type Props = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return (await params).lang === "es" ? teachersMeta("es", "/handout") : {};
}

export default async function Page({ params }: Props) {
  if ((await params).lang !== "es") notFound();
  return <HandoutView lang="es" />;
}
