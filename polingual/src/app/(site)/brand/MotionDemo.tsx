"use client";

import { useState } from "react";
import { Button, tokens } from "@/ui";
import styles from "./brand.module.css";

const DEMOS = [
  { key: "press", ms: tokens.motion.press, title: "Press", use: "Buttons sink onto their lip." },
  { key: "pop", ms: tokens.motion.pop, title: "Pop", use: "Tiles, stickers and badges arrive." },
  { key: "settle", ms: tokens.motion.settle, title: "Settle", use: "Cards land and rank rows slide." },
] as const;

export default function MotionDemo() {
  const [run, setRun] = useState(0);
  return (
    <>
      <div className={styles.motionGrid}>
        {DEMOS.map((d) => (
          <div key={d.key} className={styles.motionCard}>
            <div className={styles.motionStage}>
              <span key={`${d.key}-${run}`} className={styles[`m_${d.key}`]} />
            </div>
            <strong>{d.title} · {d.ms} ms</strong>
            <span>{d.use}</span>
            <code>--pl-motion-{d.key}</code>
          </div>
        ))}
      </div>
      <p className={styles.cap}>Ease {tokens.motion.ease}, token --pl-motion-ease. Reduced motion turns every demo off.</p>
      <Button onClick={() => setRun((r) => r + 1)}>Replay motion</Button>
    </>
  );
}
