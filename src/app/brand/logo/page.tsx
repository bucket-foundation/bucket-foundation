import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logo candidates",
  robots: { index: false },
};

const C = {
  aegean: "#2E6B6B",
  aegeanDark: "#123838",
  gold: "#D9A43A",
  goldDeep: "#B8861E",
  basalt: "#1F1C16",
  bone: "#EFE8D4",
};

type Tone = { body: string; accent: string; bg: string };

const onBone: Tone = { body: C.aegeanDark, accent: C.goldDeep, bg: C.bone };
const onBasalt: Tone = { body: C.bone, accent: C.gold, bg: C.basalt };
const onTile: Tone = { body: C.bone, accent: C.gold, bg: C.aegean };

type Mark = (t: Tone) => React.ReactNode;

const handle = (t: Tone, w = 5) => (
  <path d="M14 22 C14 4 50 4 50 22" fill="none" stroke={t.body} strokeWidth={w} strokeLinecap="round" />
);

const MARKS: { id: string; name: string; idea: string; draw: Mark }[] = [
  {
    id: "bricks",
    name: "Brick bucket",
    idea: "An inverted pyramid of bricks makes the vessel. Each row builds on the one below; the gold top row is the newest work. Build the past.",
    draw: (t) => (
      <>
        {handle(t, 4)}
        <rect x="8" y="22" width="48" height="8" rx="1.5" fill={t.accent} />
        {[0, 1, 2, 3].map((i) => (
          <rect key={`a${i}`} x={12 + i * 10} y="32" width="8.5" height="8" rx="1.5" fill={t.body} />
        ))}
        {[0, 1, 2].map((i) => (
          <rect key={`b${i}`} x={17 + i * 10} y="42" width="8.5" height="8" rx="1.5" fill={t.body} />
        ))}
        {[0, 1].map((i) => (
          <rect key={`c${i}`} x={22 + i * 10} y="52" width="8.5" height="8" rx="1.5" fill={t.body} />
        ))}
      </>
    ),
  },
  {
    id: "b",
    name: "b vessel",
    idea: "A lowercase b whose bowl is a bucket. Reads as the letter at 16px and as the object at 512px. Gold rim marks the brim.",
    draw: (t) => (
      <>
        <rect x="10" y="4" width="9" height="56" rx="2" fill={t.body} />
        <path d="M19 26 H54 L49 60 H19 Z" fill={t.body} />
        <rect x="19" y="22" width="37" height="6" rx="2" fill={t.accent} />
        <path d="M27 36 H45 L42.5 52 H27 Z" fill={t.bg} />
      </>
    ),
  },
  {
    id: "omega",
    name: "Grid omega",
    idea: "The inverted omega from round two, rebuilt on an 8px grid. The flanges are the handle ends; the gold bar is the foundation line the canon sits on.",
    draw: (t) => (
      <>
        <path
          d="M6 14 H20 V32 A12 12 0 0 0 44 32 V14 H58"
          fill="none"
          stroke={t.body}
          strokeWidth="7"
          strokeLinejoin="miter"
          transform="translate(0 4)"
        />
        <rect x="14" y="54" width="36" height="6" fill={t.accent} />
      </>
    ),
  },
  {
    id: "wedge",
    name: "Cut bucket",
    idea: "A solid bucket with one diagonal cut, like a metal tool through a globe. The gold shard is primary research, paid for once.",
    draw: (t) => (
      <>
        {handle(t)}
        <polygon points="11,22 53,22 15.2,44" fill={t.accent} />
        <polygon points="17,46 53,24.5 46.6,60 19,60" fill={t.body} />
      </>
    ),
  },
  {
    id: "strata",
    name: "Strata",
    idea: "The bucket as stacked foundation layers: math at the base, everything else on top. Gold surface layer, the rest in ink.",
    draw: (t) => (
      <>
        {handle(t, 4)}
        <path d="M10 22 H54 L52.6 31 H11.4 Z" fill={t.accent} />
        <path d="M12 35 H52 L50.4 45 H13.6 Z" fill={t.body} />
        <path d="M14.2 49 H49.8 L48.2 60 H15.8 Z" fill={t.body} />
      </>
    ),
  },
];

function Svg({ draw, tone, size, pad = 0 }: { draw: Mark; tone: Tone; size: number; pad?: number }) {
  const v = 64 + pad * 2;
  return (
    <svg width={size} height={size} viewBox={`${-pad} ${-pad} ${v} ${v}`} aria-hidden>
      {draw(tone)}
    </svg>
  );
}

function Tile({ draw, size }: { draw: Mark; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 35%, ${C.aegean}, ${C.aegeanDark})`,
        borderRadius: size * 0.225,
        display: "grid",
        placeItems: "center",
      }}
    >
      <Svg draw={draw} tone={onTile} size={size * 0.64} />
    </div>
  );
}

function Lockup({ draw, tone }: { draw: Mark; tone: Tone }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: tone.bg, padding: "18px 24px", borderRadius: 12 }}>
      <Svg draw={draw} tone={tone} size={52} />
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 40, letterSpacing: "-0.02em", color: tone.body }}>
          bucket
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.28em", color: tone.accent, marginTop: 6 }}>
          FOUNDATION
        </div>
      </div>
    </div>
  );
}

export default function LogoCandidates() {
  return (
    <main style={{ background: C.bone, color: C.basalt, minHeight: "100vh", padding: "48px 16px" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 44, margin: 0 }}>Logo candidates</h1>
        <p style={{ maxWidth: 640, color: C.aegeanDark }}>
          Five marks in the live site palette: aegean, gold, basalt and bone. Each row shows the mark on light and dark,
          the app icon from 180px down to 16px, and the wordmark lockup. Pick one and it replaces the favicon, app icon
          and header mark.
        </p>
        {MARKS.map((m, i) => (
          <section key={m.id} id={m.id} style={{ borderTop: `1px solid ${C.goldDeep}55`, padding: "36px 0" }}>
            <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 28, margin: "0 0 4px" }}>
              {i + 1}. {m.name}
            </h2>
            <p style={{ maxWidth: 640, margin: "0 0 24px", color: C.aegeanDark }}>{m.idea}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
              <div style={{ background: C.bone, border: `1px solid ${C.goldDeep}33`, borderRadius: 16, padding: 16 }}>
                <Svg draw={m.draw} tone={onBone} size={160} />
              </div>
              <div style={{ background: C.basalt, borderRadius: 16, padding: 16 }}>
                <Svg draw={m.draw} tone={onBasalt} size={160} />
              </div>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
                {[180, 64, 32, 16].map((s) => (
                  <Tile key={s} draw={m.draw} size={s} />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 20 }}>
              <Lockup draw={m.draw} tone={onBone} />
              <Lockup draw={m.draw} tone={onBasalt} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
