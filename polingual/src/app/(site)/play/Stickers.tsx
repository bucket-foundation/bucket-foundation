"use client";

import { Art, type ArtName } from "@/ui/art";
import styles from "./play.module.css";

type Spot = { name: ArtName; size: number; left?: string; right?: string; top: string; rotate: number; wide?: boolean };

const MARGIN: Spot[] = [
  { name: "ticket", size: 150, left: "1.5%", top: "120px", rotate: -8, wide: true },
  { name: "azulejo", size: 120, right: "2%", top: "90px", rotate: 12, wide: true },
  { name: "seal", size: 96, left: "3%", top: "420px", rotate: -7, wide: true },
  { name: "kente", size: 180, right: "0", top: "380px", rotate: -18, wide: true },
  { name: "torn-label", size: 150, left: "0", top: "680px", rotate: -4, wide: true },
  { name: "pebble", size: 90, right: "4%", top: "640px", rotate: 25, wide: true },
  { name: "star", size: 100, left: "4%", top: "940px", rotate: 10, wide: true },
  { name: "bunting", size: 190, right: "1%", top: "900px", rotate: 6, wide: true },
  { name: "script-ko", size: 70, left: "8%", top: "300px", rotate: -24 },
  { name: "script-ru", size: 70, right: "8%", top: "260px", rotate: 18 },
];

export function StageStickers() {
  return (
    <div className={styles.stickers} aria-hidden="true">
      {MARGIN.map((s) => (
        <span key={s.name} className={s.wide ? `${styles.sticker} ${styles.stickerWide}` : styles.sticker} style={{ left: s.left, right: s.right, top: s.top, rotate: `${s.rotate}deg` }}>
          <Art name={s.name} size={s.size} shadow={s.name !== "script-ko" && s.name !== "script-ru"} />
        </span>
      ))}
    </div>
  );
}

export function SheetPeek() {
  return (
    <div className={styles.peek} aria-hidden="true">
      <span className={styles.peekSeal}><Art name="seal" size={54} shadow /></span>
      <span className={styles.peekFlame}><Art name="streak-flame" size={40} /></span>
    </div>
  );
}
