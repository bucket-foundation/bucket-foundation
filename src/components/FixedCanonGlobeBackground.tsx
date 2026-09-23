"use client";

import { useEffect, useRef, useState } from "react";
import CanonGlobeMount from "@/app/canon/CanonGlobeMount";
import type { ScrollState, DecorativeVariant } from "@/components/canon-globe/CanonGlobe";

export default function FixedCanonGlobeBackground() {
  const scrollRef = useRef<ScrollState>({ y: 0, velocity: 0 });
  const [disabled, setDisabled] = useState(false);
  const [variant, setVariant] = useState<DecorativeVariant & { small: boolean; absolute: boolean }>({
    small: false,
    absolute: false,
  });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setDisabled(q.has("noglobe"));
    const num = (k: string) => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : undefined);
    const hex = (k: string) => (q.has(k) && /^[0-9a-f]{6}$/i.test(q.get(k) || "") ? parseInt(q.get(k) as string, 16) : undefined);
    setVariant({
      small: q.has("small"),
      absolute: q.has("absolute"),
      noshell: q.has("noshell"),
      fulldpr: q.has("fulldpr"),
      nospin: q.has("nospin"),
      notilt: q.has("notilt"),
      opaque: q.has("opaque"),
      dots: num("dots"),
      dotr: num("dotr"),
      dotcolor: hex("dotcolor"),
      limb: num("limb"),
      blur: num("blur"),
      passes: num("passes"),
      dpr: num("dpr"),
    });
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
      const velocity = Math.abs(y - lastY) / dt;
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
      <CanonGlobeMount
        branches={[]}
        decorative
        scrollRef={scrollRef}
        containerClassName="relative w-full h-full"
        variant={variant}
      />
    </div>
  );
}
