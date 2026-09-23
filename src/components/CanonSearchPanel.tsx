"use client";

import { useEffect, useRef, useState } from "react";
import CanonGlobeMount from "@/app/canon/CanonGlobeMount";
import type { GlobeBranch } from "./CanonGlobe";

interface Props {
  branches: GlobeBranch[];
}

const GLOBE_LIFT_VH = 18;

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
