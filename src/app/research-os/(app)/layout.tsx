import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { getIdentity } from "@/lib/auth/identity";
import { signInUrl, DEFAULT_AFTER_SIGN_IN } from "@/lib/auth/paths";
import { isReviewerEmail } from "@/lib/research-os/reviewer";
import { isClassStaffAnywhere } from "@/lib/research-os/class-db";
import AppShell from "./AppShell";

// Every page in this group needs a session (src/middleware.ts redirects
// before we get here; this is the second check) and renders inside the
// application frame.
export const dynamic = "force-dynamic";

export default async function ResearchOsAppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect(signInUrl(DEFAULT_AFTER_SIGN_IN));
  const [identity, classStaff] = await Promise.all([getIdentity(user.id), isClassStaffAnywhere(user.id)]);
  const staff = (user.email ? isReviewerEmail(user.email) : false) || classStaff;
  return (
    <AppShell user={{ email: user.email, handle: identity?.handle ?? null, staff }}>
      {children}
    </AppShell>
  );
}
