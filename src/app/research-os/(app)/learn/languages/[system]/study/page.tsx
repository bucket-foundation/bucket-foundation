import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LangStudy from "../../LangStudy";

export const metadata: Metadata = { title: "Language study", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function LangStudyPage({ params, searchParams }: { params: { system: string }; searchParams?: { heritage?: string } }) {
  if (!SLUG.test(params.system)) notFound();
  return <LangStudy systemId={params.system} heritage={searchParams?.heritage === "1"} />;
}
