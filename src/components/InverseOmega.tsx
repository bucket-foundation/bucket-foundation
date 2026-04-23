// Inverse Omega — bucket.foundation primary logomark.
//
// Design thesis:
//   Omega (Ω) is the last letter. Inverted, it becomes a vessel —
//   a cup holding what came before. "Build the past." The legs
//   splay outward at the top like columns; the arch catches
//   them at the base like a foundation stone. A single gilt dot
//   sits inside the cup: the citation token.
//
// Implementation:
//   Heavy-weight stroke glyph, gold fill option, subtle inner
//   highlight so it reads at 16px (favicon) through 320px (hero).

type Props = {
  size?: number;
  className?: string;
  /** "line" for hollow strokes, "solid" for filled wordmark use */
  variant?: "line" | "solid";
  /** color token: "gold" | "fog" | "teal" | "currentColor" */
  tone?: "gold" | "fog" | "teal" | "currentColor";
  title?: string;
};

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  gold: "var(--gold)",
  fog: "var(--morning-fog)",
  teal: "var(--teal)",
  currentColor: "currentColor",
};

export default function InverseOmega({
  size = 80,
  className = "",
  variant = "line",
  tone = "gold",
  title = "bucket foundation — inverse omega",
}: Props) {
  const c = TONE[tone];
  const gid = `ioG-${size}-${tone}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>

      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.95" />
          <stop offset="1" stopColor={c} stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`${gid}-dot`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={c} stopOpacity="1" />
          <stop offset="1" stopColor={c} stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {variant === "solid" ? (
        // Filled inverse-omega: two flared legs + arched cup, cut out interior.
        <path
          fill={`url(#${gid})`}
          d="
            M 22 22
            L 44 22
            L 44 30
            L 40 30
            C 38 38  36 46  34 58
            C 33 66  34 74  40 80
            C 44 84  50 86  60 86
            C 70 86  76 84  80 80
            C 86 74  87 66  86 58
            C 84 46  82 38  80 30
            L 76 30
            L 76 22
            L 98 22
            L 98 30
            L 93 30
            C 96 42  100 56  100 70
            C 100 86  90 100  78 102
            L 78 108
            L 58 108
            L 58 104
            C 52 104  46 100  42 96
            C 38 92  36 86  36 80
            L 28 80
            L 28 72
            L 36 72
            C 36 60  34 44  31 30
            L 22 30
            Z"
        />
      ) : (
        <>
          {/* Foundation baseline */}
          <line
            x1="16"
            y1="26"
            x2="104"
            y2="26"
            stroke={c}
            strokeWidth="2.2"
            strokeLinecap="square"
            opacity="0.55"
          />

          {/* Left leg of inverse omega — flares up and outward */}
          <path
            d="M30 26 L30 34 C30 46 32 58 38 70"
            stroke={`url(#${gid})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Right leg */}
          <path
            d="M90 26 L90 34 C90 46 88 58 82 70"
            stroke={`url(#${gid})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* The cup — catches both legs. This is the bucket. */}
          <path
            d="M38 70 C44 82 56 86 60 86 C64 86 76 82 82 70"
            stroke={`url(#${gid})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Citation-token dot sitting inside the cup */}
          <circle cx="60" cy="94" r="3.2" fill={`url(#${gid}-dot)`} />

          {/* Left flare tick */}
          <line
            x1="22"
            y1="26"
            x2="22"
            y2="32"
            stroke={c}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Right flare tick */}
          <line
            x1="98"
            y1="26"
            x2="98"
            y2="32"
            stroke={c}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
