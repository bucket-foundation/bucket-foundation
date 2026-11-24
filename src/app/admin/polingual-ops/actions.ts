"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { resolveStaff } from "@/lib/admin/gate";
import { decidePost } from "@/lib/admin/polingual-ops";
import { polingualOpsSource } from "@/lib/admin/polingual-ops-store";
import { getSessionUser } from "@/lib/supabase/server";

async function decide(formData: FormData, decision: "approve" | "skip"): Promise<void> {
  const staff = resolveStaff(await getSessionUser());
  if (!staff) notFound();
  const source = polingualOpsSource();
  if (!source) redirect("/admin/polingual-ops?result=store_unavailable");
  const result = await decidePost(source.decisions, staff, String(formData.get("postId") ?? ""), decision);
  if (!result.ok && result.error === "forbidden") notFound();
  revalidatePath("/admin/polingual-ops");
  redirect(`/admin/polingual-ops?result=${result.ok ? `${decision}_ok` : result.error}`);
}

export async function approvePost(formData: FormData): Promise<void> {
  await decide(formData, "approve");
}

export async function skipPost(formData: FormData): Promise<void> {
  await decide(formData, "skip");
}
