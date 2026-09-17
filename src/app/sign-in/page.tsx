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
      <div className="w-full max-w-[400px]">
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">Sign in</h1>
        <SignInForm next={next ?? null} />
      </div>
    </main>
  );
}
