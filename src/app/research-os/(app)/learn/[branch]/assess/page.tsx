import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AssessmentSession from "../../AssessmentSession";

export const metadata: Metadata = { title: "Test yourself", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function AssessPage({ params }: { params: { branch: string } }) {
  if (!SLUG.test(params.branch)) notFound();
  return <AssessmentSession branch={params.branch} />;
}
