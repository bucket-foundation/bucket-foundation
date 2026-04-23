"use client";

import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import Link from "next/link";
import Shield from "./Shield";

const NAV = [
  { href: "/canon",    label: "Canon" },
  { href: "/research", label: "Research" },
  { href: "/kruse",    label: "Kruse" },
  { href: "/protocol", label: "Protocol" },
  { href: "/about",    label: "About" },
];

// Dynamic widget crashes when its context isn't mounted (e.g. static pages
// rendered without NEXT_PUBLIC_DYNAMIC_ENV_ID). Render it only when the env
// is present so the public marketing chrome stays universally reachable.
const HAS_DYNAMIC = !!process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID;

export default function Header() {
  return (
    <header className="w-full border-b hairline">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3 text-[color:var(--gold)] hover:text-[color:var(--parchment)] transition">
          <Shield size={36} />
          <span className="font-serif-display text-xl tracking-tight">
            bucket<span className="text-[color:var(--parchment-dim)]">.</span>foundation
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 small-caps text-[13px] text-[color:var(--parchment-dim)]">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-[color:var(--parchment)] transition">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {HAS_DYNAMIC ? (
            <DynamicWidget />
          ) : (
            <Link
              href="/join"
              className="small-caps text-[11px] text-[color:var(--gold)] border border-[color:var(--gold)] px-4 py-2 hover:bg-[color:var(--gold)] hover:text-[color:var(--ink)] transition"
            >
              Contribute
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
