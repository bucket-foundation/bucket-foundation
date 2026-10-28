import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SystemView from "../SystemView";
import { getSessionUser } from "@/lib/supabase/server";
import { inLaunchScope } from "@/lib/research-os/launch-scope";
import { launchPageAllowed } from "@/lib/research-os/launch-gate";

const MILESTONES = "/research-os/learn/languages/[system]/milestones";

export const metadata: Metadata = { title: "Language system", robots: { index: false, follow: false } };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export default async function SystemPage({ params }: { params: { system: string } }) {
  if (!SLUG.test(params.system)) notFound();
  const showMilestones = inLaunchScope(MILESTONES) || launchPageAllowed(MILESTONES, await getSessionUser());
  return <SystemView systemId={params.system} showMilestones={showMilestones} />;
}
