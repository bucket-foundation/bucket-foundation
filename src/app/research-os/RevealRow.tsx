"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Adds `is-visible` once the row enters the viewport (22% visible, with an
// 8% bottom margin), which landing.css turns into the slide and fade.
// Under prefers-reduced-motion the class lands at mount.
export default function RevealRow({
  reverse,
  children,
}: {
  reverse: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={reverse ? "ros-row reverse" : "ros-row"}>
      {children}
    </div>
  );
}
