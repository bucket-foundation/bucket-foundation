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
 * sized to fill the window. The panel reads as its own surface (a darker
 * stone fill and a top hairline against the hero above it) and the globe
 * is pulled up past the panel's own top edge so its dome rises into the
 * hero, overflow left visible on both the panel and the globe wrapper.
 */
export default function CanonSearchPanel({ branches }: Props) {
  return (
    <section
      className="relative w-full h-screen overflow-visible border-t border-[color:var(--hairline)] bg-[color:var(--bone-2)]"
      aria-label="search the canon"
    >
      <CanonGlobeMount
        branches={branches}
        containerClassName="relative w-full h-full overflow-visible flex flex-col backdrop-blur-[1px]"
        globeWrapperClassName="-mt-[28vh]"
      />
    </section>
  );
}
