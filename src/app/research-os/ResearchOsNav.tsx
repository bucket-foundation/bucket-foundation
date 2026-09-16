"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The module bar for Research OS. One entry per area of the module map in
// learning/research-os/INTEGRATION-PLAN.md section 9; each points at the
// surface that holds that area today.
const MODULES: { href: string; label: string; match: string[] }[] = [
  { href: "/research-os", label: "Overview", match: ["/research-os"] },
  { href: "/canon/search", label: "Map", match: ["/canon"] },
  { href: "/academy", label: "Learn", match: ["/academy", "/ladder"] },
  { href: "/research-os/workspace", label: "Workspace", match: ["/research-os/workspace"] },
  { href: "/research-os/review", label: "Produce", match: ["/research-os/review", "/research/papers"] },
  { href: "/research", label: "Frontier", match: ["/research", "/research-os/edges"] },
  { href: "/research-os/class", label: "Class", match: ["/research-os/class", "/research-os/roster"] },
  { href: "/research-os/profile", label: "Profile", match: ["/research-os/profile", "/m"] },
  { href: "/library", label: "Corpora", match: ["/library", "/knowledge", "/kruse", "/sacred-history"] },
];

export default function ResearchOsNav() {
  const pathname = usePathname() || "/research-os";
  const active = (m: (typeof MODULES)[number]) =>
    m.href === "/research-os"
      ? pathname === "/research-os"
      : m.match.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <nav
      aria-label="Research OS modules"
      className="relative z-10 border-b border-[color:var(--hairline)] bg-[color:var(--bone)]/85 backdrop-blur-[2px]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-1 overflow-x-auto">
        {MODULES.map((m) => {
          const on = active(m);
          return (
            <Link
              key={m.label}
              href={m.href}
              aria-current={on ? "page" : undefined}
              className={
                "small-caps text-[10px] tracking-[0.18em] px-3 py-3 whitespace-nowrap border-b-2 transition " +
                (on
                  ? "border-[color:var(--gold)] text-[color:var(--basalt)]"
                  : "border-transparent text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)]")
              }
            >
              {m.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
