import type { Metadata } from "next";
import SignInForm from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Research OS with an email code.",
  robots: { index: false, follow: false },
};

export default function SignInPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const raw = searchParams?.next;
  const next = Array.isArray(raw) ? raw[0] : raw;
  return (
    <main className="min-h-[70vh] flex items-start justify-center px-4 md:px-6 pt-12 md:pt-20 pb-16">
      <div className="w-full max-w-[420px]">
        <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">Research OS</div>
        <h1 className="mt-2 font-display uppercase text-[clamp(1.5rem,4vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)]">sign in</h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
          One email, one code. The same sign-in covers the workspace, the Academy, the map, and your class.
        </p>
        <SignInForm next={next ?? null} />
      </div>
    </main>
  );
}
