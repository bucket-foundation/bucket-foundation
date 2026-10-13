import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/supabase/server";
import { isStaff } from "@/lib/research-os/staff";
import QuizPanel from "./QuizPanel";

export const metadata: Metadata = { title: "Work quiz", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function WorkQuizPage() {
  const user = await getSessionUser();
  if (!(await isStaff(user))) notFound();
  return (
    <div>
      <PageHeader eyebrow="learn" title="Work quiz" lede="Rare, timed questions built from our beads, merged PRs and idea notes. They come up while you work. A miss comes back in review." />
      <QuizPanel />
    </div>
  );
}
