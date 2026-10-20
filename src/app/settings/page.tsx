import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { signInUrl } from "@/lib/auth/paths";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect(signInUrl("/settings"));

  return (
    <main className="max-w-[720px] mx-auto px-4 md:px-6 py-10 md:py-14">
      <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)]">settings</h1>
      <section className="mt-8 p-5 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)]">
        <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">email</div>
        <div className="mt-1 text-[15px] text-[color:var(--basalt)]" data-settings-email>{user.email ?? user.id}</div>
        <form method="post" action="/auth/sign-out" className="mt-4">
          <button type="submit" className="small-caps text-[11px] text-[color:var(--bone)] bg-[color:var(--laurel-deep)] tracking-[0.14em] px-4 rounded-sm hover:bg-[color:var(--aegean-deep)] transition inline-flex items-center h-11">
            Sign out
          </button>
        </form>
      </section>
      <p className="mt-6 text-[14px] text-[color:var(--basalt-2)]">
        Change your handle and name on your <Link href="/account" className="underline underline-offset-4">profile</Link>.
      </p>
    </main>
  );
}
