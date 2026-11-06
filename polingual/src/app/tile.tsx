import { flagFor } from "@/lib/flags";
import { fitVars } from "@/lib/tile-fit";
import styles from "./site.module.css";

export type TileProps = { lang: string; code: string; label: string; word: string; reading?: string; rtl?: boolean; play?: React.ReactNode; index?: number };

const SPEAKER = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M3 9v6h4l5 4V5L7 9H3z" />
    <path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export function Tile({ lang, code, label, word, reading, rtl, play, index = 0 }: TileProps) {
  const fit = fitVars(word, reading) as React.CSSProperties;
  return (
    <li className={styles.tile} style={{ background: flagFor(lang), "--i": Math.min(index, 11) } as React.CSSProperties}>
      <span className={styles.cc}>{code}</span>
      <span className={styles.wd}>
        <b className={styles.word} style={fit} lang={lang} dir={rtl ? "rtl" : undefined}>
          {word}
        </b>
        {play ? <span className={styles.snd}>{SPEAKER}</span> : null}
      </span>
      {reading ? <i className={styles.reading} dir="ltr">{reading}</i> : null}
      <span className={styles.label}>{label}</span>
      {play}
    </li>
  );
}

export function Tiles({ children }: { children: React.ReactNode }) {
  return <ul className={styles.tiles}>{children}</ul>;
}
