import { useState, type KeyboardEvent } from "react";
import { elementByZ, shellRadius } from "@/lib/explore/modes/atom";
import type { SceneLayout } from "@/lib/explore/modes/types";
import { circlePoint, elementCircle, isotopeName, isotopesOf, particleCircle, particleCounts, PARTICLE_COLORS, type AtomView } from "./atom-circle";
import isotopes from "./isotopes.json";

interface Props {
  element: number;
  onElement(z: number): void;
  layout: SceneLayout;
  selected: string | null;
  onSelect(id: string): void;
}

const VIEWS: { id: AtomView; label: string }[] = [{ id: "particles", label: "Particles" }, { id: "elements", label: "Elements" }, { id: "shells", label: "Shells" }];

function activate(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export default function AtomPlotV2({ element, onElement, layout, selected, onSelect }: Props) {
  const [view, setView] = useState<AtomView>("particles");
  const [isotope, setIsotope] = useState({ z: element, mass: isotopesOf(element).defaultMass });
  const [picked, setPicked] = useState<string | null>(null);
  const el = elementByZ(element);
  const catalog = isotopesOf(element);
  const mass = isotope.z === element ? isotope.mass : catalog.defaultMass;
  const counts = particleCounts(element, mass);
  const particles = particleCircle(element, mass);
  const elements = elementCircle();
  const related = layout.nodes.filter((node) => !node.id.startsWith("electron:") && !node.id.startsWith("element:"));
  const shellScale = 175 / shellRadius(el.shells.length - 1);
  const chooseView = (next: AtomView) => { setView(next); setPicked(null); };
  return (
    <div className="atom-plot">
      <div className="atom-controls" role="group" aria-label="Atom circle view">
        {VIEWS.map((entry) => <button key={entry.id} className="border" data-testid={`atom-view-${entry.id}`} aria-pressed={view === entry.id} onClick={() => chooseView(entry.id)}>{entry.label}</button>)}
        {view === "particles" && <label>Isotope <select aria-label="Isotope" value={mass} onChange={(event) => { setIsotope({ z: element, mass: Number(event.target.value) }); setPicked(null); }}>{catalog.masses.map((value) => <option key={value} value={value}>{el.symbol}-{value}</option>)}</select></label>}
      </div>
      <div data-testid="explore-scene" data-atom-view={view} className="atom-stage" style={{ background: "var(--paper)" }}>
        <svg viewBox="-240 -240 480 480" role="group" aria-label={`${el.name}: ${view} circle plot`}>
          {view !== "shells" && <circle r={180} className="atom-guide" />}
          {view === "particles" && particles.map((particle, index) => <g key={particle.id} role="button" tabIndex={0} aria-label={`${particle.kind} ${index + 1}`} onClick={() => setPicked(particle.kind)} onKeyDown={(event) => activate(event, () => setPicked(particle.kind))}>
            <circle data-particle={particle.kind} cx={particle.position[0]} cy={particle.position[1]} r={Math.min(8, 420 / particles.length)} fill={particle.color} className="atom-point" />
            <title>{particle.kind}</title>
          </g>)}
          {view === "elements" && elements.map((item, index) => {
            const text = circlePoint(index, elements.length, index % 2 ? 199 : 219);
            return <g key={item.z} data-testid={`circle-element-${item.z}`} role="button" tabIndex={0} aria-label={`${item.z} ${item.name}`} aria-pressed={item.z === element} onClick={() => onElement(item.z)} onKeyDown={(event) => activate(event, () => onElement(item.z))}>
              <circle cx={item.position[0]} cy={item.position[1]} r={item.z === element ? 5 : 3.3} fill={item.z === element ? "var(--accent)" : "var(--ink-2)"} className="atom-point" />
              <text x={text[0]} y={text[1]} className="atom-symbol" fill={item.z === element ? "var(--accent)" : "var(--ink-2)"}>{item.symbol}</text>
              <title>{item.z} {item.name}</title>
            </g>;
          })}
          {view === "shells" && <>
            {el.shells.map((_, index) => <circle key={index} r={shellRadius(index) * shellScale} className="atom-guide" />)}
            {layout.nodes.filter((node) => node.id.startsWith("electron:")).map((node) => <circle key={node.id} data-particle="electron" cx={node.position[0] * shellScale} cy={-node.position[2] * shellScale} r={4} fill={PARTICLE_COLORS.electron} className="atom-point"><title>electron</title></circle>)}
            <circle r={38} fill="var(--panel)" stroke="var(--line)" />
          </>}
          <text className="atom-center" textAnchor="middle" y={view === "shells" ? 5 : -10}>{el.symbol}</text>
          {view !== "shells" && <text className="atom-caption" textAnchor="middle" y={16}>{view === "particles" ? isotopeName(element, mass) : `${element} · ${el.name}`}</text>}
          {view === "particles" && <text className="atom-caption" textAnchor="middle" y={38}>{counts.proton} p · {counts.neutron} n · {counts.electron} e</text>}
        </svg>
      </div>
      <p className="atom-description" role="status">{picked ? `${picked} selected. ` : ""}{view === "particles" ? `Neutral ${isotopeName(element, mass)}: ${counts.proton} protons, ${counts.neutron} neutrons, ${counts.electron} electrons. Positions show a circular arrangement.` : view === "elements" ? "118 elements in atomic-number order. Choose a point or use the Element menu." : `${el.name}: ${el.shells.join(", ")} electrons by shell. Schematic shell diagram.`}</p>
      {view === "particles" && <div className="atom-legend">{Object.entries(PARTICLE_COLORS).map(([kind, color]) => <span key={kind}><i style={{ background: color }} />{kind}</span>)}<a href={isotopes.source}>Isotope data: NIST</a></div>}
      {related.length > 0 && <div className="atom-related" aria-label="Sources naming this element">{related.map((node) => <button key={node.id} className="border" aria-pressed={selected === node.id} onClick={() => onSelect(node.id)}>{node.label}</button>)}</div>}
    </div>
  );
}
