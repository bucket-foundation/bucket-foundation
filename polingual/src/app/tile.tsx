import { flagFor } from "@/lib/flags";
import { fitVars } from "@/lib/tile-fit";
import styles from "./site.module.css";

export type TileProps = { lang: string; code: string; label: string; word: string; reading?: string; rtl?: boolean; play?: React.ReactNode; index?: number };

export type TileFaceProps = Omit<TileProps, "code" | "label"> & {
  code?: string;
  label?: string;
  plain?: boolean;
  as?: "li" | "div" | "button";
  className?: string;
  style?: React.CSSProperties;
  attrs?: Omit<React.AllHTMLAttributes<HTMLElement>, "type"> & Record<`data-${string}`, unknown>;
};

const SPEAKER = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M3 9v6h4l5 4V5L7 9H3z" />
    <path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PLAIN_FACE = "linear-gradient(135deg,#F6EEDC 0 50%,#E3D6B8 0)";

export function TileFace({ lang, code, label, word, reading, rtl, play, index = 0, plain = false, as: Tag = "li", className, style, attrs }: TileFaceProps) {
  const fit = fitVars(word, reading) as React.CSSProperties;
  return (
    <Tag {...attrs} {...(Tag === "button" ? { type: "button" as const } : {})} className={className ? `${styles.tile} ${className}` : styles.tile} style={{ background: plain ? PLAIN_FACE : flagFor(lang), "--i": Math.min(index, 11), ...style } as React.CSSProperties}>
      {code ? <span className={styles.cc}>{code}</span> : null}
      <span className={styles.wd}>
        <b className={styles.word} style={fit} lang={lang || undefined} dir={rtl ? "rtl" : undefined}>
          {word}
        </b>
        {play ? <span className={styles.snd}>{SPEAKER}</span> : null}
      </span>
      {reading ? <i className={styles.reading} dir="ltr">{reading}</i> : null}
      {label ? <span className={styles.label}>{label}</span> : null}
      {play}
    </Tag>
  );
}

export function Tile(props: TileProps) {
  return <TileFace {...props} />;
}

export function Tiles({ children }: { children: React.ReactNode }) {
  return <ul className={styles.tiles}>{children}</ul>;
}
