import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { layoutCanonGraph, matchNodes, neighbours, type CanonGraph } from "@/lib/canon-graph-core";
import { READABLE, useMapView } from "./map-view";
import type { Box } from "./path-graph";
import "../path.css";
import "../canon-graph.css";

export interface CanonGraphApi {
  canonGraph?: () => Promise<CanonGraph | null>;
}

export const GRAPH_ABOUT = "Each dot is an author in the canon. A line joins two authors who wrote together, and a thicker line means more shared papers.";
export const NO_GRAPH = "This copy of Bucket has no knowledge graph.";
export const PICK_AN_AUTHOR = "Pick an author to see who they wrote with and to open their excerpts.";
export const noExcerpt = (name: string) => `The canon on this computer holds no excerpt by ${name}.`;

const radius = (degree: number) => 5 + 2 * Math.sqrt(degree);
const papers = (n: number) => `${n} shared ${n === 1 ? "paper" : "papers"}`;

interface DrawnProps {
  graph: CanonGraph;
  places: Map<string, { x: number; y: number }>;
  selected: string | null;
  near: ReadonlySet<string>;
  hits: ReadonlySet<string>;
  labelled: ReadonlySet<string>;
  domId: (id: string) => string;
  onPick: (id: string) => void;
}

const Drawn = memo(function Drawn({ graph, places, selected, near, hits, labelled, domId, onPick }: DrawnProps) {
  const lit = (id: string) => id === selected || near.has(id) || hits.has(id);
  const quiet = selected !== null || hits.size > 0;
  return (
    <>
      <g aria-hidden>
        {graph.edges.map((e) => {
          const a = places.get(e.source)!;
          const b = places.get(e.target)!;
          const on = e.source === selected || e.target === selected;
          return <line key={`${e.source}>${e.target}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={Math.min(1 + Math.log2(e.weight), 6)} className={`link${on ? " on" : quiet ? " faint" : ""}`} />;
        })}
      </g>
      {graph.nodes.map((n) => {
        const p = places.get(n.id)!;
        const cls = n.id === selected ? " on" : hits.has(n.id) ? " hit" : near.has(n.id) ? " near" : quiet ? " dim" : "";
        return (
          <g key={n.id} id={domId(n.id)} role="button" aria-pressed={n.id === selected} aria-label={`${n.name}. Wrote with ${n.edges} ${n.edges === 1 ? "canon author" : "canon authors"}.`} className={`author${cls}`} transform={`translate(${p.x} ${p.y})`} onClick={() => onPick(n.id)}>
            <circle r={radius(n.edges)} />
            {(labelled.has(n.id) || lit(n.id)) && (
              <text y={-radius(n.edges) - 4} textAnchor="middle">
                {n.name}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
});

export function CanonGraphPanel({ api, query, onOpen }: { api: CanonGraphApi; query: string; onOpen: (claimId: number) => void }) {
  const [graph, setGraph] = useState<CanonGraph | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!api.canonGraph) return setGraph(null);
    api.canonGraph().then(setGraph, (e: Error) => setError(e.message));
  }, [api]);

  const empty: CanonGraph = useMemo(() => ({ nodes: [], edges: [] }), []);
  const g = graph ?? empty;
  const places = useMemo(() => layoutCanonGraph(g), [g]);
  const box: Box = useMemo(() => {
    const ps = Array.from(places.values());
    if (!ps.length) return { x: 0, y: 0, w: 1, h: 1 };
    const x = Math.min(...ps.map((p) => p.x));
    const y = Math.min(...ps.map((p) => p.y));
    return { x, y, w: Math.max(...ps.map((p) => p.x)) - x, h: Math.max(...ps.map((p) => p.y)) - y };
  }, [places]);
  const map = useMapView(svg, box, 0.04);
  const { reveal, wasDrag } = map;
  const byId = useMemo(() => new Map(g.nodes.map((n) => [n.id, n])), [g]);
  const order = useMemo(() => new Map(g.nodes.map((n, i) => [n.id, i])), [g]);
  const domId = useCallback((id: string) => `author-${order.get(id)}`, [order]);
  const hits = useMemo(() => new Set(matchNodes(g, query)), [g, query]);
  const near = useMemo(() => new Set(selected ? neighbours(g, selected).map((n) => n.id) : []), [g, selected]);
  const labelled = useMemo(() => new Set(g.nodes.filter((n) => n.edges >= 4).map((n) => n.id)), [g]);

  useEffect(() => {
    const p = selected ? places.get(selected) : undefined;
    if (p) reveal({ x: p.x - 60, y: p.y - 30, w: 120, h: 60 });
  }, [selected, places, reveal]);

  useEffect(() => {
    const first = Array.from(hits)[0];
    const p = first ? places.get(first) : undefined;
    if (p) reveal({ x: p.x - 60, y: p.y - 30, w: 120, h: 60 });
  }, [hits, places, reveal]);

  const pick = useCallback(
    (id: string) => {
      if (wasDrag()) return;
      setSelected(id);
      const first = byId.get(id)?.excerpts[0];
      if (first !== undefined) onOpen(first);
    },
    [wasDrag, byId, onOpen],
  );

  const keys = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      if (!selected) {
        const top = g.nodes.slice().sort((a, b) => b.centrality - a.centrality || (a.id < b.id ? -1 : 1))[0];
        if (top) setSelected(top.id);
        return;
      }
      const ring = neighbours(g, selected);
      if (!ring.length) return;
      const pick = e.key === "ArrowRight" || e.key === "ArrowDown" ? ring[0] : ring[ring.length - 1];
      setSelected(pick.id);
    } else if (e.key === "+" || e.key === "=") map.zoom(1.25);
    else if (e.key === "-") map.zoom(0.8);
    else if (e.key === "0") map.show(box);
  };

  if (error) return <p className="error">{error}</p>;
  if (graph === undefined) return <p className="muted">Opening the knowledge graph…</p>;
  if (graph === null || g.nodes.length === 0) return <p className="muted panel">{NO_GRAPH}</p>;

  const here = selected ? byId.get(selected) : undefined;
  return (
    <section className="panel canon-graph" aria-label="Knowledge graph">
      <h2>Knowledge graph</h2>
      <p className="muted small">{`${GRAPH_ABOUT} ${g.nodes.length} authors, ${g.edges.length} pairs.`}</p>
      {query.trim() && <p className="muted small">{hits.size ? `${hits.size} ${hits.size === 1 ? "author matches" : "authors match"} “${query.trim()}”.` : `No author matches “${query.trim()}”.`}</p>}
      <div className="graph-grid">
        <div className="topic-map">
          <div className="map-tools">
            <button className="tool" onClick={() => map.zoom(1.25)}>
              Zoom in
            </button>
            <button className="tool" onClick={() => map.zoom(0.8)}>
              Zoom out
            </button>
            <button className="tool" onClick={() => map.show(box)}>
              Show every author
            </button>
          </div>
          <svg
            ref={svg}
            viewBox={`0 0 ${map.size.w} ${map.size.h}`}
            tabIndex={0}
            role="group"
            aria-label="Knowledge graph. Arrow keys move to the authors linked to the one picked. Plus and minus zoom."
            aria-activedescendant={selected ? domId(selected) : undefined}
            onKeyDown={keys}
            {...map.handlers}
          >
            <g transform={map.transform}>
              <Drawn graph={g} places={places} selected={selected} near={near} hits={hits} labelled={labelled} domId={domId} onPick={pick} />
            </g>
          </svg>
          <p className="muted small">Drag to move the graph. Scroll to zoom.</p>
        </div>
        <aside className="graph-side" aria-live="polite">
          {!here ? (
            <p className="muted">{PICK_AN_AUTHOR}</p>
          ) : (
            <>
              <h3>{here.name}</h3>
              {here.excerpts.length === 0 ? (
                <p className="muted small">{noExcerpt(here.name)}</p>
              ) : (
                <ul className="linked">
                  {here.excerpts.map((x, i) => (
                    <li key={x}>
                      <button className="link" onClick={() => onOpen(x)}>
                        {`Open excerpt ${i + 1} of ${here.excerpts.length}`}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <h4>Wrote with</h4>
              <ul className="linked">
                {neighbours(g, here.id).map((n) => (
                  <li key={n.id}>
                    <button className="link" onClick={() => setSelected(n.id)}>
                      {byId.get(n.id)?.name}
                    </button>
                    <span className="muted small">{papers(n.weight)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
      <details className="links-list">
        <summary>Read the same links as a list</summary>
        <ul>
          {g.nodes.map((n) => (
            <li key={n.id}>
              <button className="link" onClick={() => setSelected(n.id)}>
                {n.name}
              </button>
              {`. Wrote with ${neighbours(g, n.id)
                .map((m) => `${byId.get(m.id)?.name} (${papers(m.weight)})`)
                .join(", ")}.`}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
