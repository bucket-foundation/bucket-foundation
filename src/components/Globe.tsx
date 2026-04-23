// Globe — "bucket.foundation's atlas."
//
// A thin-line wireframe globe, slowly rotating, with 8 gilt "ports"
// — one for each canon branch. The globe is symbolic, not geographic:
// canon has no country. The ports are placed on an even longitude ring
// so the rotation keeps them visible in sequence, like lighthouses.
//
// Pure SVG, no dependencies. The outer <g> rotates with CSS keyframes
// (`.spin-slow` defined in globals.css).

type Props = {
  size?: number;
  className?: string;
  /** Show the 8 branch ports. Turn off for pure-decorative use. */
  withPorts?: boolean;
};

const BRANCH_LABELS = [
  "math",
  "physics",
  "chem",
  "info",
  "biophys",
  "cosmo",
  "mind",
  "earth",
];

export default function Globe({ size = 360, className = "", withPorts = true }: Props) {
  const cx = 100;
  const cy = 100;
  const r = 84;

  // Longitude ellipses (vertical slices through the sphere).
  const longitudes = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((deg) => {
    const rx = Math.abs(Math.cos((deg * Math.PI) / 180)) * r;
    return { rx: Math.max(rx, 0.01), rotate: 0, deg };
  });

  // Latitude rings (horizontal slices). We render as ellipses with
  // decreasing rx to simulate 3D.
  const latitudes = [-60, -30, 0, 30, 60].map((lat) => {
    const rad = (lat * Math.PI) / 180;
    const y = cy - Math.sin(rad) * r;
    const rx = Math.cos(rad) * r;
    const ry = Math.cos(rad) * r * 0.18; // flat-ish ellipse for perspective
    return { y, rx, ry, lat };
  });

  // Port positions — evenly around the equator + tropics, on the visible face.
  const ports = BRANCH_LABELS.map((label, i) => {
    const n = BRANCH_LABELS.length;
    // Spread across longitude and alternate between tropics for visual life.
    const lon = (i / n) * 360 - 180; // -180..+180
    const lat = i % 2 === 0 ? 18 : -22;
    const latR = (lat * Math.PI) / 180;
    const lonR = (lon * Math.PI) / 180;
    // Orthographic projection (camera on +z).
    const x = cx + Math.cos(latR) * Math.sin(lonR) * r;
    const y = cy - Math.sin(latR) * r;
    const z = Math.cos(latR) * Math.cos(lonR); // >0 = front-facing
    return { label, x, y, z, i };
  });

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="bucket.foundation canon globe"
    >
      <defs>
        <radialGradient id="g-sphere" cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stopColor="var(--teal)" stopOpacity="0.12" />
          <stop offset="0.6" stopColor="var(--midnight)" stopOpacity="0.0" />
          <stop offset="1" stopColor="var(--midnight)" stopOpacity="0.0" />
        </radialGradient>
        <radialGradient id="g-limb" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.9" stopColor="var(--gold)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0.35" />
        </radialGradient>
        <filter id="g-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* Atmospheric limb */}
      <circle cx={cx} cy={cy} r={r + 6} fill="url(#g-limb)" />
      {/* Sphere fill */}
      <circle cx={cx} cy={cy} r={r} fill="url(#g-sphere)" />

      {/* Rotating wireframe group */}
      <g className="spin-slow" style={{ transformOrigin: "100px 100px" }}>
        {/* Latitude rings */}
        {latitudes.map((l, i) => (
          <ellipse
            key={`lat-${i}`}
            cx={cx}
            cy={l.y}
            rx={l.rx}
            ry={l.ry}
            fill="none"
            stroke="var(--morning-fog)"
            strokeOpacity={l.lat === 0 ? 0.35 : 0.18}
            strokeWidth={l.lat === 0 ? 0.8 : 0.5}
          />
        ))}

        {/* Longitudes — sliced vertical great-circle ellipses */}
        {longitudes.map((lg, i) => (
          <ellipse
            key={`lon-${i}`}
            cx={cx}
            cy={cy}
            rx={lg.rx}
            ry={r}
            fill="none"
            stroke="var(--morning-fog)"
            strokeOpacity="0.15"
            strokeWidth="0.5"
          />
        ))}

        {/* Outer equator circle on top of everything (crisp) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--morning-fog)"
          strokeOpacity="0.35"
          strokeWidth="0.8"
        />
      </g>

      {/* Ports (do NOT rotate — they're labels into the sphere) */}
      {withPorts &&
        ports.map((p) => {
          const visible = p.z > 0;
          const opacity = visible ? 1 : 0.18;
          return (
            <g key={p.label} opacity={opacity}>
              <circle
                cx={p.x}
                cy={p.y}
                r={2.6}
                fill="var(--gold)"
                filter="url(#g-glow)"
              />
              <circle cx={p.x} cy={p.y} r={1.4} fill="var(--gold-dawn)" />
            </g>
          );
        })}

        {/* Halo dot at center (the citation) */}
      <circle cx={cx} cy={cy} r="1.6" fill="var(--gold)" opacity="0.8" />
    </svg>
  );
}
