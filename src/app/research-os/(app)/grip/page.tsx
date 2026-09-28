import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/supabase/server";
import { isStaff } from "@/lib/research-os/staff";
import GripSection from "./GripSection";

export const metadata: Metadata = { title: "Knowledge grip", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function GripPage() {
  const user = await getSessionUser();
  if (!(await isStaff(user))) notFound();
  return (
    <div>
      <PageHeader eyebrow="profile" title="Knowledge grip" lede="How far your assessed knowledge reaches from the foundations of each branch toward its frontier." />
      <GripSection />
    </div>
  );
}
