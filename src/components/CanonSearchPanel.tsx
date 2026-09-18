"use client";

import { useEffect, useRef, useState } from "react";
import CanonGlobeMount from "@/app/canon/CanonGlobeMount";
import type { GlobeBranch } from "./CanonGlobe";

interface Props {
  branches: GlobeBranch[];
}

// How far (vh) the globe rises above the panel's top edge while the hero
// is on screen. It slides back to the panel's center as the panel scrolls
// into place, reaching center when the panel fills the viewport.
const GLOBE_LIFT_VH = 18;

/**
 * Full-viewport variation of CanonGlobeMount for the homepage, a thin
 * wrapper reusing the same live search bar, branch filter chips, and
 * detail drawer CanonGlobeMount already ships to /canon and /canon/search,
 * sized to fill the window. The panel has no surface of its own (the page
 * ground shows through), the search bar and filters sit in a left column
 * (layout="home"), and the globe is lifted above the panel's top edge at
 * page top so its dome rises into the hero, then eases back to the panel's
 * center as the panel scrolls into view.
 */
export default function CanonSearchPanel({ branches }: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [lift, setLift] = useState(GLOBE_LIFT_VH);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) return;
      // Page offset of the panel's top; progress 1 once the panel's top
      // reaches the viewport's top (the panel then fills the window).
      const top = el.getBoundingClientRect().top + window.scrollY;
      const progress = top > 0 ? Math.min(1, Math.max(0, window.scrollY / top)) : 1;
      setLift(GLOBE_LIFT_VH * (1 - progress));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-visible"
      aria-label="search the canon"
    >
      <CanonGlobeMount
        branches={branches}
        containerClassName="relative w-full h-full overflow-visible flex flex-col"
        globeWrapperStyle={{ transform: `translateY(-${lift}vh)` }}
        layout="home"
      />
    </section>
  );
}
