import { useId, type ReactNode } from "react";
import { DEFAULT_LOOK, INK, PIGMENTS, SKINS, accentFor, lookFromSeed, normalizeLook, onPigment, type Layer, type Look } from "./look";
import s from "./avatar.module.css";

export const AVATAR_SIZES = { chip: 24, xs: 32, sm: 44, md: 64, lg: 96, xl: 140, hero: 220 } as const;
export type AvatarSize = keyof typeof AVATAR_SIZES | number;

export type AvatarProps = {
  look?: Partial<Record<Layer, unknown>> | null;
  seed?: string;
  size?: AvatarSize;
  variant?: "full" | "head";
  bounce?: boolean;
  label?: string;
  className?: string;
};

const W = 3;
const PARCH = PIGMENTS.parchment;
const ink = { stroke: INK, strokeWidth: W, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const thin = { ...ink, strokeWidth: 2.2 };
const HEAD = { cx: 60, cy: 56, r: 32 };

type Geo = { cx: number; cy: number; r: number };
const GEO: Record<"full" | "head", Geo> = { full: { cx: 60, cy: 68, r: 52 }, head: { cx: 60, cy: 54, r: 48 } };
const VIEW: Record<"full" | "head", string> = { full: "0 0 120 140", head: "2 -8 116 116" };

const SHAPES: Record<Look["shape"], { d: string; hands: [number, number, number] }> = {
  round: { d: "M24 124 C24 96 38 82 60 82 C82 82 96 96 96 124 Z", hands: [26, 94, 112] },
  tall: { d: "M34 124 L36 94 C37 84 46 80 60 80 C74 80 83 84 84 94 L86 124 Z", hands: [35, 85, 110] },
  bell: { d: "M18 124 C28 120 32 102 38 90 C42 83 50 80 60 80 C70 80 78 83 82 90 C88 102 92 120 102 124 Z", hands: [31, 89, 108] },
  block: { d: "M26 124 L26 94 Q26 82 38 82 L82 82 Q94 82 94 94 L94 124 Z", hands: [26, 94, 110] },
};

function px(size: AvatarSize): number {
  const n = typeof size === "number" ? size : AVATAR_SIZES[size];
  return Math.max(16, Math.min(320, n));
}

function star(cx: number, cy: number, r: number, inner = 0.45): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

function leaves(g: Geo, from: number, to: number, n: number, fill: string, size = 5): ReactNode {
  return Array.from({ length: n }, (_, i) => {
    const deg = from + ((to - from) * i) / (n - 1);
    const a = (deg * Math.PI) / 180;
    const x = g.cx + g.r * Math.cos(a);
    const y = g.cy + g.r * Math.sin(a);
    return <ellipse key={i} cx={x} cy={y} rx={size} ry={size * 0.5} transform={`rotate(${deg + 90} ${x} ${y})`} fill={fill} {...thin} />;
  });
}

function Backdrop({ look, g }: { look: Look; g: Geo }) {
  if (look.backdrop === "none") return null;
  return <circle cx={g.cx} cy={g.cy} r={g.r} fill={PIGMENTS[look.backdrop]} {...ink} />;
}

function Plinth({ look }: { look: Look }) {
  const c = PIGMENTS[look.plinth];
  const side = "M16 124 V131 A44 9 0 0 0 104 131 V124";
  return (
    <g data-layer="plinth">
      <path d={side} fill={c} />
      <path d={side} fill={INK} opacity=".28" />
      <path d={side} fill="none" {...ink} />
      <ellipse cx="60" cy="124" rx="44" ry="9" fill={c} {...ink} />
    </g>
  );
}

function Outfit({ look, clip, back }: { look: Look; clip: string; back?: boolean }) {
  const accent = PIGMENTS[accentFor(look.color)];
  const o = look.outfit;
  if (back) {
    if (o !== "cape") return null;
    const cape = look.color === "tyrian" ? PIGMENTS.vermilion : PIGMENTS.tyrian;
    return <path data-layer="outfit-back" d="M24 86 Q60 74 96 86 L110 124 L10 124 Z" fill={cape} {...ink} />;
  }
  if (o === "none") return null;
  if (o === "cape") return <g data-layer="outfit"><circle cx="44" cy="88" r="3.5" fill={PIGMENTS.ochre} {...thin} /><circle cx="76" cy="88" r="3.5" fill={PIGMENTS.ochre} {...thin} /><path d="M47 88 Q60 93 73 88" fill="none" stroke={PIGMENTS.ochre} strokeWidth="2.5" /></g>;
  if (o === "scarf") return (
    <g data-layer="outfit">
      <path d="M68 92 L78 118 L67 120 L62 96 Z" fill={accent} {...thin} />
      <path d="M36 84 Q60 100 84 84 L86 92 Q60 110 34 92 Z" fill={accent} {...thin} />
      <path d="M70 108 L75 107 M68 113 L76 112" stroke={INK} strokeWidth="1.6" />
    </g>
  );
  if (o === "bowtie") {
    const c = look.color === "vermilion" ? PIGMENTS.ochre : PIGMENTS.vermilion;
    return <g data-layer="outfit"><path d="M60 90 L47 83 L47 97 Z M60 90 L73 83 L73 97 Z" fill={c} {...thin} /><circle cx="60" cy="90" r="4" fill={c} {...thin} /></g>;
  }
  const lines = onPigment(look.color) === INK ? PIGMENTS.lapis : PARCH;
  return (
    <g data-layer="outfit" clipPath={`url(#${clip})`}>
      {o === "stripe" && [96, 107, 118].map((y) => <rect key={y} x="0" y={y} width="120" height="5" fill={lines} />)}
      {o === "sash" && <><path d="M26 82 L42 80 L100 126 L80 126 Z" fill={accent} {...thin} /><circle cx="58" cy="102" r="4" fill={PIGMENTS.vermilion === accent ? PIGMENTS.ochre : PIGMENTS.vermilion} {...thin} /></>}
      {o === "vest" && <><path d="M0 76 L48 82 L58 126 H0 Z M120 76 L72 82 L62 126 H120 Z" fill={look.color === "tyrian" ? PIGMENTS.malachite : PIGMENTS.tyrian} {...thin} /><circle cx="53" cy="104" r="2.2" fill={PIGMENTS.ochre} /><circle cx="54.5" cy="114" r="2.2" fill={PIGMENTS.ochre} /></>}
    </g>
  );
}

function Eye({ x, kind }: { x: number; kind: "dot" | "happy" | "closed" | "wide" | "star" | "proud" | "shy" }) {
  const y = 55;
  if (kind === "happy") return <path d={`M${x - 5} ${y + 1} Q${x} ${y - 6} ${x + 5} ${y + 1}`} fill="none" {...ink} />;
  if (kind === "closed") return <path d={`M${x - 5} ${y} Q${x} ${y + 4.5} ${x + 5} ${y}`} fill="none" {...ink} />;
  if (kind === "star") return <path d={star(x, y, 6.5)} fill={PIGMENTS.ochre} {...thin} />;
  if (kind === "proud") return <path d={`M${x - 5} ${y - 1} A5 5 0 0 0 ${x + 5} ${y - 1} Z`} fill={INK} {...thin} />;
  if (kind === "wide") return <g><circle cx={x} cy={y} r="6.5" fill="#FFFFFF" {...thin} /><circle cx={x} cy={y + 0.5} r="3.6" fill={INK} /><circle cx={x + 1.4} cy={y - 1} r="1.3" fill="#FFFFFF" /></g>;
  const dx = kind === "shy" ? 1.5 : 0;
  const dy = kind === "shy" ? 1.5 : 0;
  return <g><circle cx={x + dx} cy={y + dy} r={kind === "shy" ? 3.8 : 4.6} fill={INK} /><circle cx={x + dx + 1.6} cy={y + dy - 1.6} r="1.5" fill="#FFFFFF" /></g>;
}

const MOUTH_DARK = PIGMENTS.tyrian;

function Face({ look }: { look: Look }) {
  const f = look.face;
  const eyes: Record<Look["face"], [Parameters<typeof Eye>[0]["kind"], Parameters<typeof Eye>[0]["kind"]]> = {
    smile: ["dot", "dot"], grin: ["happy", "happy"], wow: ["wide", "wide"], wink: ["dot", "happy"],
    shy: ["shy", "shy"], proud: ["proud", "proud"], sleepy: ["closed", "closed"], starry: ["star", "star"],
  };
  const [l, r] = eyes[f];
  const blush = f === "shy" ? 0.6 : 0.35;
  let mouth: ReactNode;
  if (f === "grin") mouth = <g><path d="M47 66 Q60 67 73 66 Q71 81 60 81 Q49 81 47 66 Z" fill={MOUTH_DARK} {...thin} /><path d="M53 77 Q60 72 67 77 Q63 80.5 60 80.5 Q57 80.5 53 77 Z" fill={PIGMENTS.vermilion} /><path d="M49.5 67.2 H70.5 L70 70 Q60 71.5 50 70 Z" fill="#FFFFFF" /></g>;
  else if (f === "starry") mouth = <g><path d="M48 66 Q60 86 72 66 Q60 69 48 66 Z" fill={MOUTH_DARK} {...thin} /><path d="M54 76 Q60 72 66 76 Q63 79.5 60 79.5 Q57 79.5 54 76 Z" fill={PIGMENTS.vermilion} /></g>;
  else if (f === "wow") mouth = <ellipse cx="60" cy="73" rx="5" ry="6.5" fill={MOUTH_DARK} {...thin} />;
  else if (f === "wink") mouth = <g><path d="M63 71 Q67 79 71 70" fill={PIGMENTS.vermilion} {...thin} /><path d="M49 68 Q60 77 72 67" fill="none" {...ink} /></g>;
  else if (f === "shy") mouth = <path d="M55 71 Q60 74.5 65 71" fill="none" {...ink} />;
  else if (f === "proud") mouth = <path d="M51 71 Q61 76 70 67" fill="none" {...ink} />;
  else if (f === "sleepy") mouth = <ellipse cx="60" cy="72" rx="3.4" ry="2.8" fill={MOUTH_DARK} {...thin} />;
  else mouth = <path d="M50 68 Q60 77 70 68" fill="none" {...ink} />;
  return (
    <g data-layer="face">
      <ellipse cx="40" cy="65" rx="5.5" ry="3.4" fill={PIGMENTS.vermilion} opacity={blush} />
      <ellipse cx="80" cy="65" rx="5.5" ry="3.4" fill={PIGMENTS.vermilion} opacity={blush} />
      {f === "wow" && <path d="M42 44 Q48 40 54 43 M66 43 Q72 40 78 44" fill="none" {...ink} />}
      {f === "proud" && <path d="M42 47 L54 45 M66 45 L78 47" fill="none" {...ink} />}
      <Eye x={48} kind={l} />
      <Eye x={72} kind={r} />
      {mouth}
    </g>
  );
}

function Hat({ look }: { look: Look }) {
  const h = look.hat;
  if (h === "none") return null;
  let body: ReactNode;
  if (h === "beret") body = <><path d="M28 38 Q22 20 50 15 Q86 10 94 30 Q90 37 78 34 Q56 30 28 38 Z" fill={look.color === "tyrian" ? INK : PIGMENTS.tyrian} {...ink} /><path d="M56 14 L58 7" {...ink} /></>;
  else if (h === "cap") body = <><path d="M86 38 Q104 34 112 42 Q100 47 84 45 Z" fill={PIGMENTS.lapis} {...ink} /><path d="M28 42 Q27 14 60 14 Q93 14 92 42 Q60 36 28 42 Z" fill={PIGMENTS.lapis} {...ink} /><circle cx="60" cy="27" r="5" fill={PIGMENTS.maya} {...thin} /><circle cx="60" cy="14" r="2.6" fill={PIGMENTS.lapis} {...thin} /></>;
  else if (h === "beanie") body = <><path d="M27 42 Q25 13 60 13 Q95 13 93 42 Z" fill={PIGMENTS.vermilion} {...ink} /><path d="M40 20 V36 M50 16 V36 M60 15 V36 M70 16 V36 M80 20 V36" stroke={INK} strokeWidth="1.4" opacity=".35" /><rect x="24" y="34" width="72" height="11" rx="5.5" fill={PIGMENTS.vermilion} {...ink} /><circle cx="60" cy="10" r="7" fill={PARCH} {...ink} /></>;
  else if (h === "fez") body = <><path d="M42 28 L46 6 L74 6 L78 28 Q60 32 42 28 Z" fill={PIGMENTS.vermilion} {...ink} /><path d="M60 6 Q72 9 74 22" fill="none" stroke={INK} strokeWidth="2" /><circle cx="74" cy="24" r="3" fill={PIGMENTS.ochre} {...thin} /></>;
  else if (h === "sombrero") body = <><ellipse cx="60" cy="31" rx="54" ry="10" fill={PIGMENTS.ochre} {...ink} /><path d="M40 31 Q41 4 60 4 Q79 4 80 31 Z" fill={PIGMENTS.ochre} {...ink} /><path d="M41 23 Q60 27 79 23 L80 29 Q60 33 40 29 Z" fill={PIGMENTS.vermilion} {...thin} />{[16, 28, 92, 104].map((x) => <circle key={x} cx={x} cy={32} r="2.2" fill={PIGMENTS.tyrian} />)}</>;
  else if (h === "laurel") body = <>{leaves({ ...HEAD, r: 33 }, -175, -105, 6, PIGMENTS.malachite, 6)}{leaves({ ...HEAD, r: 33 }, -75, -5, 6, PIGMENTS.malachite, 6)}<circle cx="60" cy="22" r="3.2" fill={PIGMENTS.ochre} {...thin} /></>;
  else body = <><path d="M31 32 L35 9 L47 21 L60 4 L73 21 L85 9 L89 32 Q60 26 31 32 Z" fill={PIGMENTS.ochre} {...ink} />{[[35, 9], [60, 4], [85, 9]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.8" fill={PIGMENTS.ochre} {...thin} />)}<circle cx="60" cy="22" r="3.6" fill={PIGMENTS.vermilion} {...thin} /><circle cx="44" cy="26" r="2.6" fill={PIGMENTS.lapis} {...thin} /><circle cx="76" cy="26" r="2.6" fill={PIGMENTS.malachite} {...thin} /></>;
  return <g data-layer="hat">{body}</g>;
}

function Accessory({ look, full }: { look: Look; full: boolean }) {
  const a = look.accessory;
  if (a === "none") return null;
  let body: ReactNode = null;
  if (a === "glasses") body = <><path d="M40 55 L28 51 M80 55 L92 51 M56 55 Q60 51 64 55" fill="none" {...ink} /><circle cx="48" cy="55" r="8.5" fill="#FFFFFF" fillOpacity=".25" {...ink} /><circle cx="72" cy="55" r="8.5" fill="#FFFFFF" fillOpacity=".25" {...ink} /></>;
  else if (a === "shades") body = <><path d="M30 51 H90 M56 53 Q60 50 64 53" fill="none" {...ink} /><path d="M36 50 H57 V56 Q57 64 48 64 Q36 64 36 56 Z M63 50 H84 V56 Q84 64 75 64 Q63 64 63 56 Z" fill={INK} {...thin} /><path d="M40 53 L46 53 M67 53 L73 53" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" /></>;
  else if (a === "monocle") body = <><path d="M72 64 Q80 78 74 90" fill="none" stroke={PIGMENTS.ochre} strokeWidth="2.2" /><circle cx="72" cy="55" r="9" fill="#FFFFFF" fillOpacity=".25" stroke={INK} strokeWidth="5" /><circle cx="72" cy="55" r="9" fill="none" stroke={PIGMENTS.ochre} strokeWidth="2.2" /></>;
  else if (a === "headphones") body = <><path d="M27 56 Q26 18 60 18 Q94 18 93 56" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" /><path d="M27 56 Q26 18 60 18 Q94 18 93 56" fill="none" stroke={PIGMENTS.lapis} strokeWidth="3.5" strokeLinecap="round" /><rect x="19" y="46" width="13" height="21" rx="6" fill={PIGMENTS.vermilion} {...ink} /><rect x="88" y="46" width="13" height="21" rx="6" fill={PIGMENTS.vermilion} {...ink} /></>;
  else if (a === "pin") body = full ? <><circle cx="72" cy="96" r="1.8" fill={INK} /><rect x="72" y="94" width="14" height="10" rx="1.5" fill={PARCH} {...thin} /><rect x="72" y="94" width="4.7" height="10" fill={PIGMENTS.malachite} /><rect x="81.3" y="94" width="4.7" height="10" fill={PIGMENTS.vermilion} /><rect x="72" y="94" width="14" height="10" rx="1.5" fill="none" {...thin} /></> : null;
  else if (a === "medal") body = <><path d="M53 84 L60 99 L67 84" fill={PIGMENTS.lapis} {...thin} /><circle cx="60" cy="103" r="7.5" fill={PIGMENTS.ochre} {...thin} /><path d={star(60, 103, 4)} fill={PARCH} /></>;
  return body ? <g data-layer="accessory">{body}</g> : null;
}

function Frame({ look, g }: { look: Look; g: Geo }) {
  const f = look.frame;
  if (f === "none") return null;
  const ring = (c: string, w = 4) => <><circle cx={g.cx} cy={g.cy} r={g.r} fill="none" stroke={INK} strokeWidth={w + 4} /><circle cx={g.cx} cy={g.cy} r={g.r} fill="none" stroke={c} strokeWidth={w} /></>;
  let body: ReactNode;
  if (f === "ring") body = ring(PIGMENTS.ochre);
  else if (f === "sparkle") body = <>{ring(PIGMENTS.maya)}{[[-0.75, -0.75, 7], [0.78, -0.62, 5], [0.8, 0.7, 6], [-0.82, 0.55, 4.5]].map(([x, y, r], i) => <path key={i} d={star(g.cx + x * g.r, g.cy + y * g.r, r, 0.32)} fill={PARCH} {...thin} />)}</>;
  else if (f === "laurel") body = <>{ring(PIGMENTS.ochre, 3)}{leaves(g, 165, 95, 6, PIGMENTS.malachite)}{leaves(g, 15, 85, 6, PIGMENTS.malachite)}</>;
  else if (f === "rays") body = <>{Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const p = (r: number, da = 0) => `${(g.cx + r * Math.cos(a + da)).toFixed(2)} ${(g.cy + r * Math.sin(a + da)).toFixed(2)}`;
    return <path key={i} d={`M${p(g.r + 1, -0.07)} L${p(g.r + 7)} L${p(g.r + 1, 0.07)} Z`} fill={PIGMENTS.ochre} {...thin} />;
  })}{ring(PIGMENTS.vermilion)}</>;
  else body = <>{ring(PIGMENTS.tyrian, 5)}<circle cx={g.cx} cy={g.cy} r={g.r - 4} fill="none" stroke={PIGMENTS.ochre} strokeWidth="1.6" /><path d={star(g.cx, g.cy + g.r, 8)} fill={PIGMENTS.ochre} {...thin} /></>;
  return <g data-layer="frame">{body}</g>;
}

export function Avatar({ look, seed, size = "lg", variant = "full", bounce = false, label, className }: AvatarProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const base = seed ? lookFromSeed(seed) : DEFAULT_LOOK;
  const L = normalizeLook(look ?? null, base);
  const full = variant === "full";
  const g = GEO[variant];
  const w = px(size);
  const h = full ? Math.round(w * (140 / 120)) : w;
  const shape = SHAPES[L.shape];
  const skin = SKINS[L.skin];
  const cls = [s.avatar, bounce ? s.bounce : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <svg viewBox={VIEW[variant]} width={w} height={h} className={cls} {...(label === "" ? { "aria-hidden": true } : { role: "img", "aria-label": label ?? "Avatar" })} data-variant={variant}>
      <defs>
        <filter id={`${id}sh`} x="-20%" y="-20%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feFlood floodColor={INK} />
          <feComposite in2="SourceAlpha" operator="in" />
          <feOffset dx="3" dy="3" result="shadow" />
          <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={`${id}body`}><path d={shape.d} /></clipPath>
        <clipPath id={`${id}bust`}><circle cx={g.cx} cy={g.cy} r={g.r} /><rect x="0" y="-20" width="120" height={g.cy + 20} /></clipPath>
      </defs>
      <g data-layer="backdrop" filter={`url(#${id}sh)`}><Backdrop look={L} g={g} /></g>
      <g filter={`url(#${id}sh)`} clipPath={full ? undefined : `url(#${id}bust)`}>
        {full && <Plinth look={L} />}
        <Outfit look={L} clip={`${id}body`} back />
        <path data-layer="shape" d={shape.d} fill={PIGMENTS[L.color]} {...ink} />
        <g data-layer="skin" fill={skin}>
          <circle cx={shape.hands[0]} cy={shape.hands[2]} r="6" {...ink} />
          <circle cx={shape.hands[1]} cy={shape.hands[2]} r="6" {...ink} />
        </g>
        <Outfit look={L} clip={`${id}body`} />
        <circle data-layer="head" cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={skin} {...ink} />
        <Face look={L} />
        {full && <Hat look={L} />}
        <Accessory look={L} full={full} />
      </g>
      <Frame look={L} g={g} />
      {!full && <g filter={`url(#${id}sh)`}><Hat look={L} /></g>}
    </svg>
  );
}
