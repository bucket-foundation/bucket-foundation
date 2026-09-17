import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BranchView from "../BranchView";

export const metadata: Metadata = { title: "Learn", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function BranchPage({ params }: { params: { branch: string } }) {
  if (!SLUG.test(params.branch)) notFound();
  return <BranchView branch={params.branch} />;
}
