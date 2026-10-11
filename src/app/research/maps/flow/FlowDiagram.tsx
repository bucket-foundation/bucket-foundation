import { layoutFlow } from "@/lib/research-maps/flow";

const fmt = (n: number): string => n.toLocaleString("en-US");

export default function FlowDiagram() {
  const f = layoutFlow();
  const pad = 14;
  const x0 = f.leftX + f.nodeWidth;
  const x1 = f.rightX;
  const mid = (x0 + x1) / 2;
  const ribbons = [...f.ribbons].sort((a, b) => Number(a.main) - Number(b.main));
  return (
    <svg data-flow viewBox={`0 ${-pad - 14} ${f.width} ${f.height + pad * 2 + 14}`} className="block h-auto w-full" role="img" aria-label="Flow from CIP series to SOC major groups">
      <text x={f.leftX + f.nodeWidth} y={-pad} textAnchor="end" fontSize={11} fontWeight={700} fill="#3A3529" letterSpacing="0.12em">
        CIP 2020 SERIES
      </text>
      <text x={f.rightX} y={-pad} fontSize={11} fontWeight={700} fill="#3A3529" letterSpacing="0.12em">
        SOC 2018 MAJOR GROUP
      </text>
      <g fill="none">
        {ribbons.map((r) => (
          <path
            key={`${r.cip}-${r.soc}`}
            data-ribbon={`${r.cip}-${r.soc}`}
            d={`M${x0},${r.y0.toFixed(1)}C${mid},${r.y0.toFixed(1)} ${mid},${r.y1.toFixed(1)} ${x1},${r.y1.toFixed(1)}`}
            stroke={r.main ? "#B8861E" : "#2E6B6B"}
            strokeOpacity={r.main ? 0.62 : 0.2}
            strokeWidth={r.h.toFixed(2)}
            className="hover:[stroke-opacity:0.9]"
          >
            <title>{`${r.cipTitle} to ${r.socTitle}: ${fmt(r.links)} links`}</title>
          </path>
        ))}
      </g>
      {f.left.map((n) => (
        <g key={n.code} data-cip={n.code}>
          <rect x={f.leftX} y={n.y} width={f.nodeWidth} height={n.h} fill="#1F1C16" rx={1} />
          <text x={f.leftX - 8} y={n.y + n.h / 2 + 4} textAnchor="end" fontSize={11.5} fill="#1F1C16">
            {n.title.length > 62 ? n.title.slice(0, 61) + "…" : n.title}
            <tspan fill="#6F6A5E" fontSize={10}>{`  ${fmt(n.links)}`}</tspan>
          </text>
        </g>
      ))}
      {f.right.map((n) => (
        <g key={n.code} data-soc={n.code}>
          <rect x={f.rightX} y={n.y} width={f.nodeWidth} height={n.h} fill="#1F1C16" rx={1} />
          <text x={f.rightX + f.nodeWidth + 8} y={n.y + n.h / 2 + 4} fontSize={11.5} fill="#1F1C16">
            {n.title.replace(/ Occupations$/, "")}
            <tspan fill="#6F6A5E" fontSize={10}>{`  ${fmt(n.links)}`}</tspan>
          </text>
        </g>
      ))}
    </svg>
  );
}
