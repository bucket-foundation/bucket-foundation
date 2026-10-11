import { GROUP_HEADER, layoutCoverage, unitSummary, type CoverageScheme, type CoverageStatus } from "@/lib/research-maps/coverage";

export const STATUS_FILL: Record<CoverageStatus, string> = { empty: "#E4DCC4", thin: "#7FAFA6", covered: "#1F4F4F" };
const STATUS_INK: Record<CoverageStatus, string> = { empty: "#3A3529", thin: "#1F1C16", covered: "#EFE8D4" };

const fit = (text: string, width: number, charWidth: number): string => {
  const max = Math.floor(width / charWidth);
  if (max < 3) return "";
  return text.length <= max ? text : text.slice(0, Math.max(1, max - 1)).trimEnd() + "…";
};

export default function CoverageTreemap({ scheme, width = 1120, height = 860 }: { scheme: CoverageScheme; width?: number; height?: number }) {
  const groups = layoutCoverage(scheme, width, height);
  return (
    <svg data-treemap={scheme.id} viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`${scheme.title} coverage treemap`}>
      {groups.map(({ group, rect, cells }) => {
        const header = rect.h > GROUP_HEADER * 2.2;
        return (
          <g key={group.code} data-group={group.code}>
            <title>{`${group.code} ${group.title}. ${group.size} ${scheme.sizeLabel}.`}</title>
            {header && (
              <text x={rect.x + 3} y={rect.y + 11} fontSize={10} fontWeight={700} fill="#1F1C16">
                {fit(`${group.code} ${group.title}`, rect.w - 6, 5.4)}
              </text>
            )}
            {cells.map(({ unit, status, rect: r }) => {
              const w = Math.max(r.w - 1.5, 0.5);
              const h = Math.max(r.h - 1.5, 0.5);
              const label = h > 13 ? fit(w > 120 ? `${unit.code} ${unit.title}` : unit.code, w - 6, 5) : "";
              return (
                <g key={unit.code} data-unit={unit.code} data-status={status} className="[&:hover>rect]:stroke-[#B8861E]">
                  <title>{unitSummary(scheme, unit)}</title>
                  <rect x={r.x + 0.75} y={r.y + 0.75} width={w} height={h} rx={1.5} fill={STATUS_FILL[status]} stroke={status === "empty" ? "rgba(31,28,22,0.22)" : "transparent"} strokeWidth={status === "empty" ? 0.6 : 1.5} />
                  {label && (
                    <text x={r.x + 4} y={r.y + 11.5} fontSize={9} fill={STATUS_INK[status]} pointerEvents="none">
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
