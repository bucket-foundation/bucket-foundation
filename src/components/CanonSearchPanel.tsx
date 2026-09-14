"use client";

import CanonGlobeMount from "@/app/canon/CanonGlobeMount";
import type { GlobeBranch } from "./CanonGlobe";

interface Props {
  branches: GlobeBranch[];
}

/**
 * Full-viewport variation of CanonGlobeMount for the homepage, a thin
 * wrapper reusing the same live search bar, branch filter chips, and
 * detail drawer CanonGlobeMount already ships to /canon and /canon/search,
 * sized to fill the window and with the globe lifted above the panel's
 * own top edge so its upper half reads as part of the hero above it.
 */
export default function CanonSearchPanel({ branches }: Props) {
  return (
    <section
      className="relative w-full h-screen overflow-visible"
      aria-label="search the canon"
    >
      <CanonGlobeMount
        branches={branches}
        containerClassName="relative w-full h-full overflow-visible flex flex-col bg-[color:var(--bone)]/70 backdrop-blur-[1px]"
        globeWrapperClassName="-translate-y-16 sm:-translate-y-20 md:-translate-y-28 lg:-translate-y-36"
      />
    </section>
  );
}
