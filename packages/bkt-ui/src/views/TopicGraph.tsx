import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { boxOf, STATE_LABEL, wrapTitle, type Box, type TopicLayout, type TopicState } from "./path-graph";

const FALLBACK: Size = { w: 1000, h: 560 };
const READABLE = 0.75;
const SMALLEST = 0.04;
const PAD = 60;

interface Size {
  w: number;
  h: number;
}

interface View {
  k: number;
  x: number;
  y: number;
}

function fit(box: Box, floor: number, size: Size): View {
  const k = Math.max(floor, Math.min(1, size.w / (box.w + PAD * 2), size.h / (box.h + PAD * 2)));
  return { k, x: size.w / 2 - (box.x + box.w / 2) * k, y: size.h / 2 - (box.y + box.h / 2) * k };
}

function zoomAt(v: View, factor: number, cx: number, cy: number): View {
  const k = Math.max(SMALLEST, Math.min(2, v.k * factor));
  return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
}

function Glyph({ state }: { state: TopicState }) {
  if (state === "known") return <circle cx={16} cy={18} r={6} className="glyph solid" />;
  if (state === "due") return <path d="M16 10 L24 18 L16 26 L8 18 Z" className="glyph solid" />;
  if (state === "new") return <circle cx={16} cy={18} r={5.5} className="glyph hollow" />;
  return <rect x={10.5} y={12.5} width={11} height={11} className="glyph hollow" />;
}

interface DrawnProps {
  layout: TopicLayout;
  title: (id: string) => string;
  states: ReadonlyMap<string, TopicState>;
  selected: string | null;
  dimmed: ReadonlySet<string>;
  domId: (id: string) => string;
  onPick: (id: string) => void;
}

const Drawn = memo(function Drawn({ layout, title, states, selected, dimmed, domId, onPick }: DrawnProps) {
  const { nodeW, nodeH } = layout.size;
  const near = new Map<string, "needs" | "opens">();
  if (selected) {
    for (const p of layout.needs.get(selected) ?? []) near.set(p, "needs");
    for (const c of layout.opens.get(selected) ?? []) near.set(c, "opens");
  }
  const curve = (from: string, to: string) => {
    const a = layout.nodes.get(from)!;
    const b = layout.nodes.get(to)!;
    const x1 = a.x + nodeW;
    const y1 = a.y + nodeH / 2;
    const y2 = b.y + nodeH / 2;
    const bend = Math.max(30, Math.abs(b.x - x1) / 2);
    return `M${x1} ${y1} C${x1 + bend} ${y1} ${b.x - bend} ${y2} ${b.x} ${y2}`;
  };
  const lit = layout.edges.filter((e) => e.from === selected || e.to === selected);
  const rest = layout.edges.filter((e) => e.from !== selected && e.to !== selected);
  return (
    <>
      <g aria-hidden>
        {rest.map((e) => (
          <path key={`${e.from}>${e.to}`} d={curve(e.from, e.to)} className={`edge${selected || dimmed.has(e.from) || dimmed.has(e.to) ? " faint" : ""}`} />
        ))}
        {lit.map((e) => (
          <path key={`${e.from}>${e.to}`} d={curve(e.from, e.to)} className={`edge ${e.to === selected ? "needs" : "opens"}`} />
        ))}
      </g>
      {Array.from(layout.nodes.values()).map((n) => {
        const state = states.get(n.id) ?? "locked";
        const lines = wrapTitle(title(n.id));
        const role = n.id === selected ? " on" : near.has(n.id) ? ` ${near.get(n.id)}` : "";
        return (
          <g
            key={n.id}
            id={domId(n.id)}
            role="button"
            aria-pressed={n.id === selected}
            aria-label={`${title(n.id)}. ${STATE_LABEL[state]}.`}
            className={`topic ${state}${role}${dimmed.has(n.id) ? " dim" : ""}`}
            transform={`translate(${n.x} ${n.y})`}
            onClick={() => onPick(n.id)}
          >
            <rect width={nodeW} height={nodeH} rx={state === "locked" ? 2 : 12} className="box" />
            <Glyph state={state} />
            {lines.map((l, i) => (
              <text key={i} x={30} y={23 + i * 16} className="name">
                {l}
              </text>
            ))}
            <text x={nodeW - 10} y={nodeH - 8} textAnchor="end" className="state">
              {STATE_LABEL[state]}
            </text>
          </g>
        );
      })}
    </>
  );
});

