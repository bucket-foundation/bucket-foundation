import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlacementSession from "../../PlacementSession";

export const metadata: Metadata = { title: "Placement", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default function PlacePage({ params }: { params: { branch: string } }) {
  if (!SLUG.test(params.branch)) notFound();
  return <PlacementSession branch={params.branch} />;
}
