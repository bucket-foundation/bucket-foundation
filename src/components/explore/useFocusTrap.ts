"use client";

import { useEffect, type RefObject } from "react";
import { FOCUSABLE, trapIndex } from "@/lib/explore/focus";

function visible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean, initial?: RefObject<HTMLElement>): void {
  useEffect(() => {
    const root = ref.current;
    if (!root || !active) return;
    const before = document.activeElement as HTMLElement | null;
    initial?.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible);
      if (!items.length) return;
      const at = items.indexOf(document.activeElement as HTMLElement);
      const inside = root.contains(document.activeElement);
      const next = trapIndex(inside ? at : -1, items.length, e.shiftKey);
      e.preventDefault();
      items[next].focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [ref, active, initial]);
}
