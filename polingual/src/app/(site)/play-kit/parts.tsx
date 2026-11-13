import { flagFor } from "@/lib/flags";
import { TIERS } from "./tokens";

export { Avatar } from "@/ui/avatar";
import s from "./kit.module.css";
import { Badge } from "@/ui";

export function Flag({ lang, size = 20 }: { lang: string; size?: number }) {
  return <span className={s.flag} style={{ background: flagFor(lang), width: size * 1.4, height: size }} aria-hidden />;
}

export function TierBadge({ tier, small = false }: { tier: number; small?: boolean }) {
  const t = TIERS[tier - 1];
  return <Badge size={small ? undefined : "lg"} style={{ background: t.color, color: t.ink }}>{t.name}</Badge>;
}

export function Coins({ n }: { n: number }) {
  return <Badge tone="parchment" className={s.coins}><span className={s.coin} aria-hidden />{n.toLocaleString("en-US")}</Badge>;
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
