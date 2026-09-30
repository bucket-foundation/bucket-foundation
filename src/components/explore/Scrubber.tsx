"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { fractionOfIndex, indexFromFraction, keyStep } from "@/lib/explore/scrub";

interface Props {
  count: number;
  index: number;
  label: string;
  ariaLabel: string;
  onIndex(i: number): void;
  labelTestId?: string;
  suffix?: string;
}

const GOLD = "#D9A43A";
const mono = { fontFamily: "var(--font-jetbrains)" };

export default function Scrubber({ count, index, label, ariaLabel, onIndex, labelTestId = "scrubber-label", suffix }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const fraction = fractionOfIndex(index, count);

  const move = (clientX: number) => {
    const el = track.current;
    if (!el || count <= 0) return;
    const r = el.getBoundingClientRect();
    onIndex(indexFromFraction((clientX - r.left) / Math.max(1, r.width), count));
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    move(e.clientX);
  };

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = keyStep(e.key, index, count);
    if (next === null) return;
    e.preventDefault();
    onIndex(next);
  };

  return (
    <div data-testid="scrubber" data-index={index} data-count={count} className="w-full px-2 select-none">
      <p data-testid={labelTestId} className="text-center text-sm mb-2" style={mono}>
        {label}
        {suffix}
      </p>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, count - 1)}
        aria-valuenow={index}
        aria-valuetext={label}
        onPointerDown={down}
        onPointerMove={(e) => dragging.current && move(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={key}
        className="relative h-6 cursor-ew-resize touch-none outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D9A43A]"
      >
        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded" style={{ background: "color-mix(in srgb, currentColor 30%, transparent)" }} />
        <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded" style={{ width: `${fraction * 100}%`, background: GOLD }} />
        <div data-testid="scrubber-handle" className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${fraction * 100}%`, background: GOLD, boxShadow: "0 0 0 3px rgba(20,19,17,0.9)" }} />
      </div>
    </div>
  );
}
