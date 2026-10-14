import { clip, layoutStream, percent, type SharePanel, type StreamLayout } from "@/lib/research-maps/occupations-history";

const fmt = (n: number): string => n.toLocaleString("en-US");
const TOP = 46;
const HEIGHT = 620;
const LEFT = { x: 350, y: TOP, w: 420, h: HEIGHT };
const RIGHT = { x: 880, y: TOP, w: 270, h: HEIGHT };
const GRID = [0, 0.25, 0.5, 0.75, 1];

function Bands({ panel, layout, name }: { panel: SharePanel; layout: StreamLayout; name: string }) {
  return (
    <g data-stream={name}>
      {layout.bands.map((b) => (
        <path key={b.code} data-band={b.code} d={b.d} fill={b.fill} stroke="#EFE8D4" strokeWidth={0.7} className="hover:opacity-80">
          <title>{`${b.title}. ${panel.years.map((y, i) => `${y}: ${percent(b.shares[i])}%, ${fmt(Math.round(panel.groups.find((g) => g.code === b.code)!.employment[i]))}`).join(". ")}.`}</title>
        </path>
      ))}
    </g>
  );
}

function Labels({ layout, side, edgeX }: { layout: StreamLayout; side: "left" | "right"; edgeX: number }) {
  const out = side === "left" ? -1 : 1;
  return (
    <g>
      {layout.bands.map((b) => (
        <g key={b.code}>
          <path d={`M${edgeX},${b.edgeY.toFixed(1)}L${edgeX + out * 10},${b.labelY.toFixed(1)}`} stroke="#6F6A5E" strokeWidth={0.6} fill="none" />
          <text x={edgeX + out * 13} y={b.labelY + 3.6} textAnchor={side === "left" ? "end" : "start"} fontSize={10.5} fill="#1F1C16">
            {clip(b.title, 46)}
            <tspan fill="#6F6A5E" fontSize={10}>{`  ${percent(b.first)} to ${percent(b.last)}%`}</tspan>
          </text>
        </g>
      ))}
    </g>
  );
}

function Years({ layout, ticks }: { layout: StreamLayout; ticks: number[] }) {
  return (
    <g>
      {ticks.map((year) => (
        <g key={year}>
          <line x1={layout.x(year)} x2={layout.x(year)} y1={TOP + HEIGHT} y2={TOP + HEIGHT + 5} stroke="#6F6A5E" strokeWidth={0.8} />
          <text x={layout.x(year)} y={TOP + HEIGHT + 18} textAnchor="middle" fontSize={10.5} fill="#3A3529">
            {year}
          </text>
        </g>
      ))}
    </g>
  );
}

export default function ShareStream({ census, oews }: { census: SharePanel; oews: SharePanel }) {
  const left = layoutStream(census, LEFT, "left");
  const right = layoutStream(oews, RIGHT, "right");
  const mid = (LEFT.x + LEFT.w + RIGHT.x) / 2;
  return (
    <svg data-share-stream viewBox={`0 0 1500 ${TOP + HEIGHT + 30}`} className="block h-auto w-full" role="img" aria-label="Employment share by major occupation group, 1900 to 1970 and 1999 to 2025">
      <text x={LEFT.x} y={18} fontSize={11} fontWeight={700} fill="#3A3529" letterSpacing="0.12em">
        CENSUS MAJOR GROUPS, 1900 TO 1970
      </text>
      <text x={LEFT.x} y={34} fontSize={10.5} fill="#6F6A5E">
        {`Share of the ${census.measure}, ${census.groups.length} groups`}
      </text>
      <text x={RIGHT.x} y={18} fontSize={11} fontWeight={700} fill="#3A3529" letterSpacing="0.12em">
        SOC MAJOR GROUPS, 1999 TO 2025
      </text>
      <text x={RIGHT.x} y={34} fontSize={10.5} fill="#6F6A5E">
        {`Share of OEWS ${oews.measure}, ${oews.groups.length} groups`}
      </text>
      <Bands panel={census} layout={left} name="census" />
      <Bands panel={oews} layout={right} name="oews" />
      {GRID.map((g) => {
        const y = TOP + HEIGHT - g * HEIGHT;
        return (
          <g key={g}>
            <line x1={LEFT.x} x2={LEFT.x + LEFT.w} y1={y} y2={y} stroke="#EFE8D4" strokeOpacity={0.45} strokeWidth={0.6} />
            <line x1={RIGHT.x} x2={RIGHT.x + RIGHT.w} y1={y} y2={y} stroke="#EFE8D4" strokeOpacity={0.45} strokeWidth={0.6} />
            <text x={mid} y={y + (g === 1 ? 10 : g === 0 ? -2 : 3.6)} textAnchor="middle" fontSize={10.5} fill="#3A3529">{`${g * 100}%`}</text>
          </g>
        );
      })}
      <text x={mid} y={TOP + HEIGHT * 0.36} textAnchor="middle" fontSize={10} fill="#6F6A5E">
        <tspan x={mid}>No series held</tspan>
        <tspan x={mid} dy={13}>1971 to 1998</tspan>
      </text>
      <Labels layout={left} side="left" edgeX={LEFT.x} />
      <Labels layout={right} side="right" edgeX={RIGHT.x + RIGHT.w} />
      <Years layout={left} ticks={census.years} />
      <Years layout={right} ticks={[1999, 2005, 2010, 2015, 2020, 2025].filter((y) => y >= oews.years[0] && y <= oews.years[oews.years.length - 1])} />
    </svg>
  );
}
