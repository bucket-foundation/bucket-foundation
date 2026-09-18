import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { getIdentity } from "@/lib/auth/identity";
import { signInUrl } from "@/lib/auth/paths";
import AccountForm from "./AccountForm";

export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect(signInUrl("/account"));
  const identity = await getIdentity(user.id);

  return (
    <main className="max-w-[720px] mx-auto px-4 md:px-6 py-10 md:py-14">
      <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">Research OS</div>
      <h1 className="mt-2 font-display uppercase text-[clamp(1.5rem,4vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)]">account</h1>
      <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
        One account carries every role you hold: learner, teacher, reviewer, author. Your handle is public; your email is not.
      </p>

      <section className="mt-8 grid gap-6">
        <div className="p-5 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)]">
          <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">signed in as</div>
          <div className="mt-1 text-[15px] text-[color:var(--basalt)]">{user.email ?? user.id}</div>
          <form method="post" action="/auth/sign-out" className="mt-3">
            <button type="submit" className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)]">
              sign out
            </button>
          </form>
        </div>

        <AccountForm initialHandle={identity?.handle ?? ""} initialDisplayName={identity?.displayName ?? ""} available={identity !== null} />

        <div className="p-5 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)]">
          <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">wallet</div>
          <div className="mt-1 text-[14px] text-[color:var(--basalt-2)]">
            {identity?.wallet ? (
              <span className="font-mono text-[13px]">{identity.wallet}</span>
            ) : (
              <>None linked. A wallet is linked from the canon publish flow when you first sign a citation payout.</>
            )}
          </div>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
          <Link href="/research-os/profile" className="underline underline-offset-4 text-[color:var(--aegean-deep)]">levels, credentials, privacy</Link>
          <Link href="/research-os/home" className="underline underline-offset-4 text-[color:var(--aegean-deep)]">back to Research OS</Link>
        </nav>
      </section>
    </main>
  );
}
