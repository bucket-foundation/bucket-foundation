"use client";

import { useEffect, useRef, useState } from "react";
import CanonGlobeMount from "@/app/canon/CanonGlobeMount";
import type { ScrollState } from "@/components/canon-globe/CanonGlobe";

/**
 * A single fixed, page-level mount of the real canon globe, decorative and
 * chromeless: twice the viewport height across, tucked toward the bottom
 * right, soft (the globe renders at 0.22 device pixels per CSS pixel and
 * the browser upsamples it). No CSS filter, opacity, or mask on this
 * wrapper: each makes the compositor render the 2100px layer offscreen,
 * and that hangs the AMD Phoenix iGPU under amdgpu within a few loads.
 * Transparency is in the globe's materials and the edge dissolves under a
 * painted radial gradient of the bone ground. The globe spins only while the page scrolls (scroll position maps
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
  // Diagnostic switch: ?noglobe=1 renders the page without this mount.
  const [disabled, setDisabled] = useState(false);
  const [variant, setVariant] = useState({ small: false, noshell: false, fulldpr: false, nofade: false, nospin: false, notilt: false, absolute: false, opaque: false });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setDisabled(q.has("noglobe"));
    setVariant({ small: q.has("small"), noshell: q.has("noshell"), fulldpr: q.has("fulldpr"), nofade: q.has("nofade"), nospin: q.has("nospin"), notilt: q.has("notilt"), absolute: q.has("absolute"), opaque: q.has("opaque") });
  }, []);

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

  if (disabled) return null;
  return (
    <div
      aria-hidden
      className={[
        variant.absolute ? "absolute" : "fixed",
        "z-[1] pointer-events-none left-[78vw] top-[64vh] -translate-x-1/2 -translate-y-1/2",
        variant.small ? "w-[96vh] h-[96vh]" : "w-[192vh] h-[192vh]",
      ].join(" ")}
    >
      {/* `branches` is required by CanonGlobeMount's type but read only by
          its interactive mount; decorative mode ignores it. The Earth mesh,
          land mask, and materials are the same render as /canon/search. */}
      <CanonGlobeMount
        branches={[]}
        decorative
        scrollRef={scrollRef}
        containerClassName="relative w-full h-full"
        variant={variant}
      />
      {/* Painted gradient, no mask or opacity on the wrapper: transparent
          over the globe's middle, bone at the edge, so the border dissolves
          into the page ground. The footer sits above this layer. */}
      {!variant.nofade && <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(239,232,212,0) 36%, rgba(239,232,212,0.85) 58%, var(--bone) 68%)",
        }}
      />}
    </div>
  );
}
