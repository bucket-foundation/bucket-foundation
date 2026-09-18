import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudySession from "../../StudySession";

export const metadata: Metadata = { title: "Study", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function StudyPage({ params }: { params: { branch: string } }) {
  if (!SLUG.test(params.branch)) notFound();
  return <StudySession branch={params.branch} />;
}
