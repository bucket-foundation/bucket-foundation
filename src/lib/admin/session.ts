import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { resolveStaff, type Staff } from "./gate";

export async function requireStaff(): Promise<Staff> {
  const staff = resolveStaff(await getSessionUser());
  if (!staff) notFound();
  return staff;
}
