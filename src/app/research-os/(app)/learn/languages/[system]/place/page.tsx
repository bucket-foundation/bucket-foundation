import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LangPlacement from "../../LangPlacement";

export const metadata: Metadata = { title: "Placement", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function PlacePage({ params, searchParams }: { params: { system: string }; searchParams: { lang?: string } }) {
  if (!SLUG.test(params.system)) notFound();
  return <LangPlacement systemId={params.system} lang={searchParams.lang ?? null} />;
}
