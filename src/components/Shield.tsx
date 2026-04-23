import React from "react";

/**
 * Bucket Foundation — shield mark.
 * KALA-adjacent: chevron shoulders, vertical spine, a single canonical letter.
 * Single-path SVG so it scales cleanly and embeds in favicons / OG cards.
 */
export default function Shield({
  size = 56,
  className = "",
  title = "bucket foundation",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {/* Outer shield */}
      <path
        d="M32 2 L58 10 L58 30 C58 46 46 57 32 62 C18 57 6 46 6 30 L6 10 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      {/* Inner rule */}
      <path
        d="M32 8 L52 14 L52 30 C52 43 43 52 32 56 C21 52 12 43 12 30 L12 14 Z"
        stroke="currentColor"
        strokeWidth="0.6"
        fill="none"
        opacity="0.45"
      />
      {/* Central 'b' — the bucket mark. Drawn geometrically so it reads at 16px. */}
      <g stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="24" y1="18" x2="24" y2="46" />
        <path d="M24 34 Q24 26 32 26 Q40 26 40 34 Q40 42 32 42 Q24 42 24 36" />
      </g>
    </svg>
  );
}
