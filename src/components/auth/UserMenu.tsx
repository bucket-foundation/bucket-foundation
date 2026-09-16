"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/providers/SessionProvider";
import { signInUrl } from "@/lib/auth/paths";

/** The header's account control: a sign-in link, or the person's email and a sign-out form. */
export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const { loading, enabled, user } = useSession();
  const pathname = usePathname() || "/";
  if (!enabled) return null;
  if (loading) return <span aria-hidden className="inline-block w-16 h-4 rounded-sm bg-[color:var(--bone-3)]/60" />;
  if (!user) {
    return (
      <Link
        href={signInUrl(pathname)}
        className="small-caps text-[11px] text-[color:var(--basalt)] border border-[color:var(--hairline)] px-4 py-2 rounded-sm hover:bg-[color:var(--bone-2)] transition inline-flex items-center min-h-[44px]"
      >
        Sign in
      </Link>
    );
  }
  const label = user.email ? user.email.split("@")[0] : "account";
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        title={user.email ?? undefined}
        className={
          "small-caps text-[11px] text-[color:var(--basalt)] border border-[color:var(--hairline)] px-3 py-2 rounded-sm hover:bg-[color:var(--bone-2)] transition inline-flex items-center min-h-[44px] max-w-[160px] truncate" +
          (compact ? "" : "")
        }
      >
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
