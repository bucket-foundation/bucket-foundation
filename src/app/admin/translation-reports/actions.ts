"use server";

import { revalidatePath } from "next/cache";
import { deleteTranslationReport, resolveTranslationReport } from "@/lib/academy/translation-report-server";
import { requireStaff } from "@/lib/admin/session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function translationReportAction(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!UUID_RE.test(id)) return;
  if (action === "resolve") await resolveTranslationReport(id);
  else if (action === "delete") await deleteTranslationReport(id);
  else return;
  revalidatePath("/admin/translation-reports");
}
