import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { inLaunchScope } from "./launch-scope";
import { isStaff } from "./staff";

export async function gateLaunchPage(route: string): Promise<void> {
  if (inLaunchScope(route)) return;
  if (!(await isStaff(await getSessionUser()))) notFound();
}
