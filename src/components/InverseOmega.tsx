// Inverse Omega — bucket.foundation primary logomark.
//
// Stonepunk treatment per the KALA locked brand system (V03 carved-stone
// terminals, V05 elemental palette, V08 Bone+Basalt neutrals):
//   - heavy inscriptional stroke with flat chiselled terminals
//   - subtle asymmetric hand-carved edges (no perfect curves)
//   - inset shadow below each stroke = the chisel cut depth
//   - inner bone highlight on the upper edge = stone lit from above
//   - hot-gold inlay dot inside the cup = the citation token (mythic plaque)
//   - Roman serif feet at the top flare
//
// Rendered entirely in SVG (no raster dependency). Scales 16px → 800px.

type Props = {
  size?: number;
  className?: string;
  /** "carved" = basalt-on-bone stonepunk; "inlay" = gold-on-basalt plaque */
  variant?: "carved" | "inlay";
  title?: string;
};

export default function InverseOmega({
  size = 240,
  className = "",
  variant = "carved",
  title = "bucket foundation — inverse omega",
}: Props) {
  const isInlay = variant === "inlay";
  const stroke = isInlay ? "var(--gold)" : "var(--basalt)";
  const cut = isInlay ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)";
  const rim = isInlay ? "rgba(232,178,58,0.25)" : "rgba(247,244,236,0.55)";

  const uid = `ΩΩ-${variant}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label={title}
      className={className}
      shapeRendering="geometricPrecision"
    >
      <title>{title}</title>

      <defs>
        {/* Carved depth — dark inner shadow offset down-right */}
        <filter id={`${uid}-carve`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="b" />
          <feOffset in="b" dx="0" dy="2" result="o" />
          <feComposite in="o" in2="SourceAlpha" operator="out" result="rim" />
          <feMerge>
            <feMergeNode in="rim" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Stone grain texture on strokes */}
        <filter id={`${uid}-grain`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode />
          </feMerge>
        </filter>

        {/* Gradient along strokes — slight tonal life */}
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="1" />
          <stop offset="1" stopColor={stroke} stopOpacity="0.82" />
        </linearGradient>

        {/* Gold inlay gradient */}
        <radialGradient id={`${uid}-dot`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="1" />
          <stop offset="0.6" stopColor="var(--gold-deep)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--basalt)" stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* === Inscriptional crossbar (foundation line) ================= */}
      {/* Top serif line that the two legs hang from. Deeper at ends. */}
      <g filter={`url(#${uid}-carve)`}>
        <path
          d="M 26 48 L 214 48 L 214 54 L 26 54 Z"
          fill={`url(#${uid}-g)`}
        />
        {/* Left serif anchor block */}
        <path
          d="M 20 44 L 36 44 L 36 60 L 20 60 Z"
          fill={`url(#${uid}-g)`}
        />
        {/* Right serif anchor block */}
        <path
          d="M 204 44 L 220 44 L 220 60 L 204 60 Z"
          fill={`url(#${uid}-g)`}
        />

        {/* === Left leg — splays outward, flared top, carved stone ==== */}
        {/* Top flare tick (serifed foot of the omega leg) */}
        <path
          d="M 44 54
             L 76 54
             L 72 70
             C 70 82  66 100  64 124
             C 63 138  64 150  68 162
             L 50 162
             C 46 150  44 136  45 120
             C 46 96   48 74  50 60
             L 44 60
             Z"
          fill={`url(#${uid}-g)`}
        />

        {/* === Right leg — mirror of left ============================= */}
        <path
          d="M 196 54
             L 164 54
             L 168 70
             C 170 82  174 100  176 124
             C 177 138  176 150  172 162
             L 190 162
             C 194 150  196 136  195 120
             C 194 96   192 74  190 60
             L 196 60
             Z"
          fill={`url(#${uid}-g)`}
        />

        {/* === The cup — the bucket — arched catch basin =============== */}
        {/* Outer edge */}
        <path
          d="M 50 162
             C 54 180  72 196  96 202
             C 108 204  132 204  144 202
             C 168 196  186 180  190 162
             L 172 162
             C 168 174  156 184  138 188
             C 124 190  116 190  102 188
             C 84 184  72 174  68 162
             Z"
          fill={`url(#${uid}-g)`}
        />
      </g>

      {/* === Hot-gold citation inlay — the token in the cup =========== */}
      {/* Sits below the cup, the "drop" that falls from the arch. */}
      <g>
        <circle cx="120" cy="212" r="7.5" fill="var(--basalt)" opacity="0.85" />
        <circle cx="120" cy="210" r="5.2" fill={`url(#${uid}-dot)`} />
        <circle cx="118.5" cy="208.5" r="1.2" fill="var(--bone)" opacity="0.65" />
      </g>

      {/* === Rim highlight on the upper edge of each stroke =========== */}
      {/* Faint bone (or gold-bone for inlay) along the top carves,     */}
      {/* sells the depth — stone is lit from above.                   */}
      <g opacity="1" stroke={rim} strokeWidth="0.7" fill="none" strokeLinecap="round">
        <line x1="26" y1="48" x2="214" y2="48" />
        <path d="M 44 54 L 76 54" />
        <path d="M 164 54 L 196 54" />
      </g>

      {/* === Chisel cut — tiny dark crevice at each concave corner ==== */}
      <g opacity="0.55" stroke={cut} strokeWidth="0.9" fill="none" strokeLinecap="round">
        <path d="M 68 162 L 172 162" />
        <path d="M 50 162 C 54 178 72 194 96 200" />
        <path d="M 190 162 C 186 178 168 194 144 200" />
      </g>

      {/* === Signature runic mark under the plinth (hot gold) ========= */}
      {/* Three dots — the triple-rune motif from KALA V11.3 bindrune.  */}
      <g fill="var(--gold)" opacity={isInlay ? 0 : 0.9}>
        <circle cx="108" cy="226" r="1.2" />
        <circle cx="120" cy="226" r="1.2" />
        <circle cx="132" cy="226" r="1.2" />
      </g>
    </svg>
  );
}
