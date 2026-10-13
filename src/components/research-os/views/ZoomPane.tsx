"use client";

import { useRef, useState } from "react";

export const ZOOM_STEPS = [1, 1.5, 2, 3, 4, 6] as const;

export function nextZoom(current: number, direction: 1 | -1): number {
  const i = ZOOM_STEPS.indexOf(current as (typeof ZOOM_STEPS)[number]);
  const at = i === -1 ? 0 : i;
  return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, at + direction))];
}

const BUTTON = "h-8 min-w-8 px-2 rounded-sm border border-[color:var(--hairline)] bg-[color:var(--bone-2)] text-[12px] text-[color:var(--basalt)] hover:bg-[color:var(--bone)] disabled:opacity-40";

export default function ZoomPane({ svg, label }: { svg: string; label: string }) {
  const [zoom, setZoom] = useState<number>(1);
  const pane = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = pane.current;
    if (!el || zoom === 1) return;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = pane.current;
    const d = drag.current;
    if (!el || !d) return;
    el.scrollLeft = d.left - (e.clientX - d.x);
    el.scrollTop = d.top - (e.clientY - d.y);
  };
  const end = () => {
    drag.current = null;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2" role="group" aria-label={`${label} zoom`}>
        <button type="button" className={BUTTON} onClick={() => setZoom((z) => nextZoom(z, -1))} disabled={zoom === ZOOM_STEPS[0]} aria-label="zoom out">
          −
        </button>
        <span className="text-[12px] tabular-nums text-[color:var(--basalt-2)] w-10 text-center" data-testid="zoom-level">
          {zoom}×
        </span>
        <button type="button" className={BUTTON} onClick={() => setZoom((z) => nextZoom(z, 1))} disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]} aria-label="zoom in">
          +
        </button>
        <button type="button" className={BUTTON} onClick={() => setZoom(1)} disabled={zoom === 1}>
          fit
        </button>
        <span className="text-[12px] text-[color:var(--basalt-2)]">{zoom === 1 ? "zoom in, then drag to move" : "drag to move"}</span>
      </div>
      <div
        ref={pane}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className={`w-full max-h-[85vh] overflow-auto border border-[color:var(--hairline)] rounded-sm ${zoom === 1 ? "" : "cursor-grab active:cursor-grabbing select-none"}`}
        data-testid="zoom-pane"
      >
        <div style={{ width: `${zoom * 100}%` }} className="[&>svg]:w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </div>
  );
}
