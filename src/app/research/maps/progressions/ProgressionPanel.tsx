import { edgeCounts, layoutPanel, LINE_HEIGHT, type LayoutOptions, type Panel } from "@/lib/research-maps/progressions";
import { LegendItem } from "../MapFigure";

const GROUP_FILL = ["#FBF7EA", "#D5E5DF", "#F0DDB0", "#D9E0C6"];

const GROUP_LABEL: Record<string, string> = {
  "undergraduate-lower": "Undergraduate, lower division",
  "undergraduate-upper": "Undergraduate, upper division",
  graduate: "Graduate",
  roadmap: "NeetCode roadmap topic",
  pattern: "Pattern",
};

export default function ProgressionPanel({ panel, options, legendGroups = true }: { panel: Panel; options?: LayoutOptions; legendGroups?: boolean }) {
  const l = layoutPanel(panel, options);
  const counts = edgeCounts(panel);
  const top = l.bands.length ? 26 : 0;
  const fill = (group: string): string => (legendGroups ? GROUP_FILL[l.groups.indexOf(group) % GROUP_FILL.length] : GROUP_FILL[0]);
  const marker = `arrow-${panel.id}`;
  return (
    <section data-panel={panel.id} className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h3 className="font-display text-[clamp(0.95rem,1.1vw,1.3rem)] uppercase text-[color:var(--basalt)]">{panel.title}</h3>
        <span className="text-[clamp(0.75rem,0.8vw,0.95rem)] text-[color:var(--basalt-3)]">{panel.note}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
        <LegendItem
          swatch={
            <svg width="30" height="8" aria-hidden>
              <line x1="0" y1="4" x2="30" y2="4" stroke="#1F1C16" strokeWidth="1.4" />
            </svg>
          }
          label={`Stated by the source, ${counts.stated}`}
        />
        <LegendItem
          swatch={
            <svg width="30" height="8" aria-hidden>
              <line x1="0" y1="4" x2="30" y2="4" stroke="#1F1C16" strokeWidth="1.4" strokeDasharray="4 3" />
            </svg>
          }
          label={`Inferred, ${counts.inferred}`}
        />
        {legendGroups &&
          l.groups.length > 1 &&
          l.groups.map((g) => (
            <LegendItem key={g} swatch={<span aria-hidden className="inline-block h-[12px] w-[18px] rounded-[2px] border border-[color:var(--stone-carve)]" style={{ background: fill(g) }} />} label={GROUP_LABEL[g] ?? g} />
          ))}
      </div>
      <svg
        data-graph={panel.id}
        viewBox={`0 ${-top} ${l.width} ${l.height + top}`}
        className="block h-auto w-full"
        style={{ maxWidth: Math.round(l.width * 1.3) }}
        role="img"
        aria-label={`${panel.title} prerequisite graph`}
      >
        <defs>
          <marker id={marker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0.5L7.5,4L0,7.5z" fill="#3A3529" />
          </marker>
        </defs>
        {l.bands.map((b, i) => (
          <g key={b.label} data-band={b.label}>
            {i % 2 === 1 && <rect x={b.x0} y={-top} width={b.x1 - b.x0} height={l.height + top} fill="rgba(31,28,22,0.045)" />}
            <text x={(b.x0 + b.x1) / 2} y={-9} textAnchor="middle" fontSize={11} fontWeight={700} letterSpacing="0.1em" fill="#3A3529">
              {b.label.toUpperCase()}
            </text>
          </g>
        ))}
        <g fill="none" stroke="#3A3529">
          {l.edges.map((e) => (
            <path key={`${e.src}>${e.dst}`} data-stated={e.stated ? "true" : "false"} d={e.path} strokeWidth={e.stated ? 1.15 : 1} strokeOpacity={e.stated ? 0.62 : 0.5} strokeDasharray={e.stated ? undefined : "4 3"} markerEnd={`url(#${marker})`} />
          ))}
        </g>
        {l.nodes.map((n) => (
          <g key={n.id} data-node={n.id}>
            <title>{n.label}</title>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={4} fill={fill(n.group)} stroke="rgba(31,28,22,0.45)" strokeWidth={0.8} />
            {n.lines.map((line, i) => (
              <text key={i} x={n.x + n.w / 2} y={n.y + 6 + LINE_HEIGHT * (i + 1) - 3} textAnchor="middle" fontSize={11} fill="#1F1C16">
                {line}
              </text>
            ))}
          </g>
        ))}
      </svg>
    </section>
  );
}
