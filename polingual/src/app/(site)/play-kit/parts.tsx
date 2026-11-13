import { flagFor } from "@/lib/flags";
import { TIERS, type Look } from "./tokens";
import s from "./kit.module.css";

export function Flag({ lang, size = 20 }: { lang: string; size?: number }) {
  return <span className={s.flag} style={{ background: flagFor(lang), width: size * 1.4, height: size }} aria-hidden />;
}

export function Avatar({ look, size = 96, bounce = false }: { look: Look; size?: number; bounce?: boolean }) {
  return (
    <svg viewBox="0 0 120 140" width={size} height={size * (140 / 120)} className={bounce ? s.bounce : undefined} role="img" aria-label="Avatar">
      <ellipse cx="60" cy="128" rx="44" ry="10" fill={look.plinth} />
      <rect x="22" y="70" width="76" height="58" rx="26" fill={look.body} />
      {look.outfit === "scarf" && <path d="M30 78 Q60 96 90 78 L90 88 Q60 106 30 88 Z" fill="#E9A23B" />}
      {look.outfit === "stripe" && <g fill="#F6EEDC">{[84, 98, 112].map((y) => <rect key={y} x="26" y={y} width="68" height="6" rx="3" />)}</g>}
      {look.outfit === "cape" && <path d="M18 76 L102 76 L110 128 L10 128 Z" fill="#5B1A4A" opacity=".9" />}
      {look.outfit === "cape" && <rect x="22" y="70" width="76" height="58" rx="26" fill={look.body} />}
      <circle cx="60" cy="52" r="34" fill="#F6EEDC" stroke="#231F20" strokeWidth="3" />
      <Face face={look.face} />
      <Hat hat={look.hat} />
    </svg>
  );
}

function Face({ face }: { face: Look["face"] }) {
  const eyes = face === "cool"
    ? <rect x="38" y="42" width="44" height="10" rx="5" fill="#231F20" />
    : <g fill="#231F20"><circle cx="48" cy="48" r={face === "wow" ? 5 : 4} /><circle cx="72" cy="48" r={face === "wow" ? 5 : 4} /></g>;
  const mouth = face === "wow"
    ? <circle cx="60" cy="66" r="6" fill="#231F20" />
    : face === "grin"
      ? <path d="M44 60 Q60 78 76 60 Z" fill="#D9381E" stroke="#231F20" strokeWidth="2.5" />
      : <path d="M46 62 Q60 72 74 62" fill="none" stroke="#231F20" strokeWidth="3" strokeLinecap="round" />;
  return <g>{eyes}{mouth}<circle cx="40" cy="60" r="4" fill="#D9381E" opacity=".25" /><circle cx="80" cy="60" r="4" fill="#D9381E" opacity=".25" /></g>;
}

function Hat({ hat }: { hat: Look["hat"] }) {
  if (hat === "beret") return <g><ellipse cx="56" cy="22" rx="30" ry="11" fill="#231F20" /><circle cx="58" cy="11" r="3" fill="#231F20" /></g>;
  if (hat === "crown") return <path d="M34 26 L40 6 L50 20 L60 2 L70 20 L80 6 L86 26 Z" fill="#E9A23B" stroke="#8E2312" strokeWidth="2" />;
  if (hat === "cap") return <g><path d="M28 30 Q60 -4 92 30 Z" fill="#26428B" /><rect x="76" y="26" width="30" height="7" rx="3.5" fill="#26428B" /></g>;
  if (hat === "sombrero") return <g><ellipse cx="60" cy="26" rx="54" ry="9" fill="#E9A23B" stroke="#8E2312" strokeWidth="2" /><path d="M40 26 Q60 -14 80 26 Z" fill="#E9A23B" stroke="#8E2312" strokeWidth="2" /><rect x="42" y="18" width="36" height="5" fill="#D9381E" /></g>;
  return null;
}

export function TierBadge({ tier, small = false }: { tier: number; small?: boolean }) {
  const t = TIERS[tier - 1];
  return <span className={s.tier} data-small={small} style={{ background: t.color, color: t.ink }}>{t.name}</span>;
}

export function Coins({ n }: { n: number }) {
  return <span className={s.coins}><span className={s.coin} aria-hidden />{n.toLocaleString("en-US")}</span>;
}

export function Shape({ shape, size = 28 }: { shape: string; size?: number }) {
  const p = { fill: "#F6EEDC" };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      {shape === "triangle" && <path d="M12 3 L22 21 L2 21 Z" {...p} />}
      {shape === "diamond" && <path d="M12 2 L22 12 L12 22 L2 12 Z" {...p} />}
      {shape === "circle" && <circle cx="12" cy="12" r="10" {...p} />}
      {shape === "square" && <rect x="3" y="3" width="18" height="18" rx="2" {...p} />}
    </svg>
  );
}
