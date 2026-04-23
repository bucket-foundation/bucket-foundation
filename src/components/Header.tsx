"use client";

import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import Link from "next/link";
import InverseOmega from "./InverseOmega";

const NAV = [
  { href: "/canon",    label: "Canon" },
  { href: "/research", label: "Research" },
  { href: "/kruse",    label: "Kruse" },
  { href: "/protocol", label: "Protocol" },
  { href: "/about",    label: "About" },
];

const HAS_DYNAMIC = !!process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID;

export default function Header() {
  return (
    <header className="w-full border-b-2 border-[color:var(--basalt)] stone-bone">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-3 group"
          aria-label="bucket.foundation"
        >
          <InverseOmega size={38} />
          <span className="font-display uppercase text-[18px] tracking-[0.08em] chisel">
            bucket<span className="text-[color:var(--aegean-deep)]">.</span>foundation
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 small-caps text-[11px] text-[color:var(--basalt-2)]">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="hover:text-[color:var(--aegean-deep)] transition border-b-2 border-transparent hover:border-[color:var(--gold)] pb-1"
            >
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
              className="small-caps text-[11px] text-[color:var(--bone)] bg-[color:var(--basalt)] px-5 py-2 hover:bg-[color:var(--aegean-deep)] transition"
            >
              Contribute
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
