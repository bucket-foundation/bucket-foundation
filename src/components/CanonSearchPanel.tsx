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
 * sized to fill the window. The panel has no surface of its own (the page
 * ground shows through), the search bar and filters sit in a left column
 * (layout="home"), and the globe is pulled up past the panel's top edge so
 * its dome rises into the hero, overflow left visible on both the panel
 * and the globe wrapper.
 */
export default function CanonSearchPanel({ branches }: Props) {
  return (
    <section
      className="relative w-full h-screen overflow-visible"
      aria-label="search the canon"
    >
      <CanonGlobeMount
        branches={branches}
        containerClassName="relative w-full h-full overflow-visible flex flex-col"
        globeWrapperClassName="-mt-[32vh]"
        layout="home"
      />
    </section>
  );
}
