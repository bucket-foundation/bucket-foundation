"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signInUrl } from "@/lib/auth/paths";

export default function SignInGate({ signedIn, children }: { signedIn: boolean; children?: React.ReactNode }) {
  const pathname = usePathname() || "/";
  if (signedIn) return children ? <>{children}</> : null;
  return (
    <div className="mt-6 p-4 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] flex items-center justify-between gap-3 flex-wrap">
      <span className="text-[13px] text-[color:var(--basalt-2)]">Sign in to continue.</span>
      <Link
        href={signInUrl(pathname)}
        className="px-4 py-2 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)]"
      >
        sign in
      </Link>
    </div>
  );
}
