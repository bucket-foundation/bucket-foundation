// Globe — "the canon armillary."
//
// Antikythera-inspired stone orrery. A basalt sphere wrapped in
// brass-gilt meridian rings, with 8 engraved ports (one per canon
// branch). The rings rotate slowly; the sphere sits still. All SVG.

type Props = {
  size?: number;
  className?: string;
  withPorts?: boolean;
  /** "basalt" = dark sphere on bone; "bone" = light sphere on basalt */
  mode?: "basalt" | "bone";
};

const BRANCH_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export default function Globe({
  size = 520,
  className = "",
  withPorts = true,
  mode = "basalt",
}: Props) {
  const cx = 100;
  const cy = 100;
  const r = 72;

  const isDark = mode === "basalt";
  const sphereFill = isDark ? "var(--basalt-2)" : "var(--bone-2)";
  const meridian = "var(--gold)";
  const meridianDim = isDark ? "rgba(232,178,58,0.28)" : "rgba(184,134,30,0.35)";
  const terra = isDark ? "rgba(14,140,140,0.22)" : "rgba(14,140,140,0.18)";

  // Meridian ellipses — rings around the sphere at various tilts.
  const meridians = [0, 30, 60, 90, 120, 150].map((deg) => ({
    rx: Math.abs(Math.cos((deg * Math.PI) / 180)) * r,
    deg,
  }));

  // Parallel rings (latitudes)
  const parallels = [-45, -22.5, 0, 22.5, 45].map((lat) => {
    const rad = (lat * Math.PI) / 180;
    return {
      y: cy - Math.sin(rad) * r,
      rx: Math.cos(rad) * r,
      ry: Math.cos(rad) * r * 0.22,
      lat,
      prime: lat === 0,
    };
  });

  const ports = BRANCH_LABELS.map((label, i) => {
    const lon = (i / BRANCH_LABELS.length) * 360 - 180;
    const lat = i % 2 === 0 ? 16 : -20;
    const latR = (lat * Math.PI) / 180;
    const lonR = (lon * Math.PI) / 180;
    const x = cx + Math.cos(latR) * Math.sin(lonR) * r;
    const y = cy - Math.sin(latR) * r;
    const z = Math.cos(latR) * Math.cos(lonR);
    return { label, x, y, z, i };
  });

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="bucket.foundation canon armillary"
    >
      <defs>
        {/* Basalt sphere gradient — dim, carved, with terminator shadow */}
        <radialGradient id="g-sphere" cx="0.35" cy="0.32" r="0.72">
          <stop offset="0" stopColor={isDark ? "#2A2A2A" : "var(--bone)"} />
          <stop offset="0.55" stopColor={sphereFill} />
          <stop offset="1" stopColor={isDark ? "#050505" : "var(--bone-3)"} />
        </radialGradient>
        {/* Teal ocean tint */}
        <radialGradient id="g-teal" cx="0.32" cy="0.3" r="0.6">
          <stop offset="0" stopColor={terra} />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        {/* Gilt limb — thin atmospheric gold ring around the sphere */}
        <radialGradient id="g-limb" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.92" stopColor="var(--gold)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0.55" />
        </radialGradient>
        {/* Carved ring shadow */}
        <filter id="g-ring-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>

      {/* Outer gilt limb */}
      <circle cx={cx} cy={cy} r={r + 4} fill="url(#g-limb)" />

      {/* Sphere body */}
      <circle cx={cx} cy={cy} r={r} fill="url(#g-sphere)" />
      {/* Teal ocean wash */}
      <circle cx={cx} cy={cy} r={r} fill="url(#g-teal)" />

      {/* Rotating armillary ring group */}
      <g className="spin-slow" style={{ transformOrigin: "100px 100px" }}>
        {/* Gilt meridians (vertical great-circle rings) */}
        {meridians.map((m, i) => (
          <g key={`m-${i}`} filter="url(#g-ring-shadow)">
            <ellipse
              cx={cx}
              cy={cy}
              rx={Math.max(m.rx, 0.4)}
              ry={r}
              fill="none"
              stroke={meridian}
              strokeOpacity={i === 0 ? 0.65 : 0.28}
              strokeWidth={i === 0 ? 0.9 : 0.5}
            />
          </g>
        ))}

        {/* Carved parallels */}
        {parallels.map((p, i) => (
          <ellipse
            key={`p-${i}`}
            cx={cx}
            cy={p.y}
            rx={p.rx}
            ry={p.ry}
            fill="none"
            stroke={p.prime ? meridian : meridianDim}
            strokeOpacity={p.prime ? 0.55 : 0.28}
            strokeWidth={p.prime ? 0.8 : 0.4}
          />
        ))}

        {/* Outer equator band — the "bronze ring" of the armillary */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={meridian}
          strokeOpacity="0.45"
          strokeWidth="0.7"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r + 1.8}
          fill="none"
          stroke={meridian}
          strokeOpacity="0.2"
          strokeWidth="0.3"
        />
      </g>

      {/* Ports — fixed, not rotating, so they read as cardinal markers */}
      {withPorts &&
        ports.map((p) => {
          const visible = p.z > 0;
          const opacity = visible ? 1 : 0.22;
          return (
            <g key={p.label} opacity={opacity}>
              <circle cx={p.x} cy={p.y} r={3.2} fill="var(--basalt)" />
              <circle cx={p.x} cy={p.y} r={2.4} fill="var(--gold)" />
              <circle cx={p.x} cy={p.y} r={0.9} fill="var(--basalt)" />
            </g>
          );
        })}

      {/* Central engraved pivot (the "axis mundi") */}
      <circle cx={cx} cy={cy} r="1.4" fill="var(--gold)" />
      <circle cx={cx} cy={cy} r="3.0" fill="none" stroke="var(--gold)" strokeOpacity="0.4" strokeWidth="0.3" />
    </svg>
  );
}
