"use client";

import { useEffect, useRef } from "react";
import CanonGlobeMount from "@/app/canon/CanonGlobeMount";

// How much of one scroll delta (px) turns into extra auto-rotate speed,
// and the ceiling on that extra so a huge scroll-to-top jump doesn't spin
// the globe like a coin.
const VELOCITY_TO_SCROLL_EXTRA = 0.03;
const MAX_SCROLL_EXTRA = 2.5;

/**
 * A single fixed, page-level mount of the real canon globe, decorative
 * and chromeless (no search bar, no filters, no drawer): centered near
 * the top right of the viewport (68vw, 62vh) so its lower right runs off
 * the bottom right of the screen, behind all page content, dimmed, and
 * never intercepting clicks. Auto-rotates at a slow base rate
 * that speeds up with scroll velocity and eases back down, the easing
 * itself runs inside the R3F globe's own frame loop, this component only
 * measures scroll and writes a target.
 *
 * `z-[1]` (not `z-0`) is load-bearing: the shared `<Footer>` carries
 * `position: relative` with no explicit z-index (stack level 0, same as
 * `z-0`), and it sits later in `<body>` than this component, so at `z-0`
 * it would win the paint order and hide the globe behind the footer for
 * the whole time the footer is on screen. `z-[1]` keeps this behind the
 * page's own content wrapper (`z-10`) while staying above the footer.
 */
export default function FixedCanonGlobeBackground() {
  const scrollSpeedRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const y = window.scrollY;
      const t = performance.now();
      const dt = Math.max(1, t - lastT); // ms, avoid divide-by-zero
      const velocity = Math.abs(y - lastY) / dt; // px per ms
      scrollSpeedRef.current = Math.min(MAX_SCROLL_EXTRA, velocity * VELOCITY_TO_SCROLL_EXTRA * 60);
      lastY = y;
      lastT = t;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // No CSS `filter` on this wrapper (a prior version used
  // `blur(1.6px)`): a filter on a WebGL canvas's ancestor forces the
  // browser to promote it into its own compositing layer, which is
  // where a sandboxed or hardware-blocklisted renderer can refuse to
  // hand WebGL a context at all. The interactive /canon globe, which
  // has no ancestor filter, does not hit this. Dimming alone
  // (opacity) carries none of that compositing risk, so it is the
  // only softening applied here.
  return (
    <div
      aria-hidden
      className="fixed z-[1] pointer-events-none left-[68vw] top-[62vh] -translate-x-1/2 -translate-y-1/2 w-[85vh] h-[85vh]"
      style={{ opacity: 0.55 }}
    >
      <CanonGlobeMount
        branches={[]}
        decorative
        scrollSpeedRef={scrollSpeedRef}
        containerClassName="relative w-full h-full"
      />
    </div>
  );
}
