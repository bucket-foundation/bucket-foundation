import type { CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Art, type ArtName } from "./art";
import { FlagTile } from "./FlagTile";
import { FLAG_STRIPE } from "@/lib/flags";
import s from "./world.module.css";

export type GroundKind = "paper" | "lattice";

export function Ground({ kind = "paper", cut, className, children, style }: { kind?: GroundKind; cut?: boolean; className?: string; children?: ReactNode; style?: CSSProperties }) {
  return <div className={[s[kind], cut && s.cut, className].filter(Boolean).join(" ")} style={style} data-ground={kind}>{children}</div>;
}

export type StickerSpot = { name: ArtName; x: string; y: string; size: number; rotate?: number; shadow?: boolean; side?: "left" | "right"; anchor?: "top" | "bottom" };

export function Sticker({ name, x, y, size, rotate = 0, shadow = true, side = "left", anchor = "top" }: StickerSpot) {
  return (
    <span className={s.sticker} style={{ [side]: x, [anchor]: y, transform: `rotate(${rotate}deg)` }} data-sticker={name}>
      <Art name={name} size={size} shadow={shadow} />
    </span>
  );
}

const BAND = ["lapis", "paper", "vermilion", "lapis", "paper", "lapis", "white", "vermilion", "paper", "ink", "ochre", "white", "malachite", "vermilion", "ochre", "vermilion"] as const;

export function FlagBand({ className, flags }: { className?: string; flags?: boolean }) {
  if (flags) return <div className={[s.band, s.flags, className].filter(Boolean).join(" ")} aria-hidden data-testid="flag-band" style={{ background: FLAG_STRIPE }} />;
  return (
    <div className={[s.band, className].filter(Boolean).join(" ")} aria-hidden data-testid="flag-band">
      {BAND.map((c, i) => <i key={i} style={{ background: `var(--pl-${c})` }} />)}
    </div>
  );
}

export function StreakFlame({ days, caption = "Day streak", onDark, size = 44 }: { days: number | string; caption?: string; onDark?: boolean; size?: number }) {
  return (
    <span className={[s.flame, onDark && s.onDark].filter(Boolean).join(" ")} data-testid="streak-flame">
      <Art name="streak-flame" size={size} />
      <span>
        <b className={s.flameNum}>{days}</b>
        <span className={s.flameCap}>{caption}</span>
      </span>
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      {children}
      {hint ? <span className={s.hint}>{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={[s.input, className].filter(Boolean).join(" ")} {...rest} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={[s.input, className].filter(Boolean).join(" ")} {...rest} />;
}

export function Sheet({ tone, as: Tag = "section", className, children, ...rest }: HTMLAttributes<HTMLElement> & { tone?: "tyrian"; as?: "section" | "div" | "form" }) {
  return <Tag className={[s.sheet, className].filter(Boolean).join(" ")} data-tone={tone} {...rest}>{children}</Tag>;
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className={s.tabs}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value} className={s.tab} onClick={() => onChange(t.id)}>{t.label}</button>
      ))}
    </div>
  );
}

export function Meter({ value, max, label, onDark, ...rest }: { value: number; max: number; label: string; onDark?: boolean } & Record<`data-${string}`, string>) {
  return <progress className={s.meter} value={value} max={max} aria-label={label} data-on={onDark ? "dark" : undefined} {...rest} />;
}

export const HERO_STICKERS: StickerSpot[] = [
  { name: "azulejo", x: "34%", y: "6%", size: 150, rotate: 8 },
  { name: "ticket", x: "18%", y: "40%", size: 160, rotate: 6 },
  { name: "seal", x: "62%", y: "36%", size: 130, rotate: -7 },
  { name: "torn-label", x: "38%", y: "58%", size: 130, rotate: -4 },
  { name: "pebble", x: "84%", y: "88%", size: 56, rotate: 18 },
  { name: "kente", x: "62%", y: "72%", size: 200, rotate: -22 },
  { name: "script-he", x: "78%", y: "14%", size: 60, shadow: false },
  { name: "script-ru", x: "8%", y: "30%", size: 56, shadow: false },
  { name: "script-ko", x: "88%", y: "44%", size: 34, shadow: false },
];

