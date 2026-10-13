import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import type { Box } from "./path-graph";

export const READABLE = 0.75;
export const SMALLEST = 0.04;
const FALLBACK: Size = { w: 1000, h: 560 };
const PAD = 60;

export interface Size {
  w: number;
  h: number;
}

export interface View {
  k: number;
  x: number;
  y: number;
}

export function fit(box: Box, floor: number, size: Size): View {
  const k = Math.max(floor, Math.min(1, size.w / (box.w + PAD * 2), size.h / (box.h + PAD * 2)));
  return { k, x: size.w / 2 - (box.x + box.w / 2) * k, y: size.h / 2 - (box.y + box.h / 2) * k };
}

export function zoomAt(v: View, factor: number, cx: number, cy: number): View {
  const k = Math.max(SMALLEST, Math.min(2, v.k * factor));
  return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
}

export function useMapView(svg: RefObject<SVGSVGElement | null>, start: Box, floor = READABLE) {
  const [size, setSize] = useState<Size>(FALLBACK);
  const [view, setView] = useState<View>(() => fit(start, floor, FALLBACK));
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    const el = svg.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize((s) => (s.w === Math.round(r.width) && s.h === Math.round(r.height) ? s : { w: Math.round(r.width), h: Math.round(r.height) }));
    };
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    measure();
    return () => watch.disconnect();
  }, [svg]);

  useEffect(() => setView(fit(start, floor, size)), [start, floor, size]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((v) => zoomAt(v, e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [svg]);

  const zoom = useCallback((factor: number) => setView((v) => zoomAt(v, factor, size.w / 2, size.h / 2)), [size]);
  const show = useCallback((box: Box, min = SMALLEST) => setView(fit(box, min, size)), [size]);
  const reveal = useCallback(
    (box: Box) =>
      setView((v) => {
        const left = box.x * v.k + v.x;
        const top = box.y * v.k + v.y;
        const inside = left >= 0 && top >= 0 && left + box.w * v.k <= size.w && top + box.h * v.k <= size.h;
        if (inside && v.k >= READABLE / 2) return v;
        const k = Math.max(v.k, READABLE);
        return { k, x: size.w / 2 - (box.x + box.w / 2) * k, y: size.h / 2 - (box.y + box.h / 2) * k };
      }),
    [size],
  );

  const wasDrag = useCallback(() => dragged.current, []);
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    dragged.current = true;
    setTimeout(() => (dragged.current = false), 0);
  };
  const handlers = {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      drag.current = { x: e.clientX, y: e.clientY, moved: false };
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      d.moved = true;
      d.x = e.clientX;
      d.y = e.clientY;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    },
    onPointerUp: up,
    onPointerLeave: up,
  };

  return { size, view, zoom, show, reveal, handlers, wasDrag, transform: `translate(${view.x} ${view.y}) scale(${view.k})` };
}
