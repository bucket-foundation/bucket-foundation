import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/supabase/server";
import { isStaff } from "@/lib/research-os/staff";
import PathPanel from "./PathPanel";

export const metadata: Metadata = { title: "Study path", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;

export default async function LearnPathPage({ searchParams }: { searchParams: { target?: string } }) {
  const user = await getSessionUser();
  if (!(await isStaff(user))) notFound();
  const target = (searchParams.target || "").trim();
  return (
    <div>
      <PageHeader eyebrow="learn" title="Study path" lede="Every prerequisite back to the foundations, minus what your practice shows you know, in an order where each step is ready when you reach it." />
      {SLUG.test(target) ? <PathPanel target={target} /> : <p className="mt-6 text-[14px] text-[color:var(--basalt-2)]">Open a concept in Learn or on the graph, then choose study path.</p>}
    </div>
  );
}
