"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/providers/SessionProvider";
import { signInUrl } from "@/lib/auth/paths";

const BUTTON =
  "small-caps text-[11px] text-[color:var(--bone)] bg-[color:var(--laurel-deep)] px-5 py-2 rounded-sm shadow-[0_1px_0_rgba(239,232,212,0.35)_inset,0_2px_6px_rgba(31,28,22,0.25)] hover:bg-[color:var(--aegean-deep)] transition inline-flex items-center min-h-[44px]";
const DRAWER_BUTTON =
  "block text-center small-caps text-[12px] text-[color:var(--bone)] bg-[color:var(--laurel-deep)] px-6 py-4 rounded-sm shadow-[0_1px_0_rgba(239,232,212,0.35)_inset,0_2px_6px_rgba(31,28,22,0.25)] min-h-[52px] tracking-[0.1em]";

/**
 * The header's account control. Signed out: the Sign in button. Signed in:
 * the person's name (to /account) and a sign-out form. `drawer` renders
 * the phone-menu variant.
 */
export default function UserMenu({ drawer = false, onNavigate }: { drawer?: boolean; onNavigate?: () => void }) {
  const { loading, user } = useSession();
  const pathname = usePathname() || "/";
  const signIn = signInUrl(pathname === "/" ? "/research-os/home" : pathname);

  if (!user) {
    if (drawer) {
      return (
        <Link href={signIn} onClick={onNavigate} className={DRAWER_BUTTON}>
          Sign in
        </Link>
      );
    }
    return (
      <Link href={signIn} className={BUTTON + (loading ? " opacity-70" : "")}>
        Sign in
      </Link>
    );
  }

  const label = user.email ? user.email.split("@")[0] : "account";
  if (drawer) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/account" onClick={onNavigate} className={DRAWER_BUTTON}>
          {label}
        </Link>
        <form method="post" action="/auth/sign-out" className="text-center">
          <button type="submit" className="small-caps text-[11px] text-[color:var(--basalt-3)] underline underline-offset-4 min-h-[44px] px-2">
            sign out
          </button>
        </form>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/account" title={user.email ?? undefined} className={BUTTON + " max-w-[180px] truncate"}>
        {label}
      </Link>
      <form method="post" action="/auth/sign-out">
        <button type="submit" className="small-caps text-[11px] text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)] underline underline-offset-4 min-h-[44px] px-1">
          sign out
        </button>
      </form>
    </div>
  );
}
