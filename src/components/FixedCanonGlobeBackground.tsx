"use client";

import { useEffect, useRef } from "react";
import CanonGlobeMount from "@/app/canon/CanonGlobeMount";
import type { ScrollState } from "@/components/canon-globe/CanonGlobe";

/**
 * A single fixed, page-level mount of the real canon globe, decorative and
 * chromeless: twice the viewport height across, centered right of the text
 * column, soft (the globe renders at 0.4 device pixels per CSS pixel and
 * the browser upsamples it; no CSS filter, a compositor blur over a layer
 * this large hangs the AMD Phoenix GPU under amdgpu), with a radial mask
 * so its edge dissolves into the bone ground. The globe spins only while the page scrolls (scroll position maps
 * to rotation, eased inside the R3F frame loop) and its particle shell
 * expands with scroll speed and settles back. This component measures
 * scroll and writes {y, velocity}; the globe reads it every frame.
 *
 * `z-[1]` is load-bearing: the shared `<Footer>` carries `position:
 * relative` with no explicit z-index and sits later in `<body>`, so at
 * `z-0` it would paint over the globe. `z-[1]` keeps this behind the
 * page's own content wrapper (`z-10`) while staying above the footer.
 */
export default function FixedCanonGlobeBackground() {
  const scrollRef = useRef<ScrollState>({ y: 0, velocity: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastY = window.scrollY;
    let lastT = performance.now();
    scrollRef.current.y = lastY;
    const onScroll = () => {
      const y = window.scrollY;
      const t = performance.now();
      const dt = Math.max(1, t - lastT);
      const velocity = Math.abs(y - lastY) / dt; // px per ms
      scrollRef.current.y = y;
      scrollRef.current.velocity = Math.max(scrollRef.current.velocity * 0.5, velocity);
      lastY = y;
      lastT = t;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const edgeMask = "radial-gradient(circle at center, black 40%, transparent 68%)";

  return (
    <div
      aria-hidden
      className="fixed z-[1] pointer-events-none left-[70vw] top-[50vh] -translate-x-1/2 -translate-y-1/2 w-[192vh] h-[192vh]"
      style={{ WebkitMaskImage: edgeMask, maskImage: edgeMask }}
    >
      {/* `branches` is required by CanonGlobeMount's type but read only by
          its interactive mount; decorative mode ignores it. The Earth mesh,
          land mask, and materials are the same render as /canon/search. */}
      <CanonGlobeMount
        branches={[]}
        decorative
        scrollRef={scrollRef}
        containerClassName="relative w-full h-full"
      />
    </div>
  );
}
