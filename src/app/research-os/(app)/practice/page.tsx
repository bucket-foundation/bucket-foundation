import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/supabase/server";
import { isStaff } from "@/lib/research-os/staff";
import PracticePanel from "./PracticePanel";

export const metadata: Metadata = { title: "Practice", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;

export default async function PracticePage({ searchParams }: { searchParams: { node?: string } }) {
  const user = await getSessionUser();
  if (!(await isStaff(user))) notFound();
  const node = (searchParams.node || "").trim();
  return (
    <div>
      <PageHeader eyebrow="learn" title="Practice" lede="Recall cards, drills, worked problems, quizzes and a path lesson, generated from the graph for one node." />
      {SLUG.test(node) ? <PracticePanel node={node} /> : <p className="mt-6 text-[14px] text-[color:var(--basalt-2)]">Open a node, then choose practice. The address takes ?node= and a node slug.</p>}
    </div>
  );
}
