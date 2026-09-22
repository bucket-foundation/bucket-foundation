import type { Metadata } from "next";
import Link from "next/link";
import { signInOpen } from "@/lib/launch";
import { safeNextPath } from "@/lib/auth/paths";
import SignInForm from "./SignInForm";
import WaitlistForm from "./WaitlistForm";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

export function generateMetadata(): Metadata {
  return signInOpen()
    ? { title: "Sign in", description: "Sign in to Research OS with an email code.", robots: { index: false, follow: false } }
    : { title: "Launch list", description: "Leave your email to hear when Research OS opens.", robots: { index: false, follow: false } };
}

const H1 = "font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]";
const SWITCH = "underline underline-offset-4 text-[color:var(--basalt-2)] hover:text-[color:var(--basalt)]";

/**
 * /sign-in. Before launch, production shows the launch list and keeps a
 * sign-in for existing accounts at /sign-in?account=1 (src/lib/launch.ts).
 */
export default function SignInPage({ searchParams }: { searchParams?: SearchParams }) {
  const next = first(searchParams?.next);
  const nextQuery = next ? `next=${encodeURIComponent(safeNextPath(next))}` : "";

  if (signInOpen()) {
    return (
      <Shell>
        <h1 className={H1}>Sign in</h1>
        <SignInForm next={next} />
      </Shell>
    );
  }

  if (first(searchParams?.account) === "1") {
    return (
      <Shell>
        <h1 className={H1}>Sign in</h1>
        <p className="mt-3 text-[13px] text-[color:var(--basalt-2)]">For accounts that already exist.</p>
        <SignInForm next={next} allowNewAccounts={false} />
        <p className="mt-8 text-[12px] text-[color:var(--basalt-3)]">
          New here?{" "}
          <Link href={nextQuery ? `/sign-in?${nextQuery}` : "/sign-in"} className={SWITCH}>
            Join the launch list
          </Link>
        </p>
      </Shell>
    );
  }

  const wanted = next && safeNextPath(next) === next ? next : null;
  return (
    <Shell>
      <p className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--gold-deep)] mb-3">research os</p>
      <h1 className={H1}>Get notified at launch</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--basalt-2)]">
        Research OS is in private testing. Leave your email and we will write once, the day it opens.
      </p>
      <WaitlistForm wanted={wanted} />
      <p className="mt-8 text-[12px] text-[color:var(--basalt-3)]">
        Have an account?{" "}
        <Link href={`/sign-in?account=1${nextQuery ? `&${nextQuery}` : ""}`} className={SWITCH}>
          Sign in
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[70vh] flex items-start justify-center px-4 md:px-6 pt-12 md:pt-20 pb-16">
      <div className="w-full max-w-[400px]">{children}</div>
    </main>
  );
}
