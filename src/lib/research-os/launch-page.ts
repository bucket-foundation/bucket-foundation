import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { inLaunchScope } from "./launch-scope";
import { launchPageAllowed } from "./launch-gate";

export async function gateLaunchPage(route: string): Promise<void> {
  if (inLaunchScope(route)) return;
  if (!launchPageAllowed(route, await getSessionUser())) notFound();
}
