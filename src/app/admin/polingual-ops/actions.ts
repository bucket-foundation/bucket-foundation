"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { decidePost } from "@/lib/admin/polingual-ops";
import { polingualOpsSource } from "@/lib/admin/polingual-ops-store";
import { requireStaff } from "@/lib/admin/session";

async function decide(formData: FormData, decision: "approve" | "skip"): Promise<void> {
  const staff = await requireStaff();
  const source = polingualOpsSource();
  if (!source) redirect("/admin/polingual-ops?result=store_unavailable");
  const result = await decidePost(source.decisions, staff, String(formData.get("postId") ?? ""), decision);
  revalidatePath("/admin/polingual-ops");
  redirect(`/admin/polingual-ops?result=${result.ok ? `${decision}_ok` : result.error}`);
}

export async function approvePost(formData: FormData): Promise<void> {
  await decide(formData, "approve");
}

export async function skipPost(formData: FormData): Promise<void> {
  await decide(formData, "skip");
}
