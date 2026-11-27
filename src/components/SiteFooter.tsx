"use client";

import NavItem from "./NavItem";
import { SLIM_FOOTER_PATHS, SLIM_LINKS } from "@/lib/routes";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function SiteFooter({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  if (!SLIM_FOOTER_PATHS.includes(pathname)) return <>{children}</>;
  return (
    <footer data-slim-footer className="border-t border-[color:var(--hairline)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[12px] text-[color:var(--basalt-3)]">
        <span>bucket foundation · nonprofit</span>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5">
          {SLIM_LINKS.map((l) => (
            <NavItem key={l.href} link={l} className="min-h-[44px] inline-flex items-center hover:text-[color:var(--basalt)]" />
          ))}
        </nav>
      </div>
    </footer>
  );
}
