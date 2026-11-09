type Props = {
  size?: number;
  className?: string;
  variant?: "carved" | "inlay";
  title?: string;
};

export default function InverseOmega({
  size = 240,
  className = "",
  variant = "carved",
  title = "bucket foundation, inverse omega lyre",
}: Props) {
  const uid = `omega-v2-${variant}`;
  const gold = `url(#${uid}-gold)`;
  const stops = variant === "carved" ? ["#E8B44A", "#C88A2A", "#8A5A12"] : ["#F6D57C", "#E2AA3F", "#B07620"];
  const shadow = variant === "carved" ? "drop-shadow(0 1px 0.6px rgba(31,28,22,0.45))" : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox="12 12 216 224"
      role="img"
      aria-label={title}
      className={className}
      style={shadow ? { filter: shadow } : undefined}
      shapeRendering="geometricPrecision"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset="0.55" stopColor={stops[1]} />
          <stop offset="1" stopColor={stops[2]} />
        </linearGradient>
        <linearGradient id={`${uid}-string`} gradientUnits="userSpaceOnUse" x1="0" y1="48" x2="0" y2="176">
          <stop offset="0" stopColor="#FBE6A6" />
          <stop offset="1" stopColor="#D9A43A" />
        </linearGradient>
      </defs>
      <rect x="22" y="22" width="20" height="28" rx="4" fill={gold} />
      <rect x="198" y="22" width="20" height="28" rx="4" fill={gold} />
      <rect x="30" y="28" width="180" height="16" rx="3" fill={gold} />
      <rect x="34" y="29" width="172" height="3" rx="1.5" fill="#FDF0C4" opacity="0.6" />
      <path
        d="M66 36C61 72 56 106 62 136C70 172 96 190 120 190C144 190 170 172 178 136C184 106 179 72 174 36"
        fill="none"
        stroke={gold}
        strokeWidth="24"
      />
      <g stroke={`url(#${uid}-string)`} strokeWidth="7" strokeLinecap="round">
        <line x1="98" y1="48" x2="98" y2="170" />
        <line x1="120" y1="48" x2="120" y2="176" />
        <line x1="142" y1="48" x2="142" y2="170" />
      </g>
      <circle cx="120" cy="218" r="11" fill={gold} />
      <circle cx="116.5" cy="214.5" r="3" fill="#FDF0C4" opacity="0.7" />
    </svg>
  );
}
