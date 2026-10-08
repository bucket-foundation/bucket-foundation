import "katex/dist/katex.min.css";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionUser } from "@/lib/supabase/server";
import { getIdentity } from "@/lib/auth/identity";
import { signInUrl, DEFAULT_AFTER_SIGN_IN } from "@/lib/auth/paths";
import { isLaunchStaff } from "@/lib/research-os/launch-gate";
import AppShell from "./AppShell";

export const dynamic = "force-dynamic";

export default async function ResearchOsAppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect(signInUrl(DEFAULT_AFTER_SIGN_IN));
  const identity = await getIdentity(user.id);
  const staff = isLaunchStaff(user);
  return (
    <AppShell host={headers().get("host")} user={{ email: user.email, handle: identity?.handle ?? null, staff }}>
      {children}
    </AppShell>
  );
}
