import { flagFor } from "@/lib/flags";
import { capPx, glyphWidth, longestToken } from "@/lib/tile-fit";
import styles from "./site.module.css";

export type TileProps = { lang: string; code: string; label: string; word: string; reading?: string; rtl?: boolean; play?: React.ReactNode };

export function Tile({ lang, code, label, word, reading, rtl, play }: TileProps) {
  const fit = { "--n": longestToken(word), "--k": glyphWidth(word), "--cap": capPx(word) + "px" } as React.CSSProperties;
  return (
    <li className={styles.tile} style={{ background: flagFor(lang) }}>
      <span className={styles.cc}>{code}</span>
      <b className={styles.word} style={fit} lang={lang} dir={rtl ? "rtl" : undefined}>
        {word}
      </b>
      {reading ? <i className={styles.reading} dir="ltr">{reading}</i> : null}
      <span className={styles.label}>{label}</span>
      {play}
    </li>
  );
}

export function Tiles({ children }: { children: React.ReactNode }) {
  return <ul className={styles.tiles}>{children}</ul>;
}