export interface TopicGraphProps {
  layout: TopicLayout;
  title: (id: string) => string;
  states: ReadonlyMap<string, TopicState>;
  selected: string | null;
  dimmed: ReadonlySet<string>;
  focus: { key: string; ids: readonly string[] };
  onSelect: (id: string) => void;
}

export function TopicGraph({ layout, title, states, selected, dimmed, focus, onSelect }: TopicGraphProps) {
  const svg = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const frontier = useMemo(() => boxOf(layout, focus.ids) ?? layout.box, [layout, focus]);
  const [size, setSize] = useState<Size>(FALLBACK);
  const [view, setView] = useState<View>(() => fit(frontier, READABLE, FALLBACK));
  const order = useMemo(() => new Map(Array.from(layout.nodes.keys()).map((id, i) => [id, i])), [layout]);
  const domId = useCallback((id: string) => `topic-${order.get(id)}`, [order]);

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
  }, []);

  useEffect(() => setView(fit(frontier, READABLE, size)), [frontier, size]);

  useEffect(() => {
    const n = selected ? layout.nodes.get(selected) : undefined;
    if (!n) return;
    setView((v) => {
      const left = n.x * v.k + v.x;
      const top = n.y * v.k + v.y;
      const inside = left >= 0 && top >= 0 && left + layout.size.nodeW * v.k <= size.w && top + layout.size.nodeH * v.k <= size.h;
      if (inside && v.k >= READABLE / 2) return v;
      const k = Math.max(v.k, READABLE);
      return { k, x: size.w / 2 - (n.x + layout.size.nodeW / 2) * k, y: size.h / 2 - (n.y + layout.size.nodeH / 2) * k };
    });
  }, [selected, layout, size]);

  const zoom = (factor: number) => setView((v) => zoomAt(v, factor, size.w / 2, size.h / 2));

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
  }, []);

  const down = (e: PointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    d.moved = true;
    d.x = e.clientX;
    d.y = e.clientY;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    dragged.current = true;
    setTimeout(() => (dragged.current = false), 0);
  };
  const pick = useCallback(
    (id: string) => {
      if (!dragged.current) onSelect(id);
    },
    [onSelect],
  );

  const step = (key: string): string | null => {
    const here = selected ? layout.nodes.get(selected) : undefined;
    if (!here) return focus.ids[0] ?? layout.columns[0]?.[0] ?? null;
    const byRow = (ids: string[]) => ids.slice().sort((a, b) => Math.abs(layout.nodes.get(a)!.y - here.y) - Math.abs(layout.nodes.get(b)!.y - here.y))[0] ?? null;
    if (key === "ArrowLeft") return byRow(layout.needs.get(here.id) ?? []);
    if (key === "ArrowRight") return byRow(layout.opens.get(here.id) ?? []);
    const col = layout.columns[here.depth];
    return col[here.row + (key === "ArrowUp" ? -1 : 1)] ?? null;
  };
  const keys = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const next = step(e.key);
      if (next) onSelect(next);
    } else if (e.key === "+" || e.key === "=") zoom(1.25);
    else if (e.key === "-") zoom(0.8);
    else if (e.key === "0") setView(fit(layout.box, SMALLEST, size));
  };

  return (
    <div className="topic-map">
      <div className="map-tools">
        <button className="tool" onClick={() => zoom(1.25)}>
          Zoom in
        </button>
        <button className="tool" onClick={() => zoom(0.8)}>
          Zoom out
        </button>
        <button className="tool" onClick={() => setView(fit(frontier, READABLE, size))}>
          Show what is next
        </button>
        <button className="tool" onClick={() => setView(fit(layout.box, SMALLEST, size))}>
          Show every topic
        </button>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${size.w} ${size.h}`}
        tabIndex={0}
        role="group"
        aria-label="Topic map. Arrow keys move between linked topics. Plus and minus zoom."
        aria-activedescendant={selected && order.has(selected) ? domId(selected) : undefined}
        onKeyDown={keys}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <Drawn layout={layout} title={title} states={states} selected={selected} dimmed={dimmed} domId={domId} onPick={pick} />
        </g>
      </svg>
      <p className="muted small">Drag to move the map. Scroll to zoom. Topics on the left come first, and each line runs from a topic to one it opens.</p>
    </div>
  );
}
