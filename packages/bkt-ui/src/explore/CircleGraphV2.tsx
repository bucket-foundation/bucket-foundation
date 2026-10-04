import type { DesktopLayout } from "./modesV2";

interface Props {
  layout: DesktopLayout;
  selected: string | null;
  onSelect(id: string | null): void;
  onPhase(scroll: number): void;
}

export default function CircleGraphV2({ layout, selected, onSelect, onPhase }: Props) {
  const graph = layout.circle;
  if (!graph) return <div data-testid="explore-scene" className="atom-stage"><p role="status">{layout.circleError ?? "Loading circle."}</p></div>;
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const radius = graph.nodes.length > 60 ? 4 : graph.bonds.length ? 12 : 9;
  const chemical = graph.nodes.some((node) => node.symbol);
  const related = layout.nodes.filter((node) => !byId.has(node.id) && !node.id.startsWith("molecule:") && !node.id.startsWith("reaction:"));
  return <div>
    {graph.phase && <div className="atom-controls" aria-label="Reaction side">
      {(["reactants", "products"] as const).map((phase) => <button key={phase} aria-pressed={graph.phase === phase} onClick={() => { onSelect(null); onPhase(phase === "products" ? 1200 : 0); }}>{phase === "products" ? "Products" : "Reactants"}</button>)}
    </div>}
    <div data-testid="explore-scene" data-circle="true" className="atom-stage circle-stage">
      <svg viewBox="-260 -250 520 500" aria-label={`${graph.title} circle graph`}>
        <circle className="atom-guide" r="180" />
        {graph.bonds.flatMap((bond, index) => {
          const a = byId.get(bond.from)!;
          const b = byId.get(bond.to)!;
          const dx = b.position[0] - a.position[0];
          const dy = b.position[1] - a.position[1];
          const length = Math.hypot(dx, dy) || 1;
          return Array.from({ length: bond.aromatic ? 1 : bond.order }, (_, line) => {
            const offset = (line - (bond.order - 1) / 2) * 4;
            return <line key={`${index}:${line}`} className="circle-bond" x1={a.position[0] - dy / length * offset} y1={a.position[1] + dx / length * offset} x2={b.position[0] - dy / length * offset} y2={b.position[1] + dx / length * offset} strokeDasharray={bond.aromatic ? "5 4" : undefined} />;
          });
        })}
        {graph.nodes.map((node) => <g key={node.id} role="button" tabIndex={0} aria-label={node.detail} aria-pressed={selected === node.id} data-circle-node={node.id} className="atom-point circle-point" onClick={() => onSelect(node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(node.id); } }}>
          <circle cx={node.position[0]} cy={node.position[1]} r={radius} fill={node.color} />
          {node.symbol ? <text className="circle-symbol" x={node.position[0]} y={node.position[1] + 4} textAnchor="middle">{node.label}</text> : <text x={node.position[0] * 1.1} y={node.position[1] * 1.1 + 4} textAnchor={node.position[0] > 25 ? "start" : node.position[0] < -25 ? "end" : "middle"}>{node.label.split(" ").map((word, index) => <tspan key={index} x={node.position[0] * 1.1} dy={index ? 13 : 0}>{word}</tspan>)}</text>}
          <title>{node.detail}</title>
        </g>)}
      </svg>
    </div>
    <p className="atom-caption">{graph.title}{graph.phase ? ` · ${graph.phase}` : ""} · {graph.nodes.length} {chemical ? "atoms" : "particle types"}. {chemical ? "Lines show bonds. Dashed lines show aromatic bonds. Positions follow a circle layout." : "Select a particle to inspect its properties."}</p>
    {!!related.length && <div className="atom-related" aria-label="Related sources">{related.map((node) => <button key={node.id} aria-pressed={selected === node.id} onClick={() => onSelect(node.id)}>{node.label}</button>)}</div>}
  </div>;
}
