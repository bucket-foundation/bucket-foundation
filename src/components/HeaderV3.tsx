"use client";

import Link from "next/link";
import UserMenu from "@/components/auth/UserMenuV2";
import InverseOmega from "./InverseOmega";
import TrackedLink from "./TrackedLink";
import { START_LEARNING_HREF } from "@/lib/analytics/funnel";

export default function HeaderV3({ launchList = false }: { launchList?: boolean }) {
  return (
    <header className="w-full border-b border-[color:var(--hairline)] backdrop-blur-[2px] bg-[color:var(--bone)]/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 py-3 md:py-5 gap-3">
        <Link href="/" className="flex items-center gap-2 md:gap-3 group min-w-0" aria-label="bucket.foundation">
          <InverseOmega size={40} variant="carved" className="shrink-0" />
          <span className="hidden sm:inline font-display uppercase text-[15px] md:text-[18px] tracking-[0.06em] md:tracking-[0.08em] text-[color:var(--basalt)] font-bold truncate">
            bucket<span className="text-[color:var(--gold-deep)]">.</span>foundation
          </span>
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <UserMenu launchList={launchList} />
          <TrackedLink
            href="/download"
            event="download_click"
            from="header"
            className="hidden sm:flex h-11 items-center px-2 text-[color:var(--basalt-2)] hover:text-[color:var(--gold-deep)] transition small-caps text-[11px] tracking-[0.14em] shrink-0"
          >
            Download
          </TrackedLink>
          <TrackedLink
            href={START_LEARNING_HREF}
            event="start_learning_click"
            from="header"
            className="h-11 flex items-center px-3 md:px-4 rounded-sm bg-[color:var(--gold)] text-[color:var(--basalt)] hover:bg-[color:var(--gold-deep)] hover:text-[color:var(--bone)] transition small-caps text-[11px] tracking-[0.14em] shrink-0"
          >
            Start learning
          </TrackedLink>
        </div>
      </div>
    </header>
  );
}
