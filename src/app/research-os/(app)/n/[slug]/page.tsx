import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NodeView from "../NodeView";

export const metadata: Metadata = { title: "Node", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;

export default function NodePage({ params }: { params: { slug: string } }) {
  if (!SLUG.test(params.slug)) notFound();
  return <NodeView slug={params.slug} />;
}
