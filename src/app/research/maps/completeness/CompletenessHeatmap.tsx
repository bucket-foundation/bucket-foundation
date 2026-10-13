import {
  LABEL_COLUMN,
  VERIFIED_BINS,
  cellSummary,
  failsReading,
  fmt,
  layoutCompleteness,
  verifiedBin,
  type CompletenessData,
  type PlacedCell,
} from "@/lib/research-maps/completeness";

const GOLD = "#B8861E";
const HEADER = 92;

function Cell({ placed, wide, summary }: { placed: PlacedCell; wide: boolean; summary: string }) {
  const { cell, rect } = placed;
  const bin = VERIFIED_BINS[verifiedBin(cell.verified)];
  const x = rect.x + 1;
  const y = rect.y + 1;
  const w = rect.w - 2;
  const h = rect.h - 2;
  const corner = wide ? 13 : 9;
  const cx = x + w / 2;
  return (
    <g data-cell={cell.code || cell.label} data-verified={cell.verified}>
      <title>{summary}</title>
      <rect x={x} y={y} width={w} height={h} rx={2} fill={bin.fill} stroke={cell.verified === 0 ? "rgba(31,28,22,0.28)" : "none"} strokeWidth={0.7} />
      {failsReading(cell) && <polygon data-fails-reading points={`${x + w - corner},${y} ${x + w},${y} ${x + w},${y + corner}`} fill={GOLD} />}
      {wide ? (
        <>
          <text x={x + 8} y={y + 17} fontSize={10.5} fill={bin.ink}>
            {cell.label}
          </text>
          <text x={x + 8} y={y + 40} fontSize={18} fontWeight={700} fill={bin.ink}>
            {fmt(cell.verified)}
          </text>
          {cell.read !== null && (
            <text x={x + 8} y={y + 56} fontSize={9.5} fill={bin.ink}>
              {`${fmt(cell.read)} after reading`}
            </text>
          )}
        </>
      ) : (
        <>
          <text x={cx} y={y + 11.5} fontSize={8.5} textAnchor="middle" fill={bin.ink}>
            {cell.code}
          </text>
          <text x={cx} y={y + 25.5} fontSize={10} fontWeight={700} textAnchor="middle" fill={bin.ink}>
            {fmt(cell.verified)}
          </text>
        </>
      )}
    </g>
  );
}

export default function CompletenessHeatmap({ data, width = 1600 }: { data: CompletenessData; width?: number }) {
  const layout = layoutCompleteness(data.dimensions, width, HEADER);
  const tenth = (width - LABEL_COLUMN - 420) / 10;
  return (
    <svg data-completeness viewBox={`0 0 ${width} ${layout.height + 4}`} className="block h-auto w-full" role="img" aria-label={`Completeness heatmap, overall score ${data.overall} of 10`}>
      <g data-overall={data.overall}>
        <text x={0} y={16} fontSize={11} fontWeight={700} fill="#1F4F4F" letterSpacing="0.12em">
          OVERALL COMPLETENESS
        </text>
        <text x={0} y={62} fontSize={44} fontWeight={700} fill="#1F1C16">
          {data.overall.toFixed(1)}
          <tspan fontSize={18} fontWeight={400} fill="#6F6A5E">{"  of 10"}</tspan>
        </text>
        {Array.from({ length: 10 }, (_, i) => {
          const share = Math.max(0, Math.min(1, data.overall - i));
          const x = LABEL_COLUMN + i * tenth;
          return (
            <g key={i}>
              <rect x={x + 1} y={34} width={tenth - 2} height={22} rx={2} fill="#E4DCC4" />
              {share > 0 && <rect x={x + 1} y={34} width={(tenth - 2) * share} height={22} rx={2} fill="#1F4F4F" />}
              <text x={x + tenth / 2} y={70} fontSize={9.5} textAnchor="middle" fill="#6F6A5E">
                {i + 1}
              </text>
            </g>
          );
        })}
        <text x={LABEL_COLUMN + 1} y={24} fontSize={10.5} fill="#3A3529">
          The critic review scored the corpus against a standard of everything a person can learn. Its verdict is a fail.
        </text>
        <text x={width} y={44} fontSize={10.5} textAnchor="end" fill="#3A3529">
          {`${fmt(data.corpusVerified)} verified of ${fmt(data.corpusRows)} corpus rows`}
        </text>
        <text x={width} y={60} fontSize={10.5} textAnchor="end" fill="#3A3529">
          {`${fmt(data.scoredCells)} scored cells in ${data.dimensions.length} dimensions`}
        </text>
      </g>
      {layout.rows.map(({ dimension, y, groups }) => (
        <g key={dimension.id} data-dimension={dimension.id} data-score={dimension.score}>
          <line x1={0} x2={width} y1={y - 12} y2={y - 12} stroke="rgba(31,28,22,0.16)" strokeWidth={0.8} />
          <text x={0} y={y + 13} fontSize={13} fontWeight={700} fill="#1F1C16">
            {dimension.title}
          </text>
          <text x={0} y={y + 40} fontSize={23} fontWeight={700} fill="#1F4F4F">
            {dimension.score.toFixed(1)}
            <tspan fontSize={11} fontWeight={400} fill="#6F6A5E">{"  of 10"}</tspan>
          </text>
          <text x={0} y={y + 55} fontSize={9.5} fill="#3A3529">
            {`${dimension.kept} of ${dimension.cells} cells`}
          </text>
          <text x={0} y={y + 67} fontSize={9.5} fill="#3A3529">
            {dimension.test}
          </text>
          {groups.map(({ group, labelY, wide, cells }) => (
            <g key={group.id} data-group={group.id}>
              {labelY !== null && (
                <text x={LABEL_COLUMN + 1} y={labelY} fontSize={10} fontWeight={700} fill="#3A3529">
                  {`${group.title}, ${group.cells.length} cells`}
                </text>
              )}
              {cells.map((placed) => (
                <Cell key={`${group.id}-${placed.cell.code || placed.cell.label}`} placed={placed} wide={wide} summary={cellSummary(dimension, placed.cell)} />
              ))}
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
