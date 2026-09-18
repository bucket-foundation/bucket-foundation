import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AtomView from "../../AtomView";

export const metadata: Metadata = { title: "Learn", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function AtomPage({ params }: { params: { branch: string; atom: string } }) {
  if (!SLUG.test(params.branch) || !SLUG.test(params.atom)) notFound();
  return <AtomView branch={params.branch} atomId={params.atom} />;
}
