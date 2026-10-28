"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runUserAction } from "@/lib/admin/actions";
import { adminSource } from "@/lib/admin/source";
import { requireStaff } from "@/lib/admin/session";

export async function userAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const source = adminSource();
  const targetUserId = String(formData.get("userId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!source) redirect(`/admin/users/${encodeURIComponent(targetUserId)}?result=store_unavailable`);
  const result = await runUserAction(source.actions, staff, {
    action,
    targetUserId,
    reason: String(formData.get("reason") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  revalidatePath("/admin/users");
  if (result.ok && action === "delete") redirect("/admin/users?deleted=1");
  redirect(`/admin/users/${encodeURIComponent(targetUserId)}?result=${result.ok ? `${action}_ok` : result.error}`);
}