export const BAND_STICKERS: StickerSpot[] = [
  { name: "azulejo", x: "4%", y: "14%", size: 92, rotate: -8 },
  { name: "ticket", x: "30%", y: "50%", size: 112, rotate: 6 },
  { name: "seal", x: "58%", y: "10%", size: 84, rotate: -6 },
  { name: "torn-label", x: "72%", y: "56%", size: 96, rotate: 5 },
  { name: "kente", x: "-6%", y: "72%", size: 120, rotate: -18 },
  { name: "pebble", x: "88%", y: "16%", size: 38, rotate: 16 },
  { name: "script-he", x: "38%", y: "12%", size: 40, shadow: false },
];

export const GUTTER_STICKERS: StickerSpot[] = [
  { name: "seal", x: "3%", y: "14%", size: 96, rotate: -8 },
  { name: "ticket", x: "2%", y: "58%", size: 150, rotate: 6 },
  { name: "azulejo", x: "3%", y: "10%", size: 110, rotate: 9, side: "right" },
  { name: "torn-label", x: "2%", y: "52%", size: 130, rotate: -5, side: "right" },
  { name: "pebble", x: "7%", y: "84%", size: 48, rotate: 12, side: "right" },
];

export const STRIP_STICKERS: StickerSpot[] = [
  { name: "seal", x: "0%", y: "12px", size: 56, rotate: -8 },
  { name: "ticket", x: "20%", y: "20px", size: 96, rotate: 5 },
  { name: "torn-label", x: "2%", y: "16px", size: 88, rotate: -4, side: "right" },
  { name: "pebble", x: "30%", y: "8px", size: 30, rotate: 12, side: "right" },
];

export type StageGround = "cut" | "paper" | "lattice";

export function Stage({ children, ground = "cut", stickers, phoneStickers = BAND_STICKERS, tiles = true, strip = true, testId }: { children: ReactNode; ground?: StageGround; strip?: boolean; stickers?: StickerSpot[]; phoneStickers?: StickerSpot[]; tiles?: boolean; testId?: string }) {
  if (ground !== "cut") {
    const spots = stickers ?? GUTTER_STICKERS;
    return (
      <div className={[s.stage, s.flat, s[ground]].join(" ")} data-testid={testId} data-stage={ground}>
        <div className={s.gutters} aria-hidden>{spots.map((p) => <Sticker key={p.name} {...p} />)}</div>
        {strip ? <div className={s.strip} aria-hidden>{STRIP_STICKERS.map((p) => <Sticker key={p.name} {...p} />)}</div> : null}
        <div className={s.flatBody}>{children}</div>
        <FlagBand className={s.stageBand} />
      </div>
    );
  }
  return (
    <div className={s.stage} data-testid={testId} data-stage="cut">
      <div className={s.stageArt} aria-hidden>
        <Ground kind="lattice" cut className={s.stageWide}>
          <div className={s.only} data-at="wide">{(stickers ?? HERO_STICKERS).map((p) => <Sticker key={p.name} {...p} />)}</div>
          {tiles ? (
            <ul className={s.tiles}>
              <FlagTile lang="es" code="ES" label="Spanish" word="cien" reading="/θjen/" index={0} />
              <FlagTile lang="de" code="DE" label="German" word="hundert" reading="/ˈhʊndɐt/" index={1} />
            </ul>
          ) : null}
          <div className={s.only} data-at="narrow">{phoneStickers.map((p) => <Sticker key={p.name} {...p} />)}</div>
        </Ground>
      </div>
      <div className={s.stageBody}>{children}</div>
      <FlagBand className={s.stageBand} />
    </div>
  );
}

export const BANNER_STICKERS: StickerSpot[] = [
  { name: "azulejo", x: "30%", y: "8%", size: 96, rotate: 8 },
  { name: "seal", x: "8%", y: "16%", size: 78, rotate: -9, side: "right" },
  { name: "torn-label", x: "26%", y: "56%", size: 112, rotate: -5 },
  { name: "kente", x: "2%", y: "70%", size: 120, rotate: -12, side: "right" },
  { name: "script-ko", x: "60%", y: "44%", size: 30, shadow: false },
];

export function Banner({ children, stickers = BANNER_STICKERS, testId }: { children: ReactNode; stickers?: StickerSpot[]; testId?: string }) {
  return (
    <header className={s.banner} data-testid={testId}>
      <Ground kind="lattice" className={s.bannerArt}>
        <div className={s.only} data-at="wide">{stickers.map((p) => <Sticker key={p.name} {...p} />)}</div>
        <div className={s.only} data-at="narrow">{STRIP_STICKERS.map((p) => <Sticker key={p.name} {...p} />)}</div>
      </Ground>
      <div className={s.bannerBody}>{children}</div>
    </header>
  );
}
