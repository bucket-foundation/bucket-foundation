import { memo, useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { READABLE, useMapView } from "./map-view";
import { boxOf, STATE_LABEL, wrapTitle, type TopicLayout, type TopicState } from "./path-graph";

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
  const frontier = useMemo(() => boxOf(layout, focus.ids) ?? layout.box, [layout, focus]);
  const map = useMapView(svg, frontier);
  const { reveal, wasDrag } = map;
  const order = useMemo(() => new Map(Array.from(layout.nodes.keys()).map((id, i) => [id, i])), [layout]);
  const domId = useCallback((id: string) => `topic-${order.get(id)}`, [order]);

  useEffect(() => {
    const n = selected ? layout.nodes.get(selected) : undefined;
    if (n) reveal({ x: n.x, y: n.y, w: layout.size.nodeW, h: layout.size.nodeH });
  }, [selected, layout, reveal]);

  const pick = useCallback(
    (id: string) => {
      if (!wasDrag()) onSelect(id);
    },
    [onSelect, wasDrag],
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
    } else if (e.key === "+" || e.key === "=") map.zoom(1.25);
    else if (e.key === "-") map.zoom(0.8);
    else if (e.key === "0") map.show(layout.box);
  };

  return (
    <div className="topic-map">
      <div className="map-tools">
        <button className="tool" onClick={() => map.zoom(1.25)}>
          Zoom in
        </button>
        <button className="tool" onClick={() => map.zoom(0.8)}>
          Zoom out
        </button>
        <button className="tool" onClick={() => map.show(frontier, READABLE)}>
          Show what is next
        </button>
        <button className="tool" onClick={() => map.show(layout.box)}>
          Show every topic
        </button>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${map.size.w} ${map.size.h}`}
        tabIndex={0}
        role="group"
        aria-label="Topic map. Arrow keys move between linked topics. Plus and minus zoom."
        aria-activedescendant={selected && order.has(selected) ? domId(selected) : undefined}
        onKeyDown={keys}
        {...map.handlers}
      >
        <g transform={map.transform}>
          <Drawn layout={layout} title={title} states={states} selected={selected} dimmed={dimmed} domId={domId} onPick={pick} />
        </g>
      </svg>
      <p className="muted small">Drag to move the map. Scroll to zoom. Topics on the left come first, and each line runs from a topic to one it opens.</p>
    </div>
  );
}
