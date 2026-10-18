import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SystemView from "../SystemView";

export const metadata: Metadata = { title: "Language system", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function SystemPage({ params }: { params: { system: string } }) {
  if (!SLUG.test(params.system)) notFound();
  return <SystemView systemId={params.system} />;
}
