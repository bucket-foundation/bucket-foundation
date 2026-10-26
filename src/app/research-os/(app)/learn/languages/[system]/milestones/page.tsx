import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LangMilestones from "../../LangMilestones";

export const metadata: Metadata = { title: "Language milestones", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function LangMilestonesPage({ params }: { params: { system: string } }) {
  if (!SLUG.test(params.system)) notFound();
  return <LangMilestones systemId={params.system} />;
}
