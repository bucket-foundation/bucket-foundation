import { flagFor } from "@/lib/flags";
import styles from "./site.module.css";

export type TileProps = { lang: string; code: string; label: string; word: string; reading?: string; rtl?: boolean };

export function Tile({ lang, code, label, word, reading, rtl }: TileProps) {
  const size = [...word].length > 12 ? styles.wordXs : [...word].length > 7 ? styles.wordS : "";
  return (
    <li className={styles.tile} style={{ background: flagFor(lang) }}>
      <span className={styles.cc}>{code}</span>
      <b className={`${styles.word} ${size}`} lang={lang} dir={rtl ? "rtl" : undefined}>
        {word}
      </b>
      {reading ? <i className={styles.reading} dir="ltr">{reading}</i> : null}
      <span className={styles.label}>{label}</span>
    </li>
  );
}

export function Tiles({ children }: { children: React.ReactNode }) {
  return <ul className={styles.tiles}>{children}</ul>;
}
